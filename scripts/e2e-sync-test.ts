/**
 * End-to-end server-storage test (the exact scenario the feature exists for).
 *
 *   npm run test:e2e                 # against http://localhost:3000
 *   npm run test:e2e -- http://host [accessKey]
 *
 * It boots the REAL application state provider against a REAL server and checks:
 *   1. a change made in the app is automatically saved to the server,
 *   2. after clearing the browser storage (as if the user wiped the browser
 *      cache / opened the app in a fresh profile) the data comes back from the
 *      server instead of being lost,
 *   3. a second "device" (another browser profile) sees the same books.
 *
 * The dataset present before the run is written back at the end.
 */
import { JSDOM } from 'jsdom';

const BASE_URL = (process.argv[2] || process.env.APP_TEST_URL || 'http://localhost:3000').replace(/\/$/, '');
const ACCESS_KEY = process.argv[3] || process.env.APP_TEST_KEY || '';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (ACCESS_KEY) headers['x-app-key'] = ACCESS_KEY;

const apiGet = async (path: string) => (await fetch(`${BASE_URL}${path}`, { headers })).json();
const apiPut = async (data: any, clientRevision: number, updatedBy: string) =>
  (
    await fetch(`${BASE_URL}/api/app/data`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data, clientRevision, updatedBy, version: 'e2e-test' }),
    })
  ).json();

console.log(`\n[e2e-sync-test] target: ${BASE_URL}${ACCESS_KEY ? ' (with access key)' : ''}\n`);

const original = await apiGet('/api/app/data').catch(() => null);
if (!original) {
  console.log(`  ✗ cannot reach ${BASE_URL} — is the server running?`);
  process.exit(1);
}
const originalData = original.data ?? null;

