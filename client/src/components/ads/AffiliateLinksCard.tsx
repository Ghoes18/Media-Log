import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buildAffiliateLinks, type MediaForAffiliate } from "@/lib/affiliate-links";
import { cn } from "@/lib/utils";

type AffiliateLinksCardProps = {
  media: MediaForAffiliate;
  className?: string;
};

export function AffiliateLinksCard({ media, className }: AffiliateLinksCardProps) {
  const links = buildAffiliateLinks(media);
  if (links.length === 0) return null;

  return (
    <Card className={cn("rounded-lg border border-border bg-card p-5", className)} data-testid="card-affiliate-links">
      <div className="font-serif text-lg font-semibold">Where to get it</div>
      <p className="mt-1 text-xs text-muted-foreground">
        We may earn a small commission from qualifying purchases.{" "}
        <Link href="/affiliate-disclosure" className="text-primary underline-offset-4 hover:underline">
          Learn more
        </Link>
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((item) => (
          <li key={item.label}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-card/90"
              data-testid={`link-affiliate-${item.label.replace(/\s/g, "-").toLowerCase()}`}
            >
              <span className="min-w-0 truncate">{item.label}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
