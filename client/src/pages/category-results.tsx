import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clapperboard, Film, Gamepad2, Music, Search, Tv2, X } from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnsureMedia } from "@/lib/use-ensure-media";
import { cn } from "@/lib/utils";

import { MEDIA_TYPES, MEDIA_LABELS, type MediaType } from "@shared/schema";

const PAGE_SIZE = 20;

function mediaIcon(type: string) {
  switch (type) {
    case "movie":
      return Film;
    case "anime":
      return Clapperboard;
    case "book":
      return BookOpen;
    case "tv":
      return Tv2;
    case "music":
      return Music;
    case "game":
      return Gamepad2;
    default:
      return Film;
  }
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Cover({ m, compact }: { readonly m: any; readonly compact?: boolean }) {
  const Icon = mediaIcon(m.type);
  const itemId = m.id || m.externalId || "unknown";
  if (compact) {
    return (
      <div
        className="media-cover relative h-24 w-16 shrink-0 overflow-hidden rounded-md border bg-card shadow-sm sm:h-28 sm:w-20"
        data-testid={`img-cover-${itemId}`}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br contrast-125",
            m.coverGradient || "from-slate-700 to-slate-900"
          )}
        />
        {m.coverUrl && (
          <img
            src={m.coverUrl}
            alt={m.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "media-cover relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-card shadow-sm",
        "bg-noise"
      )}
      data-testid={`cover-${itemId}`}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br contrast-125",
          m.coverGradient || "from-slate-700 to-slate-900"
        )}
      />
      {m.coverUrl && (
        <img
          src={m.coverUrl}
          alt={m.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute left-3 top-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1 text-[11px] font-medium text-white ring-1 ring-white/15 backdrop-blur-sm">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          {(m.type || "").toUpperCase()}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="text-sm font-semibold leading-tight text-white drop-shadow-sm">{m.title}</div>
        <div className="mt-0.5 truncate text-xs text-white/80 drop-shadow-sm">
          {m.creator}
          {m.year ? ` · ${m.year}` : ""}
        </div>
      </div>
    </div>
  );
}

function MediaCard({
  m,
  itemId,
  reducedMotion,
}: {
  readonly m: any;
  readonly itemId: string;
  readonly reducedMotion?: boolean;
}) {
  const { ensureAndNavigate } = useEnsureMedia();
  return (
    <div
      data-testid={`link-media-${itemId}`}
      role="button"
      tabIndex={0}
      onClick={() => ensureAndNavigate(m)}
      onKeyDown={(e) => e.key === "Enter" && ensureAndNavigate(m)}
      className="group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
    >
      <div className="rounded-md transition-transform duration-200 group-hover:-translate-y-1">
        <Cover m={m} />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(m.tags ?? []).slice(0, 3).map((t: string) => (
            <Badge
              key={t}
              variant="secondary"
              className="rounded-full"
              data-testid={`badge-tag-${itemId}-${t}`}
            >
              {t}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListRow({
  m,
  itemId,
}: {
  readonly m: any;
  readonly itemId: string;
}) {
  const { ensureAndNavigate } = useEnsureMedia();
  return (
    <div
      data-testid={`link-result-${itemId}`}
      role="button"
      tabIndex={0}
      onClick={() => ensureAndNavigate(m)}
      onKeyDown={(e) => e.key === "Enter" && ensureAndNavigate(m)}
      className="block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <Card className="rounded-lg border border-border bg-card p-4 sm:p-5 transition-colors duration-200 hover:bg-card/90">
        <div className="flex items-center gap-4">
          <Cover m={m} compact />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" data-testid={`text-title-${itemId}`}>
                  {m.title}
                </div>
                <div className="truncate text-xs text-muted-foreground" data-testid={`text-meta-${itemId}`}>
                  {m.creator}
                  {m.year ? ` · ${m.year}` : ""}
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full shrink-0" data-testid={`badge-type-${itemId}`}>
                {m.type}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(m.tags ?? []).slice(0, 3).map((t: string) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="rounded-full"
                  data-testid={`badge-tag-${itemId}-${t}`}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[3/4] w-full rounded-md" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function SkeletonList({ count = 6 }: { readonly count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-24 w-16 shrink-0 rounded-md sm:h-28 sm:w-20" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CategoryResults() {
  const params = useParams<{ type: string }>();
  const type = (params?.type ?? "").toLowerCase() as MediaType | "";
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const isValidType = MEDIA_TYPES.includes(type as MediaType);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery<{ items: any[]; page: number; hasMore: boolean }>({
    queryKey: ["/api/discover/category", type, debouncedQuery],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("limit", String(PAGE_SIZE));
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      const res = await fetch(`/api/discover/category/${type}?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: isValidType,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = data?.pages?.flatMap((p) => p.items) ?? [];
  const label = type ? MEDIA_LABELS[type as MediaType] ?? type : "";

  if (!isValidType) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Button variant="secondary" size="icon" className="rounded-md" asChild>
              <Link href="/discover">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="font-serif text-lg font-semibold">Invalid category</h1>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-muted-foreground">Category &quot;{type}&quot; is not valid. Use movie, tv, anime, book, music, or game.</p>
          <Button variant="link" className="mt-4 px-0" asChild>
            <Link href="/discover">Back to Discover</Link>
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md" asChild>
            <Link href="/discover" data-testid="link-back-discover">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-category-title">
              {label}
            </h1>
            <p className="truncate text-xs text-muted-foreground">Browse and search</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <div className="relative mb-6 flex items-center gap-2 rounded-md border bg-card px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            data-testid="input-category-search"
            aria-label="Search in category"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground" data-testid="text-results-count">
            {isLoading ? "…" : `${allItems.length} items`}
            {debouncedQuery.trim() && ` for "${debouncedQuery}"`}
          </span>
          <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded p-2 transition-colors",
                viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "grid" ? "true" : "false"}
              aria-label="Grid view"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded p-2 transition-colors",
                viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "list" ? "true" : "false"}
              aria-label="List view"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {isError && (
          <div className="rounded-lg border border-dashed border-border bg-card/40 py-8 text-center">
            <p className="text-muted-foreground">{(error as Error)?.message ?? "Failed to load"}</p>
            <Button variant="secondary" className="mt-4 rounded-md" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          viewMode === "grid" ? <SkeletonGrid count={12} /> : <SkeletonList count={6} />
        ) : allItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 py-16 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 font-serif text-lg font-semibold">No results</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedQuery.trim() ? "Try a different search term." : "Nothing in this category right now."}
            </p>
            {query.length > 0 && (
              <Button variant="secondary" className="mt-4 rounded-md" onClick={() => setQuery("")}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {allItems.map((m: any, idx: number) => {
                  const itemId = m.id || m.externalId || `item-${idx}`;
                  return <MediaCard key={itemId} m={m} itemId={itemId} />;
                })}
              </div>
            ) : (
              <div className="grid gap-3">
                {allItems.map((m: any, idx: number) => {
                  const itemId = m.id || m.externalId || `item-${idx}`;
                  return <ListRow key={itemId} m={m} itemId={itemId} />;
                })}
              </div>
            )}
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
            {isFetchingNextPage && (
              <div className="mt-4 flex justify-center">
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
