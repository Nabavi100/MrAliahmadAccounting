/**
 * Server data-API integration test.
 *
 *   npm run test:api            # tests http://localhost:3000
 *   npm run test:api -- http://host:port
 *
 * Verifies the data-persistence endpoints the accounting app depends on:
 * status, read, write, conflict protection (a stale client must never
 * overwrite newer data) and the automatic server backups.
 *
 * Safety: the dataset currently on the server is read first and written back at
 * the end, so running this against a real installation does not destroy data.
 */
const BASE_URL = (process.argv[2] || process.env.APP_TEST_URL || 'http://localhost:3000').replace(/\/$/, '');
// Optional access key for servers running with APP_DATA_KEY set.
const ACCESS_KEY = process.argv[3] || process.env.APP_TEST_KEY || '';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(ACCESS_KEY ? { 'x-app-key': ACCESS_KEY } : {}),
      ...(init?.headers as Record<string, string>),
    },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, body };
};

console.log(`\n[api-test] target: ${BASE_URL}${ACCESS_KEY ? ' (with access key)' : ''}\n`);

// 0. reachability
let status: any;
try {
  const res = await api('/api/app/status');
  status = res.body;
  check('server is reachable', res.status === 200 && !!status?.ok);
} catch (err: any) {
  console.log(`  ✗ cannot reach ${BASE_URL} — is the server running? (${err?.message})`);
  process.exit(1);
}

console.log('\n1) Status endpoint');
check('reports storage path', typeof status.storagePath === 'string' && status.storagePath.includes('appdata'));
check('reports protection flag', typeof status.protected === 'boolean');

console.log('\n2) Read current dataset');
const original = await api('/api/app/data');
check('read endpoint responds', original.status === 200 && original.body?.ok === true, `HTTP ${original.status}`);
const originalData = original.body?.data ?? null;
const originalRevision = original.body?.revision ?? 0;
console.log(`  ℹ existing dataset: ${originalData ? 'yes' : 'none'} (revision ${originalRevision})`);

console.log('\n3) Write + read back');
const marker = { products: [{ id: 'api-test', name: 'TEST' }], warehouses: [{ id: 'w' }], parties: [] };
const write = await api('/api/app/data', {
  method: 'PUT',
  body: JSON.stringify({ data: marker, clientRevision: 0, updatedBy: 'api-test', version: 'test' }),
});
check('write succeeds', write.status === 200 && write.body?.ok === true, write.body?.error);
const writtenRevision = write.body?.revision;

const readBack = await api('/api/app/data');
check('data is persisted', readBack.body?.data?.products?.[0]?.id === 'api-test');

console.log('\n4) Conflict protection');
if (originalData) {
  // Simulate a client that is behind: it sends the old revision.
  const stale = await api('/api/app/data', {
    method: 'PUT',
    body: JSON.stringify({ data: { products: [], warehouses: [] }, clientRevision: originalRevision, updatedBy: 'stale-client', version: 'test' }),
  });
  check('stale write is rejected with 409', stale.status === 409 && stale.body?.conflict === true, `HTTP ${stale.status}`);

  const afterConflict = await api('/api/app/data');
  check('server data was NOT overwritten', afterConflict.body?.data?.products?.[0]?.id === 'api-test');
} else {
  console.log('  ℹ skipped (server had no dataset before this run)');
}

console.log('\n5) Server backups (rotation)');
const backups = await api('/api/app/backups');
check('backup list responds', backups.status === 200 && Array.isArray(backups.body?.backups));

if (originalData) {
  check('a backup exists after writing', (backups.body?.backups?.length || 0) >= 1, `${backups.body?.backups?.length ?? 0} found`);
} else {
  // First run on a fresh server: there was no previous version to preserve.
  const firstCount = backups.body?.backups?.length ?? 0;
  check('first ever write creates no backup (nothing to preserve)', firstCount === 0, `${firstCount} found`);

  // Every following save must rotate the previous version into the backup folder.
  await api('/api/app/data', {
    method: 'PUT',
    body: JSON.stringify({ data: marker, clientRevision: 0, updatedBy: 'api-test', version: 'test' }),
  });
  const rotated = await api('/api/app/backups');
  check(
    'next write rotates a backup automatically',
    (rotated.body?.backups?.length || 0) >= 1,
    `${rotated.body?.backups?.length ?? 0} found`
  );
}

console.log('\n6) Path-traversal guard');
const traversal = await api('/api/app/backups/..%2F..%2Faccounting-data.json');
check('traversal filename rejected', traversal.status === 400 || traversal.status === 404, `HTTP ${traversal.status}`);

console.log('\n7) Restore original dataset');
if (originalData) {
  const restore = await api('/api/app/data', {
    method: 'PUT',
    body: JSON.stringify({ data: originalData, clientRevision: 0, updatedBy: 'api-test-restore', version: 'restore' }),
  });
  check('original dataset restored', restore.status === 200 && restore.body?.ok === true);

  const verify = await api('/api/app/data');
  check('restored data readable', !!verify.body?.data);
} else {
  // Nothing to restore: leave the server clean by writing the empty marker back.
  await api('/api/app/data', {
    method: 'PUT',
    body: JSON.stringify({ data: marker, clientRevision: 0, updatedBy: 'api-test', version: 'test' }),
  });
  console.log('  ℹ server had no dataset before the test; left the test dataset in place');
}

console.log('\n8) Client service round-trip (the code the app actually uses)');
{
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: BASE_URL });
  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  g.localStorage = dom.window.localStorage;
  g.sessionStorage = dom.window.sessionStorage;
  Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });

  // Point the client service at the test server (in a browser it uses the same origin).
  (dom.window as any).__APP_API_BASE__ = BASE_URL;
  const { getAccessKey, loadAppData, listServerBackups } = await import('../src/services/appDataService');

  if (ACCESS_KEY) {
    const meta = dom.window.document.createElement('meta');
    meta.setAttribute('name', 'app-data-key');
    meta.setAttribute('content', ACCESS_KEY);
    dom.window.document.head.appendChild(meta);
    check('access key is picked up from the served HTML', getAccessKey() === ACCESS_KEY);
  }

  const loaded = await loadAppData();
  check('client loads the dataset', loaded.data !== null || loaded.error === undefined, loaded.error);
  check('client surfaces the dataset revision', typeof loaded.meta.revision === 'number');

  const backups = await listServerBackups();
  check('client lists server backups', Array.isArray(backups));

  if (ACCESS_KEY) {
    // Without the key the API must refuse, and the client must report it clearly.
    dom.window.document.head.innerHTML = '';
    dom.window.localStorage.clear();
    const unauthorized = await loadAppData();
    check('missing key is reported as unauthorized', unauthorized.unauthorized === true, String(unauthorized.error));
  }
}

console.log(failures === 0 ? '\n✅ All API checks passed\n' : `\n❌ ${failures} API check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
