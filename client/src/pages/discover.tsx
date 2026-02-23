import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Filter,
  Film,
  Gamepad2,
  Music,
  Flame,
  Loader2,
  Search,
  Star,
  Tv2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type MediaType = "movie" | "anime" | "book" | "tv" | "music" | "game";

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

function CoverMini({ m }: { m: any }) {
  const Icon = mediaIcon(m.type);
  const itemId = m.id || m.externalId || "unknown";
  return (
    <div
      className="relative h-20 w-16 overflow-hidden rounded-md border bg-card shadow-sm"
      data-testid={`img-cover-${itemId}`}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br grayscale contrast-125", m.coverGradient || "from-slate-700 to-slate-900")} />
      {m.coverUrl && (
        <img src={m.coverUrl} alt={m.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
        <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
      </div>
    </div>
  );
}

export default function Discover() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
  const debouncedQuery = useDebounce(query, 300);

  const isSearching = debouncedQuery.trim().length > 0;

  const trendingType = activeTab === "all" ? "all" : activeTab;
  const { data: trendingItems = [], isLoading: trendingLoading } = useQuery<any[]>({
    queryKey: ["/api/trending", trendingType],
    queryFn: () =>
      fetch(`/api/trending/${trendingType}?limit=20`).then((r) => r.json()),
    enabled: !isSearching,
  });

  const { data: searchItems = [], isLoading: searchLoading } = useQuery<any[]>({
    queryKey: ["/api/search/all", debouncedQuery, activeTab],
    queryFn: () => {
      const params = new URLSearchParams({ q: debouncedQuery.trim() });
      if (activeTab !== "all") params.set("type", activeTab);
      return fetch(`/api/search/all?${params}`).then((r) => r.json());
    },
    enabled: isSearching,
  });

  const mediaItems = isSearching ? searchItems : trendingItems;
  const isLoading = isSearching ? searchLoading : trendingLoading;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-md"
            data-testid="button-back"
            asChild
          >
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
            <Button variant="secondary" className="rounded-md" data-testid="button-filter">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Badge variant="secondary" className="rounded-full" data-testid="badge-trending">
              <Flame className="mr-1 h-3.5 w-3.5" />
              Trending
            </Badge>
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
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  browse by medium & vibe
                </div>
                <h2 className="mt-3 font-serif text-2xl font-semibold" data-testid="text-search-title">
                  Find your next favorite.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground" data-testid="text-search-subtitle">
                  Search across films, anime, books, TV shows, music, and games.
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, creators, years…"
                  className="h-9 rounded-md"
                  data-testid="input-discover-search"
                />
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-7 rounded-md bg-muted/50 p-1 sm:w-[580px]">
                  <TabsTrigger value="all" className="rounded-md" data-testid="tab-all">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="movie" className="rounded-md" data-testid="tab-movie">
                    Movies
                  </TabsTrigger>
                  <TabsTrigger value="anime" className="rounded-md" data-testid="tab-anime">
                    Anime
                  </TabsTrigger>
                  <TabsTrigger value="book" className="rounded-md" data-testid="tab-book">
                    Books
                  </TabsTrigger>
                  <TabsTrigger value="tv" className="rounded-md" data-testid="tab-tv">
                    TV
                  </TabsTrigger>
                  <TabsTrigger value="music" className="rounded-md" data-testid="tab-music">
                    Music
                  </TabsTrigger>
                  <TabsTrigger value="game" className="rounded-md" data-testid="tab-game">
                    Games
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Card>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <h3 className="font-serif text-xl font-semibold" data-testid="text-results-title">
                Results
              </h3>
              <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                {isLoading ? "…" : `${mediaItems.length} items`}
              </div>
            </div>

            {isLoading ? (
              <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {mediaItems.map((m: any, idx: number) => {
                  const itemId = m.id || m.externalId || `item-${idx}`;
                  return (
                    <div key={itemId} data-testid={`link-result-${itemId}`} className="block">
                      <Card className="rounded-lg border border-border bg-card p-4 sm:p-5 hover:opacity-[0.98] transition">
                        <div className="flex items-center gap-4">
                          <CoverMini m={m} />
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
                              <Badge variant="secondary" className="rounded-full" data-testid={`badge-type-${itemId}`}>
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
                })}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <div className="font-brand fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            data-testid="nav-home"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Home
          </Link>
          <Link href="/discover" data-testid="nav-discover" className="text-sm font-medium hover:opacity-80">
            Discover
          </Link>
          <Link
            href="/watchlist"
            data-testid="nav-watchlist"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Watchlist
          </Link>
          <Link
            href="/u/you"
            data-testid="nav-profile"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
