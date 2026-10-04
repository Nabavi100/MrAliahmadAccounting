/**
 * Render smoke test — runs without a browser.
 *
 *   npm run smoke
 *
 * Verifies that:
 *   1. the application shell renders (license + login screens),
 *   2. the command palette opens and lists its quick actions,
 *   3. every workspace view renders inside the accounting provider,
 *   4. the responsive shell pieces (sidebar drawer, mobile tab bar) are wired up.
 *
 * The project previously had no automated checks at all, so this catches the
 * most common regression: a view that throws on render and blanks the screen.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html dir="rtl"><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/',
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
g.KeyboardEvent = dom.window.KeyboardEvent;
g.MouseEvent = dom.window.MouseEvent;
g.CustomEvent = dom.window.CustomEvent;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.localStorage = dom.window.localStorage;
g.sessionStorage = dom.window.sessionStorage;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.getComputedStyle = dom.window.getComputedStyle;
let viewportIsDesktop = false;
(dom.window as any).matchMedia = (query: string) => ({
  matches: viewportIsDesktop && /min-width:\s*1024px/.test(query),
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});
g.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { renderToString } = await import('react-dom/server');
const { AccountingProvider } = await import('../src/context/AccountingContext');
const { ThemeProvider } = await import('../src/context/ThemeContext');

const consoleErrors: string[] = [];
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
  if (/Not implemented|Could not parse CSS/.test(message)) return;
  consoleErrors.push(message);
};

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log('\n[1/4] Application shell (SSR)');
{
  const App = (await import('../src/App')).default;
  const html = renderToString(React.createElement(App));
  check('shell renders', html.length > 1000, `${html.length} chars`);
  check('login screen is shown', /نام کاربری|رمز عبور/.test(html));
}

console.log('\n[2/4] Command palette / global search');
{
  const { CommandPalette } = await import('../src/components/CommandPalette');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    React.createElement(
      AccountingProvider,
      null,
      React.createElement(ThemeProvider, null,
        React.createElement(CommandPalette as any, {
          isOpen: true,
          onClose: () => {},
          onNavigate: () => {},
          onOpenNewInvoice: () => {},
          onOpenPaymentModal: () => {},
          onOpenTransferModal: () => {},
          onOpenAccessModal: () => {},
          onViewInvoice: () => {},
          onShowShortcuts: () => {},
        })
      )
    )
  );
  await wait(700);
  const html = host.innerHTML;
  check('palette renders', html.length > 5000, `${html.length} chars`);
  check('search box present', /جستجوی صفحه، مشتری/.test(html));
  check('quick actions listed', /صدور فاکتور فروش جدید/.test(html));
  check('navigation pages listed', /داشبورد مدیریتی/.test(html));
  root.unmount();
  host.remove();
}

console.log('\n[3/4] Workspace views');
{
  const views: [string, string][] = [
    ['DashboardView', 'DashboardView'],
    ['ComprehensiveJournalView', 'ComprehensiveJournalView'],
    ['TransactionsLedgerView', 'TransactionsLedgerView'],
    ['TradeOperationsHubView', 'TradeOperationsHubView'],
    ['ReceiptPaymentHubView', 'ReceiptPaymentHubView'],
    ['InitialDefinitionsView', 'InitialDefinitionsView'],
    ['WarehousesView', 'WarehousesView'],
    ['CashAndExchangeView', 'CashAndExchangeView'],
    ['ProductsView', 'ProductsView'],
    ['CurrenciesView', 'CurrenciesView'],
    ['ExpensesView', 'ExpensesView'],
    ['IncomesView', 'IncomesView'],
    ['FixedAssetsView', 'FixedAssetsView'],
    ['ShareholdersView', 'ShareholdersView'],
    ['ReportsView', 'ReportsView'],
    ['AuditLogView', 'AuditLogView'],
    ['TelegramManagementView', 'TelegramManagementView'],
  ];

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  for (const [file, name] of views) {
    try {
      const mod: any = await import(`../src/components/${file}`);
      const Component = mod[name] as React.FC;
      if (!Component) {
        check(`${file} exports ${name}`, false, 'missing named export');
        continue;
      }
      root.render(
        React.createElement(
          AccountingProvider,
          null,
          React.createElement(ThemeProvider, null,
            React.createElement(Component, {
              setActiveTab: () => {},
              setSubFilter: () => {},
              onOpenNewInvoice: () => {},
              onOpenPaymentModal: () => {},
              onOpenTransferModal: () => {},
              onViewInvoice: () => {},
              onSelectCashAccount: () => {},
              initialSubTab: 'parties',
              initialSection: 'all',
              initialType: 'sell',
              initialViewMode: 'list',
            } as any)
          )
        )
      );
      await wait(450);
      check(`${file} renders`, host.innerHTML.length > 200, `${host.innerHTML.length} chars`);
    } catch (err: any) {
      check(`${file} renders`, false, err?.message?.split('\n')[0]);
    }
  }
  root.unmount();
  host.remove();
}

console.log('\n[4/4] Responsive shell wiring');
{
  const { Sidebar } = await import('../src/components/Sidebar');
  const { MobileBottomNav } = await import('../src/components/MobileBottomNav');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    React.createElement(
      AccountingProvider,
      null,
      React.createElement(ThemeProvider, null,
        React.createElement('div', null,
          React.createElement(Sidebar as any, { activeTab: 'dashboard', setActiveTab: () => {}, isOpen: false, onClose: () => {} }),
          React.createElement(MobileBottomNav as any, {
            activeTab: 'dashboard',
            onNavigate: () => {},
            onOpenMenu: () => {},
            onOpenQuickActions: () => {},
          })
        )
      )
    )
  );
  await wait(500);

  // --- phone / tablet widths: drawer is off-canvas and hidden from a11y tree ---
  let sidebar = host.querySelector('#app-sidebar-main');
  check('sidebar element exists', !!sidebar);
  check('drawer slides off-canvas while closed', !!sidebar && /translate-x-full/.test(sidebar.className));
  check('closed drawer is inert (not keyboard reachable)', !!sidebar && sidebar.hasAttribute('inert'));
  check('drawer backdrop exists', !!host.querySelector('#app-sidebar-backdrop'));
  const bottomNav = host.querySelector('#app-mobile-bottom-nav');
  check('mobile tab bar exists', !!bottomNav);
  check('mobile tab bar has quick-action button', !!host.querySelector('#mobile-btn-quick-action'));

  // --- desktop widths: sidebar is docked, always visible and interactive ---
  viewportIsDesktop = true;
  root.unmount();
  const desktopHost = document.createElement('div');
  document.body.appendChild(desktopHost);
  const desktopRoot = createRoot(desktopHost);
  desktopRoot.render(
    React.createElement(
      AccountingProvider,
      null,
      React.createElement(ThemeProvider, null,
        React.createElement(Sidebar as any, { activeTab: 'dashboard', setActiveTab: () => {}, isOpen: false, onClose: () => {} })
      )
    )
  );
  await wait(400);
  sidebar = desktopHost.querySelector('#app-sidebar-main');
  check('desktop sidebar stays visible when drawer state is closed', !!sidebar && !sidebar.hasAttribute('inert'));
  check('desktop sidebar docks with lg: class', !!sidebar && /lg:translate-x-0/.test(sidebar.className));
  desktopRoot.unmount();
  desktopHost.remove();
  // Dialogs triggered from the drawer must be rendered OUTSIDE the transformed
  // drawer element, otherwise `position: fixed` would be offset/clipped.
  viewportIsDesktop = false;
  const drawerHost = document.createElement('div');
  document.body.appendChild(drawerHost);
  const drawerRoot = createRoot(drawerHost);
  drawerRoot.render(
    React.createElement(
      AccountingProvider,
      null,
      React.createElement(ThemeProvider, null,
        React.createElement(Sidebar as any, { activeTab: 'dashboard', setActiveTab: () => {}, isOpen: true, onClose: () => {} })
      )
    )
  );
  await wait(500);
  const drawerEl = drawerHost.querySelector('#app-sidebar-main');
  const branchButton = Array.from(drawerHost.querySelectorAll('button')).find(b =>
    /تغییر واحد شرکت/.test(b.textContent || '')
  ) as HTMLButtonElement | undefined;
  check('drawer footer action exists', !!branchButton);
  branchButton?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const modalHeading = Array.from(drawerHost.querySelectorAll('h3')).find(h =>
    /انتخاب واحد/.test(h.textContent || '')
  );
  check('drawer action opens its dialog', !!modalHeading);
  check('dialog is outside the drawer element', !!modalHeading && !drawerEl?.contains(modalHeading));
  drawerRoot.unmount();
  drawerHost.remove();

  root.unmount();
  host.remove();
}

console.log('\n[health] unexpected console errors');
const relevant = consoleErrors.filter(e => !/Warning:|deprecated|An error occurred in the <|error boundary/i.test(e));
check('no uncaught render errors', relevant.length === 0, relevant.slice(0, 2).join(' | '));

console.error = originalError;
console.log(failures === 0 ? '\n✅ All smoke checks passed\n' : `\n❌ ${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
