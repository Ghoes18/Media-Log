import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEnsureMedia } from "@/lib/use-ensure-media";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clapperboard,
  Film,
  Gamepad2,
  LayoutGrid,
  List,
  Music,
  Search,
  SlidersHorizontal,
  Star,
  Tv2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const MEDIA_TYPES = ["movie", "tv", "anime", "book", "music", "game"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const MEDIA_LABELS: Record<MediaType, string> = {
  movie: "Movies",
  anime: "Animation",
  book: "Books",
  tv: "TV",
  music: "Music",
  game: "Games",
};

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "rating", label: "Rating (high to low)" },
  { value: "title", label: "Title A–Z" },
  { value: "year", label: "Year (newest)" },
] as const;

const YEAR_CHIPS = [
  { id: "2020s", label: "2020s", min: 2020, max: 2030 },
  { id: "2010s", label: "2010s", min: 2010, max: 2019 },
  { id: "2000s", label: "2000s", min: 2000, max: 2009 },
  { id: "classic", label: "Classic (pre-2000)", min: 0, max: 1999 },
] as const;

const DISCOVER_VIEW_KEY = "discover-view";

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

function applyFiltersAndSort(
  items: any[],
  sort: string,
  yearChips: string[],
  _activeTab: MediaType | "all"
) {
  let result = [...items];
  const yearRanges = yearChips
    .map((id) => YEAR_CHIPS.find((y) => y.id === id))
    .filter(Boolean) as (typeof YEAR_CHIPS)[number][];

  if (yearRanges.length > 0) {
    result = result.filter((m) => {
      const y = m.year ? Number.parseInt(String(m.year), 10) : null;
      if (y == null) return false;
      return yearRanges.some((r) => y >= r.min && y <= r.max);
    });
  }

  switch (sort) {
    case "rating":
      result.sort((a, b) => {
        const ra = a.rating ? Number.parseFloat(a.rating) : 0;
        const rb = b.rating ? Number.parseFloat(b.rating) : 0;
        return rb - ra;
      });
      break;
    case "title":
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "year":
      result.sort((a, b) => {
        const ya = a.year ? Number.parseInt(String(a.year), 10) : 0;
        const yb = b.year ? Number.parseInt(String(b.year), 10) : 0;
        return yb - ya;
      });
      break;
    default:
      break;
  }
  return result;
}

function Cover({ m, compact }: { readonly m: any; readonly compact?: boolean }) {
  const Icon = mediaIcon(m.type);
  const displayRating = m.rating ? Number.parseFloat(m.rating) : null;
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
        <div className="text-sm font-semibold leading-tight text-white drop-shadow-sm">
          {m.title}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="truncate text-xs text-white/80 drop-shadow-sm">
            {m.creator}
            {m.year ? ` · ${m.year}` : ""}
          </div>
          {displayRating != null && (
            <div className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-xs text-white ring-1 ring-white/15 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {displayRating.toFixed(1)}
            </div>
          )}
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
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.2 };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      data-testid={`link-media-${itemId}`}
      role="button"
      tabIndex={0}
      onClick={() => ensureAndNavigate(m)}
      onKeyDown={(e) => e.key === "Enter" && ensureAndNavigate(m)}
      className="group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
    >
      <motion.div
        whileHover={reducedMotion ? undefined : { y: -4 }}
        transition={{ duration: 0.2 }}
        className="rounded-md"
      >
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
      </motion.div>
    </motion.div>
  );
}

function ListRow({
  m,
  itemId,
  reducedMotion,
}: {
  readonly m: any;
  readonly itemId: string;
  readonly reducedMotion?: boolean;
}) {
  const { ensureAndNavigate } = useEnsureMedia();
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.2 };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
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
                <div
                  className="truncate text-sm font-semibold"
                  data-testid={`text-title-${itemId}`}
                >
                  {m.title}
                </div>
                <div
                  className="truncate text-xs text-muted-foreground"
                  data-testid={`text-meta-${itemId}`}
                >
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
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </motion.div>
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

function SkeletonTrendingRow() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] w-[120px] shrink-0 rounded-md" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { readonly onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 py-16 px-6"
    >
      <div className="rounded-full bg-muted/50 p-4">
        <Search className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">No results found</h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        Try a different search or adjust your filters.
      </p>
      <Button
        variant="secondary"
        className="mt-4 rounded-md"
        onClick={onClear}
        data-testid="button-clear-search"
      >
        Clear search
      </Button>
    </motion.div>
  );
}

