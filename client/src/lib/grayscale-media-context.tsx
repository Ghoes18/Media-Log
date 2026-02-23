import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "media-log:grayscale-media";

function getStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "true";
  } catch {
    return false;
  }
}

type GrayscaleMediaContextValue = {
  grayscaleMedia: boolean;
  setGrayscaleMedia: (value: boolean) => void;
};

const GrayscaleMediaContext = createContext<GrayscaleMediaContextValue | null>(null);

export function GrayscaleMediaProvider({ children }: { children: React.ReactNode }) {
  const [grayscaleMedia, setState] = useState(getStored);

  const setGrayscaleMedia = useCallback((value: boolean) => {
    setState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch {}
  }, []);

  useEffect(() => {
    document.body.dataset.grayscaleMedia = grayscaleMedia ? "true" : "false";
  }, [grayscaleMedia]);

  const value = useMemo(
    () => ({ grayscaleMedia, setGrayscaleMedia }),
    [grayscaleMedia, setGrayscaleMedia],
  );

  return (
    <GrayscaleMediaContext.Provider value={value}>
      {children}
    </GrayscaleMediaContext.Provider>
  );
}

export function useGrayscaleMedia() {
  const ctx = useContext(GrayscaleMediaContext);
  if (!ctx) {
    return { grayscaleMedia: false, setGrayscaleMedia: () => {} };
  }
  return ctx;
}
