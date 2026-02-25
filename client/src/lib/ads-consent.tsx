import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "tastelog_ads_consent";

function readConsent(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

type AdsConsentValue = {
  /** null = not set yet (show banner), true = accepted, false = declined */
  consented: boolean | null;
  setConsented: (value: boolean) => void;
  /** True when we should show the consent banner (not yet decided) */
  showBanner: boolean;
};

const AdsConsentContext = createContext<AdsConsentValue | null>(null);

export function AdsConsentProvider({ children }: { children: ReactNode }) {
  const [consented, setConsentedState] = useState<boolean | null>(() => readConsent());

  const setConsented = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
    setConsentedState(value);
  }, []);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setConsentedState(readConsent());
  }, []);

  const showBanner = consented === null;

  return (
    <AdsConsentContext.Provider
      value={{ consented, setConsented, showBanner }}
    >
      {children}
    </AdsConsentContext.Provider>
  );
}

export function useAdsConsent(): AdsConsentValue {
  const ctx = useContext(AdsConsentContext);
  if (!ctx) throw new Error("useAdsConsent must be used within AdsConsentProvider");
  return ctx;
}
