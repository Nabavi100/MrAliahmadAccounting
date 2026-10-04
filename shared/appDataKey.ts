/**
 * Shared configuration for protecting the server-side accounting data API.
 *
 * When the `APP_DATA_KEY` environment variable is set the API requires the same
 * value in the `x-app-key` header, and the key is additionally injected into the
 * served HTML so the official client can pick it up automatically. This keeps
 * the bookkeeping data from being readable/writable by arbitrary scripts that
 * merely know the address of the server.
 */

export const APP_DATA_KEY_ENV = 'APP_DATA_KEY';
export const APP_DATA_META_NAME = 'app-data-key';

/** Reads the configured access key (empty string when protection is disabled). */
export const getAppDataKey = (): string => {
  try {
    return (process.env[APP_DATA_KEY_ENV] || '').trim();
  } catch {
    return '';
  }
};

const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Builds the `<meta>` tag that exposes the key to the official client. */
export const buildAppDataKeyMeta = (key: string): string =>
  key ? `<meta name="${APP_DATA_META_NAME}" content="${escapeHtmlAttribute(key)}" />` : '';

/**
 * Injects the key meta tag into an HTML document.
 * No-ops when there is no key configured or the tag is already present.
 */
export const injectAppDataKeyMeta = (html: string, key: string = getAppDataKey()): string => {
  const meta = buildAppDataKeyMeta(key);
  if (!meta) return html;
  if (html.includes(`name="${APP_DATA_META_NAME}"`)) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `  ${meta}\n  </head>`);
  }
  return `${meta}\n${html}`;
};