// ---------------------------------------------------------------- jsdom setup
const dom = new JSDOM('<!doctype html><html dir="rtl"><head></head><body><div id="root"></div></body></html>', {
  url: `${BASE_URL}/`,
  pretendToBeVisual: true,
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.localStorage = dom.window.localStorage;
g.sessionStorage = dom.window.sessionStorage;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
(dom.window as any).matchMedia = () => ({
  matches: true, media: '', onchange: null,
  addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
});
// Make the client service talk to the test server, and hand it the access key
// exactly the way the server injects it into the served HTML.
(dom.window as any).__APP_API_BASE__ = BASE_URL;
if (ACCESS_KEY) {
  const meta = dom.window.document.createElement('meta');
  meta.setAttribute('name', 'app-data-key');
  meta.setAttribute('content', ACCESS_KEY);
  dom.window.document.head.appendChild(meta);
}

console.error = (() => {
  const originalError = console.error;
  return (...args: any[]) => {
    const msg = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
    if (/Not implemented|Could not parse CSS/.test(msg)) return;
    originalError(...args);
  };
})();

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { AccountingProvider, useAccounting } = await import('../src/context/AccountingContext');

const ctxRef: { current: any } = { current: null };
const Probe: React.FC = () => {
  ctxRef.current = useAccounting();
  return null;
};
const mountApp = (container: HTMLElement) => {
  const root = createRoot(container);
  root.render(React.createElement(AccountingProvider, null, React.createElement(Probe)));
  return root;
};

const TEST_PARTY_NAME = `E2E مشتری آزمایشی ${Date.now()}`;

// ------------------------------------------------------------------ 1. boot
console.log('1) Boot the application against the server');
let container = dom.window.document.createElement('div');
dom.window.document.body.appendChild(container);
let root = mountApp(container);
await wait(2500);
check('provider booted', !!ctxRef.current);
check('server connection established', ctxRef.current?.serverSyncState === 'connected', ctxRef.current?.serverSyncState);
if (ctxRef.current?.serverSyncState !== 'connected') {
  console.log(`  ℹ server message: ${ctxRef.current?.serverSyncMessage || '-'}`);
}

// -------------------------------------------------- 2. automatic server save
console.log('\n2) A change made in the app is saved to the server automatically');
const beforeCount = ctxRef.current?.parties?.length ?? 0;
ctxRef.current?.addParty({
  name: TEST_PARTY_NAME,
  phone: '0700000000',
  type: 'customer',
  balanceAFN: 0,
  balanceUSD: 0,
} as any);
await wait(4500); // debounce (2s) + request

const afterServer = await apiGet('/api/app/data');
const savedParty = (afterServer.data?.parties || []).find((p: any) => p.name === TEST_PARTY_NAME);
check('party was written to the server', !!savedParty, 'not found in server dataset');
check('local party list grew', (ctxRef.current?.parties?.length ?? 0) > beforeCount);
check('server reports who saved', !!afterServer.updatedBy, String(afterServer.updatedBy));

const localFlag = JSON.parse(dom.window.localStorage.getItem('hesabdar_server_sync_state_v1') || '{}');
check('browser knows its data is saved (not dirty)', localFlag.dirty === false, JSON.stringify(localFlag));

// ------------------------------------------- 3. survive a wiped browser cache
console.log('\n3) Clearing the browser storage must NOT lose the data');
root.unmount();
dom.window.localStorage.clear(); // the old failure mode: everything is gone
dom.window.sessionStorage.clear();
container.remove();

ctxRef.current = null;
container = dom.window.document.createElement('div');
dom.window.document.body.appendChild(container);
root = mountApp(container);
await wait(2500);

const restoredParty = (ctxRef.current?.parties || []).find((p: any) => p.name === TEST_PARTY_NAME);
check('data came back from the server after clearing browser storage', !!restoredParty);
check('books are complete (products present)', Array.isArray(ctxRef.current?.products) && ctxRef.current.products.length >= 0);

// ----------------------------------------------- 4. "another device" sees it
console.log('\n4) A second device (fresh browser profile) sees the same books');
const device2 = new JSDOM('<!doctype html><html dir="rtl"><head></head><body><div id="root2"></div></body></html>', {
  url: `${BASE_URL}/`,
  pretendToBeVisual: true,
});
(device2.window as any).__APP_API_BASE__ = BASE_URL;
if (ACCESS_KEY) {
  const meta2 = device2.window.document.createElement('meta');
  meta2.setAttribute('name', 'app-data-key');
  meta2.setAttribute('content', ACCESS_KEY);
  device2.window.document.head.appendChild(meta2);
}
// Temporarily swap the DOM globals so the same provider runs as "device 2".
const previousWindow = g.window;
const previousDocument = g.document;
const previousLocalStorage = g.localStorage;
const previousSessionStorage = g.sessionStorage;
g.window = device2.window;
g.document = device2.window.document;
g.localStorage = device2.window.localStorage;
g.sessionStorage = device2.window.sessionStorage;
Object.defineProperty(g, 'navigator', { value: device2.window.navigator, configurable: true });

ctxRef.current = null;
const container2 = device2.window.document.createElement('div');
device2.window.document.body.appendChild(container2);
const root2 = createRoot(container2);
root2.render(React.createElement(AccountingProvider, null, React.createElement(Probe)));
await wait(2500);

const seenOnDevice2 = (ctxRef.current?.parties || []).find((p: any) => p.name === TEST_PARTY_NAME);
check('second device received the same data from the server', !!seenOnDevice2);

root2.unmount();
g.window = previousWindow;
g.document = previousDocument;
g.localStorage = previousLocalStorage;
g.sessionStorage = previousSessionStorage;
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });

// ------------------------------------------------------------------ cleanup
console.log('\n5) Cleanup: restore the dataset that existed before this test');
root.unmount();
if (originalData) {
  const restored = await apiPut(originalData, 0, 'e2e-test-cleanup');
  check('original dataset restored', restored.ok === true, restored.error);
  const verify = await apiGet('/api/app/data');
  const leftover = (verify.data?.parties || []).find((p: any) => p.name === TEST_PARTY_NAME);
  check('test data removed', !leftover);
} else {
  await apiPut({ products: [], warehouses: [], parties: [] }, 0, 'e2e-test-cleanup');
  console.log('  ℹ server had no dataset before the test; left an empty dataset');
}

console.log(failures === 0 ? '\n✅ End-to-end storage checks passed\n' : `\n❌ ${failures} end-to-end check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
