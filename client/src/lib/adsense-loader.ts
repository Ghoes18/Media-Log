/**
 * Loads the AdSense script once. Safe to call multiple times.
 * Resolves when the script has loaded (or immediately if already loaded).
 */
export function loadAdSense(clientId: string): Promise<void> {
  if (typeof document === "undefined" || !clientId) return Promise.resolve();

  const existing = document.querySelector(
    'script[src*="googlesyndication.com/pagead/js/adsbygoogle.js"]'
  );
  if (existing) {
    return (window as Window & { __adsenseLoaded?: Promise<void> }).__adsenseLoaded ?? Promise.resolve();
  }

  let resolveLoad: () => void;
  const loaded = new Promise<void>((r) => { resolveLoad = r; });
  (window as Window & { __adsenseLoaded?: Promise<void> }).__adsenseLoaded = loaded;

  (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ?? [];

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  script.crossOrigin = "anonymous";
  script.onload = () => resolveLoad!();
  script.onerror = () => resolveLoad!(); // resolve anyway so slots can try
  document.head.appendChild(script);

  return loaded;
}
