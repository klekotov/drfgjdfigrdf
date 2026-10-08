type IntegrityManifest = {
  algorithm: 'sha256';
  files: Record<string, string>;
};

const DEVTOOLS_CHECK_INTERVAL_MS = 1000;
const DEVTOOLS_SIZE_THRESHOLD = 160;
const protectedConsoleMethods = [
  'assert',
  'debug',
  'error',
  'info',
  'log',
  'table',
  'trace',
  'warn',
  'dir',
  'group',
  'groupCollapsed',
  'groupEnd',
  'dirxml',
  'count',
  'countReset',
  'time',
  'timeEnd',
  'timeLog',
  'clear',
] as const;

let consoleIsStubbed = false;
let integrityHasFailed = false;

function stubConsole() {
  if (consoleIsStubbed) {
    return;
  }

  const noop = () => undefined;

  for (const method of protectedConsoleMethods) {
    try {
      console[method] = noop;
    } catch {
      // Some WebView console methods can be read-only.
    }
  }

  consoleIsStubbed = true;
}

function hasDevToolsOpen() {
  const widthGap = Math.abs(window.outerWidth - window.innerWidth);
  const heightGap = Math.abs(window.outerHeight - window.innerHeight);

  return widthGap > DEVTOOLS_SIZE_THRESHOLD || heightGap > DEVTOOLS_SIZE_THRESHOLD;
}

function blockInspectorShortcuts(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const hasModifier = event.ctrlKey || event.metaKey;
  const isInspectorShortcut =
    key === 'f12' ||
    (hasModifier && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
    (hasModifier && key === 'u');

  if (isInspectorShortcut) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function markIntegrityFailure() {
  if (integrityHasFailed) {
    return;
  }

  integrityHasFailed = true;
  document.documentElement.dataset.integrity = 'invalid';
  stubConsole();
}

async function sha256(bytes: ArrayBuffer) {
  if (!window.crypto?.subtle) {
    return null;
  }

  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyBuildIntegrity() {
  try {
    const manifestUrl = new URL('integrity.json', window.location.href);
    const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });

    if (!manifestResponse.ok) {
      markIntegrityFailure();
      return;
    }

    const manifest = (await manifestResponse.json()) as IntegrityManifest;
    if (manifest.algorithm !== 'sha256' || !manifest.files) {
      markIntegrityFailure();
      return;
    }

    for (const [fileName, expectedHash] of Object.entries(manifest.files)) {
      const assetResponse = await fetch(new URL(fileName, window.location.href), {
        cache: 'no-store',
      });

      if (!assetResponse.ok) {
        markIntegrityFailure();
        return;
      }

      const actualHash = await sha256(await assetResponse.arrayBuffer());
      if (actualHash === null || actualHash !== expectedHash) {
        markIntegrityFailure();
        return;
      }
    }
  } catch {
    markIntegrityFailure();
  }
}

export function installRuntimeProtection() {
  if (import.meta.env.DEV) {
    return;
  }

  const checkDevTools = () => {
    if (hasDevToolsOpen()) {
      stubConsole();
    }
  };

  checkDevTools();
  window.addEventListener('resize', checkDevTools, { passive: true });
  window.addEventListener('keydown', blockInspectorShortcuts, true);
  window.setInterval(checkDevTools, DEVTOOLS_CHECK_INTERVAL_MS);
  void verifyBuildIntegrity();
}