function usePersonParams() {
  const [location] = useLocation();
  const search = location.includes("?") ? location.slice(location.indexOf("?")) : "";
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const person = params.get("person") || "";
  const personId = params.get("personId") || "";
  const type = params.get("type") || "";
  const isValid = !!(personId && type && ["movie", "tv", "anime", "book", "music", "game"].includes(type));
  return { person, personId, type: type as MediaType | "", isValid };
}

export default function Discover() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<string>("trending");
  const [yearChips, setYearChips] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [, setLocation] = useLocation();
  const personParams = usePersonParams();

  const debouncedQuery = useDebounce(query, 300);
  const { ensureAndNavigate } = useEnsureMedia();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (personParams.isValid && personParams.type) {
      setActiveTab(personParams.type as MediaType);
    }
  }, [personParams.isValid, personParams.type]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISCOVER_VIEW_KEY) as "grid" | "list" | null;
      if (stored === "grid" || stored === "list") setViewMode(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DISCOVER_VIEW_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  const isSearching = debouncedQuery.trim().length > 0;

  const trendingQueries = useQueries({
    queries: MEDIA_TYPES.map((type) => ({
      queryKey: ["/api/trending", type],
      queryFn: () => fetch(`/api/trending/${type}?limit=10`).then((r) => r.json()),
      enabled: !isSearching && activeTab === "all",
    })),
  });

  const singleTrendingQuery = useQuery<any[]>({
    queryKey: ["/api/trending", activeTab],
    queryFn: () => fetch(`/api/trending/${activeTab}?limit=24`).then((r) => r.json()),
    enabled: !isSearching && activeTab !== "all" && !personParams.isValid,
  });

  const personByPersonQuery = useQuery<any[]>({
    queryKey: ["/api/discover/by-person", personParams.personId, personParams.person, personParams.type],
    queryFn: () => {
      const params = new URLSearchParams({
        personId: personParams.personId,
        type: personParams.type,
      });
      if (personParams.person) params.set("person", personParams.person);
      return fetch(`/api/discover/by-person?${params}`).then((r) => r.json());
    },
    enabled: personParams.isValid,
  });

  const searchQuery = useQuery<any[]>({
    queryKey: ["/api/search/all", debouncedQuery, activeTab],
    queryFn: () => {
      const params = new URLSearchParams({ q: debouncedQuery.trim() });
      if (activeTab !== "all") params.set("type", activeTab);
      return fetch(`/api/search/all?${params}`).then((r) => r.json());
    },
    enabled: isSearching,
  });

  const trendingByType = useMemo(() => {
    if (activeTab !== "all") return null;
    return MEDIA_TYPES.reduce(
      (acc, type, i) => {
        const data = trendingQueries[i]?.data;
        acc[type] = Array.isArray(data) ? data : [];
        return acc;
      },
      {} as Record<MediaType, any[]>
    );
  }, [activeTab, trendingQueries]);

  const personItems = personParams.isValid ? (personByPersonQuery.data ?? []) : [];
  const singleTrendingItems = activeTab !== "all" ? (singleTrendingQuery.data ?? []) : [];
  const searchItems = isSearching ? (searchQuery.data ?? []) : [];
  const isTrendingAll = !isSearching && activeTab === "all" && !personParams.isValid;
  const isTrendingSingle = !isSearching && activeTab !== "all" && !personParams.isValid;
  const isPersonMode = personParams.isValid;
  const trendingAllLoading = trendingQueries.some((q) => q.isLoading);
  const trendingSingleLoading = isPersonMode ? personByPersonQuery.isLoading : singleTrendingQuery.isLoading;
  const searchLoading = searchQuery.isLoading;

  const displayItems = isPersonMode ? personItems : (isSearching ? searchItems : singleTrendingItems);
  const filteredItems = useMemo(
    () =>
      applyFiltersAndSort(displayItems, sort, yearChips, activeTab),
    [displayItems, sort, yearChips, activeTab]
  );

  const hasActiveFilters = yearChips.length > 0 || sort !== "trending";
  const activeFilterCount = yearChips.length + (sort !== "trending" ? 1 : 0);

  const toggleYearChip = (id: string) => {
    setYearChips((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSort("trending");
    setYearChips([]);
  };

  const clearPersonFilter = () => {
    setLocation("/discover");
    setQuery("");
  };

  const personModeTitle = useMemo(() => {
    if (!personParams.isValid || !personParams.person) return "";
    const labels: Record<string, string> = {
      movie: "Movies with",
      tv: "TV shows with",
      anime: "Anime with",
      music: "Music by",
      book: "Books by",
      game: "Games by",
    };
    const prefix = labels[personParams.type] || "";
    return prefix ? `${prefix} ${personParams.person}` : personParams.person;
  }, [personParams.isValid, personParams.person, personParams.type]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md" data-testid="button-back" asChild>
            <Link href="/" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-discover-title">
              Discover
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-discover-subtitle">
              Trending lists, fresh reviews, and niche gems.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="secondary"
                  className="relative rounded-md"
                  data-testid="button-filter"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle className="font-serif">Filters & sort</SheetTitle>
                  <SheetDescription>
                    Sort and filter results. Changes apply to search and trending.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold">Sort by</h4>
                    <div className="mt-2 flex flex-col gap-2">
                      {SORT_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-card/80"
                        >
                          <input
                            type="radio"
                            name="sort"
                            value={opt.value}
                            checked={sort === opt.value}
                            onChange={() => setSort(opt.value)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold">Year range</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Show only items from selected decades.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {YEAR_CHIPS.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => toggleYearChip(chip.id)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            yearChips.includes(chip.id)
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-card hover:bg-card/80"
                          )}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      className="w-full rounded-md"
                      onClick={() => {
                        clearFilters();
                        setFilterOpen(false);
                      }}
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="glass bg-noise rounded-lg p-5 sm:p-7" data-testid="card-search">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div
                  className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                  data-testid="badge-discover"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  browse by medium & vibe
                </div>
                <h2 className="mt-3 font-serif text-2xl font-semibold" data-testid="text-search-title">
                  Find your next favorite.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground" data-testid="text-search-subtitle">
                  Search across films, animation, books, TV shows, music, and games.
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex w-full flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, creators, years…"
                  className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  data-testid="input-discover-search"
                  aria-label="Search media"
                />
                <AnimatePresence>
                  {query.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      type="button"
                      onClick={() => setQuery("")}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  if (personParams.isValid) clearPersonFilter();
                  setActiveTab(v as MediaType | "all");
                }}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid w-full grid-cols-7 rounded-md bg-muted/50 p-1 sm:w-[580px]">
                  <TabsTrigger value="all" className="rounded-md" data-testid="tab-all">
                    All
                  </TabsTrigger>
                  {MEDIA_TYPES.map((t) => (
                    <TabsTrigger key={t} value={t} className="rounded-md" data-testid={`tab-${t}`}>
                      {MEDIA_LABELS[t]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {sort !== "trending" && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer rounded-full pr-1 hover:bg-muted"
                    onClick={() => setSort("trending")}
                  >
                    {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                )}
                {yearChips.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer rounded-full pr-1 hover:bg-muted"
                    onClick={() => toggleYearChip(id)}
                  >
                    {YEAR_CHIPS.find((y) => y.id === id)?.label}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </Card>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              {isTrendingAll ? (
                <motion.div
                  key="trending-all"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
                  className="space-y-8"
                >
                  {trendingAllLoading ? (
                    <>
                      {MEDIA_TYPES.map((type) => (
                        <div key={type}>
                          <Skeleton className="mb-3 h-5 w-40" />
                          <SkeletonTrendingRow />
                        </div>
                      ))}
                    </>
                  ) : (
                    trendingByType &&
                    MEDIA_TYPES.map((type) => {
                      const items = trendingByType[type] ?? [];
                      if (items.length === 0) return null;
                      const Icon = mediaIcon(type);
                      return (
                        <section key={type}>
                          <div className="mb-3 flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-serif text-lg font-semibold">
                              Trending {MEDIA_LABELS[type]}
                            </h3>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-thin">
                            {items.map((m: any, idx: number) => {
                              const itemId = m.id || m.externalId || `item-${type}-${idx}`;
                              return (
                                <div
                                  key={itemId}
                                  className="w-[120px] shrink-0 snap-start sm:w-[140px]"
                                >
                                  <button
                                    type="button"
                                    data-testid={`link-trending-${itemId}`}
                                    onClick={() => ensureAndNavigate(m)}
                                    className="group w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                                  >
                                    <motion.div
                                      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Cover m={m} />
                                    </motion.div>
                                    <div className="mt-2 truncate text-sm font-medium">{m.title}</div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })
                  )}
                </motion.div>
              ) : (isTrendingSingle || isPersonMode) ? (
                <motion.div
                  key="trending-single"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-serif text-xl font-semibold" data-testid="text-results-title">
                      {isPersonMode ? personModeTitle : `Trending ${activeTab !== "all" ? MEDIA_LABELS[activeTab] : "All"}`}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isPersonMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          onClick={clearPersonFilter}
                          data-testid="button-clear-person"
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          Clear
                        </Button>
                      )}
                      <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
                        <button
                          type="button"
                          onClick={() => setViewMode("grid")}
                          className={cn(
                            "rounded p-2 transition-colors",
                            viewMode === "grid"
                              ? "bg-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-pressed={viewMode === "grid"}
                          aria-label="Grid view"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("list")}
                          className={cn(
                            "rounded p-2 transition-colors",
                            viewMode === "list"
                              ? "bg-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-pressed={viewMode === "list"}
                          aria-label="List view"
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm text-muted-foreground" data-testid="text-results-count">
                        {trendingSingleLoading ? "…" : `${filteredItems.length} items`}
                      </span>
                    </div>
                  </div>
                  {trendingSingleLoading ? (
                    viewMode === "grid" ? (
                      <SkeletonGrid />
                    ) : (
                      <SkeletonList />
                    )
                  ) : (
                    <AnimatePresence mode="wait">
                      {viewMode === "grid" ? (
                        <motion.div
                          key="grid"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                        >
                          {filteredItems.map((m: any, idx: number) => {
                            const itemId = m.id || m.externalId || `item-${idx}`;
                            return (
                              <MediaCard key={itemId} m={m} itemId={itemId} reducedMotion={!!prefersReducedMotion} />
                            );
                          })}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="list"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid gap-3"
                        >
                          {filteredItems.map((m: any, idx: number) => {
                            const itemId = m.id || m.externalId || `item-${idx}`;
                            return <ListRow key={itemId} m={m} itemId={itemId} reducedMotion={!!prefersReducedMotion} />;
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-serif text-xl font-semibold" data-testid="text-results-title">
                      {searchLoading ? (
                        "Searching…"
                      ) : (
                        <>
                          {filteredItems.length} results
                          {debouncedQuery && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              for &ldquo;{debouncedQuery}&rdquo;
                            </span>
                          )}
                        </>
                      )}
                    </h3>
                    {!searchLoading && filteredItems.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
                          <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={cn(
                              "rounded p-2 transition-colors",
                              viewMode === "grid"
                                ? "bg-background shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            aria-pressed={viewMode === "grid"}
                            aria-label="Grid view"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={cn(
                              "rounded p-2 transition-colors",
                              viewMode === "list"
                                ? "bg-background shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            aria-pressed={viewMode === "list"}
                            aria-label="List view"
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {searchLoading ? (
                    viewMode === "grid" ? (
                      <SkeletonGrid />
                    ) : (
                      <SkeletonList />
                    )
                  ) : filteredItems.length === 0 ? (
                    <EmptyState onClear={() => setQuery("")} />
                  ) : (
                    <AnimatePresence mode="wait">
                      {viewMode === "grid" ? (
                        <motion.div
                          key="grid"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                        >
                          {filteredItems.map((m: any, idx: number) => {
                            const itemId = m.id || m.externalId || `item-${idx}`;
                            return (
                              <MediaCard key={itemId} m={m} itemId={itemId} reducedMotion={!!prefersReducedMotion} />
                            );
                          })}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="list"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid gap-3"
                        >
                          {filteredItems.map((m: any, idx: number) => {
                            const itemId = m.id || m.externalId || `item-${idx}`;
                            return <ListRow key={itemId} m={m} itemId={itemId} reducedMotion={!!prefersReducedMotion} />;
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <div className="font-brand fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            data-testid="nav-home"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/discover"
            data-testid="nav-discover"
            className="text-sm font-medium transition-opacity hover:opacity-80"
          >
            Discover
          </Link>
          <Link
            href="/watchlist"
            data-testid="nav-watchlist"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Watchlist
          </Link>
          <Link
            href="/u/you"
            data-testid="nav-profile"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
