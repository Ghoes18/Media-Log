import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAdsConsent } from "@/lib/ads-consent";
import { loadAdSense } from "@/lib/adsense-loader";

const AD_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? "";

type AdSenseContextValue = {
  isLoaded: boolean;
};

const AdSenseContext = createContext<AdSenseContextValue | null>(null);

export function AdSenseProvider({ children }: { children: ReactNode }) {
  const { consented } = useAdsConsent();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (consented !== true || !AD_CLIENT) {
      setIsLoaded(false);
      return;
    }
    let cancelled = false;
    loadAdSense(AD_CLIENT).then(() => {
      if (!cancelled) setIsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [consented]);

  return (
    <AdSenseContext.Provider value={useMemo(() => ({ isLoaded }), [isLoaded])}>
      {children}
    </AdSenseContext.Provider>
  );
}

export function useAdSense(): AdSenseContextValue {
  const ctx = useContext(AdSenseContext);
  if (!ctx) return { isLoaded: false };
  return ctx;
}
