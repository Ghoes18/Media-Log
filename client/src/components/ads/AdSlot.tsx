import { useEffect, useRef, useState } from "react";
import { useSubscription } from "@/lib/use-subscription";
import { useAdsConsent } from "@/lib/ads-consent";
import { useAdSense } from "./AdSenseProvider";
import { cn } from "@/lib/utils";

type AdSlotProps = {
  /** Ad slot id from AdSense (e.g. 1234567890) */
  slotId: string;
  /** Optional format: "auto" | "rectangle" | "horizontal" | "vertical" */
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  /** Optional className for the wrapper */
  className?: string;
  /** Optional style for the ins element */
  style?: React.CSSProperties;
};

export function AdSlot({ slotId, format = "auto", className, style }: AdSlotProps) {
  const { isPro, isLoading } = useSubscription();
  const { consented } = useAdsConsent();
  const { isLoaded } = useAdSense();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin: "50px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !isLoaded || pushed.current || !slotId) return;
    const win = window as Window & { adsbygoogle?: unknown[] };
    if (!Array.isArray(win.adsbygoogle)) return;
    pushed.current = true;
    try {
      win.adsbygoogle.push({});
    } catch {
      pushed.current = false;
    }
  }, [inView, isLoaded, slotId]);

  const adClient = import.meta.env.VITE_ADSENSE_CLIENT ?? "";
  const shouldShow = !isPro && !isLoading && consented === true && isLoaded && !!adClient && !!slotId;

  if (!shouldShow) return null;

  return (
    <div className={cn("min-h-[100px] w-full", className)} ref={ref}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={adClient}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={format === "auto"}
      />
    </div>
  );
}
