import { Link } from "wouter";
import { cn } from "@/lib/utils";

type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-border/60 py-4 text-center text-xs text-muted-foreground",
        className
      )}
      role="contentinfo"
    >
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
        <Link href="/cookies" className="hover:text-foreground hover:underline">
          Cookies
        </Link>
        <Link href="/affiliate-disclosure" className="hover:text-foreground hover:underline">
          Affiliate disclosure
        </Link>
      </nav>
    </footer>
  );
}
