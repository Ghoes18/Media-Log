import { Button } from "@/components/ui/button";
import { useAdsConsent } from "@/lib/ads-consent";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function ConsentBanner() {
  const { showBanner, setConsented } = useAdsConsent();

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and ads consent"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.25)]"
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies and optional ads to run the site. By accepting, you allow us to show ads (you can turn them off in settings).{" "}
          <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/cookies" className="text-primary underline-offset-4 hover:underline">
            Cookies
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-md"
            onClick={() => setConsented(false)}
          >
            Decline ads
          </Button>
          <Button
            size="sm"
            className="rounded-md"
            onClick={() => setConsented(true)}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
