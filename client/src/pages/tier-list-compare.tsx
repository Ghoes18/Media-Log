import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface UserStub {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface TierItemDetail {
  id: string;
  mediaId: string;
  tierId: string | null;
  position: number;
  media: { id: string; coverUrl: string; coverGradient: string; title?: string };
}

interface TierWithItems {
  id: string;
  label: string;
  color: string;
  position: number;
  items: TierItemDetail[];
}

interface TierListDetail {
  id: string;
  name: string;
  owner: UserStub | null;
  tiers: TierWithItems[];
  unassignedItems: TierItemDetail[];
}

interface CompareData {
  a: TierListDetail;
  b: TierListDetail;
  mediaMap: Record<string, { aPlacement: string | null; bPlacement: string | null }>;
}

export default function TierListCompare() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const idA = params.get("a") ?? "";
  const idB = params.get("b") ?? "";

  const { data, isLoading, error } = useQuery<CompareData>({
    queryKey: ["/api/tier-lists/compare", idA, idB],
    queryFn: async () => {
      if (!idA || !idB) throw new Error("Missing IDs");
      const res = await apiRequest("GET", `/api/tier-lists/compare?a=${idA}&b=${idB}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Failed to load comparison");
      }
      return res.json();
    },
    enabled: !!idA && !!idB,
  });

  if (!idA || !idB) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
          Two tier list IDs required
        </p>
        <Button variant="outline" asChild>
          <Link href="/lists"><ArrowLeft className="mr-2 h-4 w-4" /> Back to lists</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
          {error instanceof Error ? error.message : "Comparison not available"}
        </p>
        <Button variant="outline" asChild>
          <Link href="/lists"><ArrowLeft className="mr-2 h-4 w-4" /> Back to lists</Link>
        </Button>
      </div>
    );
  }

  const allMediaIds = Object.keys(data.mediaMap);
  const allItems = new Map<string, { title: string; coverUrl: string }>();
  for (const tier of [...data.a.tiers, ...data.b.tiers]) {
    for (const item of tier.items) {
      allItems.set(item.mediaId, { title: item.media.title ?? "Untitled", coverUrl: item.media.coverUrl });
    }
  }
  for (const item of [...data.a.unassignedItems, ...data.b.unassignedItems]) {
    allItems.set(item.mediaId, { title: item.media.title ?? "Untitled", coverUrl: item.media.coverUrl });
  }


  const comparisons = allMediaIds
    .map((mediaId) => {
      const info = allItems.get(mediaId);
      const { aPlacement, bPlacement } = data.mediaMap[mediaId];
      return {
        mediaId,
        title: info?.title ?? "Untitled",
        coverUrl: info?.coverUrl ?? "",
        aPlacement,
        bPlacement,
        isDifferent: aPlacement !== bPlacement,
      };
    })
    .sort((x, y) => {
      if (x.isDifferent && !y.isDifferent) return -1;
      if (!x.isDifferent && y.isDifferent) return 1;
      return x.title.localeCompare(y.title);
    });

  const diffCount = comparisons.filter((c) => c.isDifferent).length;

  function getTierBgStyle(label: string | null): React.CSSProperties {
    if (!label) return {};
    const tier = [...data!.a.tiers, ...data!.b.tiers].find((t) => t.label === label);
    if (!tier) return {};
    return { backgroundColor: `${tier.color}30`, color: tier.color, borderColor: `${tier.color}50` };
  }

  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/30">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" asChild>
            <Link href="/lists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-lg font-semibold leading-tight flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary shrink-0" />
              Compare Rankings
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.a.owner?.displayName ?? "User A"} vs {data.b.owner?.displayName ?? "User B"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center gap-4 rounded-lg border bg-card p-4">
          <div className="flex-1 text-center">
            <Link href={`/tier-lists/${data.a.id}`} className="hover:underline">
              <p className="text-sm font-semibold truncate">{data.a.name}</p>
            </Link>
            <p className="text-xs text-muted-foreground">{data.a.owner?.displayName}</p>
          </div>
          <div className="shrink-0 text-muted-foreground">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div className="flex-1 text-center">
            <Link href={`/tier-lists/${data.b.id}`} className="hover:underline">
              <p className="text-sm font-semibold truncate">{data.b.name}</p>
            </Link>
            <p className="text-xs text-muted-foreground">{data.b.owner?.displayName}</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {diffCount} of {comparisons.length} items ranked differently
        </p>

        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_80px_80px] gap-0 items-center bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
            <span>Item</span>
            <span />
            <span className="text-center truncate">{(data.a.owner?.displayName ?? "A").slice(0, 8)}</span>
            <span className="text-center truncate">{(data.b.owner?.displayName ?? "B").slice(0, 8)}</span>
          </div>
          {comparisons.map((c) => (
            <div
              key={c.mediaId}
              className={cn(
                "grid grid-cols-[1fr_auto_80px_80px] gap-0 items-center px-3 py-2 border-b last:border-b-0 transition-colors",
                c.isDifferent ? "bg-amber-500/5" : ""
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {c.coverUrl ? (
                  <img src={c.coverUrl} alt="" className="h-8 w-6 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-6 rounded bg-muted shrink-0" />
                )}
                <span className="text-sm truncate font-medium">{c.title}</span>
              </div>
              <span className="px-2">
                {c.isDifferent && <span className="text-amber-500 text-xs font-bold">!</span>}
              </span>
              <div className="flex justify-center">
                <span
                  className="inline-block rounded border px-2 py-0.5 text-xs font-bold text-center min-w-[28px]"
                  style={getTierBgStyle(c.aPlacement)}
                >
                  {c.aPlacement ?? "—"}
                </span>
              </div>
              <div className="flex justify-center">
                <span
                  className="inline-block rounded border px-2 py-0.5 text-xs font-bold text-center min-w-[28px]"
                  style={getTierBgStyle(c.bPlacement)}
                >
                  {c.bPlacement ?? "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
