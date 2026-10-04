import { useEffect, useRef } from 'react';
import { NavTab } from '../components/Sidebar';

export interface GlobalShortcutHandlers {
  onTogglePalette: () => void;
  onToggleSidebar: () => void;
  onNavigate: (tab: NavTab) => void;
  onNewSale: () => void;
  onNewPurchase: () => void;
  onNewReceipt: () => void;
  onNewPayment: () => void;
  onTransfer: () => void;
  onManageUsers: () => void;
  onShowHelp: () => void;
}

/** Physical-key map — layout independent, so it also works on Persian keyboards. */
const NAV_CODES: Record<string, NavTab> = {
  Digit1: 'dashboard',
  Digit2: 'journal',
  Digit3: 'trade_hub',
  Digit4: 'receipt_payment_hub',
  Digit5: 'customers',
  Digit6: 'warehouses',
  Digit7: 'cash',
  Digit8: 'reports',
  Digit9: 'definitions',
  Numpad1: 'dashboard',
  Numpad2: 'journal',
  Numpad3: 'trade_hub',
  Numpad4: 'receipt_payment_hub',
  Numpad5: 'customers',
  Numpad6: 'warehouses',
  Numpad7: 'cash',
  Numpad8: 'reports',
  Numpad9: 'definitions',
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable === true
  );
};

/**
 * Registers the application-wide keyboard shortcuts.
 *
 * Shortcut groups:
 *  - Always available: Ctrl/⌘+K (command palette), Ctrl/⌘+B (sidebar), Alt+H (help)
 *  - Only while not typing in a form field: Alt+1..9 navigation and Alt+letter actions
 */
export const useGlobalShortcuts = (handlers: GlobalShortcutHandlers): void => {
  // Keep the latest handlers in a ref so the listener is registered once,
  // instead of being torn down and re-attached on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const code = event.code;
      const typing = isTypingTarget(event.target);

      // ---- Always-on shortcuts -------------------------------------------------
      if ((event.ctrlKey || event.metaKey) && !event.altKey && code === 'KeyK') {
        event.preventDefault();
        handlersRef.current.onTogglePalette();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && code === 'KeyB') {
        event.preventDefault();
        handlersRef.current.onToggleSidebar();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        // Help stays reachable even while typing.
        if (code === 'KeyH') {
          event.preventDefault();
          handlersRef.current.onShowHelp();
          return;
        }

        // Every other app shortcut stays out of the way of data entry.
        if (typing) return;

        const navTarget = NAV_CODES[code];
        if (navTarget) {
          event.preventDefault();
          handlersRef.current.onNavigate(navTarget);
          return;
        }

        switch (code) {
          case 'KeyN':
            event.preventDefault();
            handlersRef.current.onNewSale();
            break;
          case 'KeyM':
            event.preventDefault();
            handlersRef.current.onNewPurchase();
            break;
          case 'KeyR':
            event.preventDefault();
            handlersRef.current.onNewReceipt();
            break;
          case 'KeyP':
            event.preventDefault();
            handlersRef.current.onNewPayment();
            break;
          case 'KeyT':
            event.preventDefault();
            handlersRef.current.onTransfer();
            break;
          case 'KeyS':
            event.preventDefault();
            handlersRef.current.onManageUsers();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};

export default useGlobalShortcuts;
