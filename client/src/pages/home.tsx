import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clapperboard,
  Film,
  Gamepad2,
  Heart,
  Music,
  Plus,
  Search,
  Star,
  TrendingUp,
  Tv2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useEnsureMedia } from "@/lib/use-ensure-media";

import { ThemeToggle } from "@/components/theme-toggle";
import { AdSlot } from "@/components/ads/AdSlot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";

type MediaType = "movie" | "anime" | "book" | "tv" | "music" | "game";

function mediaIcon(type: MediaType) {
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
  }
}

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  return (
    <div
      className="flex items-center gap-0.5"
      data-testid="rating-stars"
      aria-label={`${value} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const active = idx <= full;
        const halfActive = !active && half && idx === full + 1;
        return halfActive ? (
          <span key={i} className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <Star className="h-3.5 w-3.5 text-muted-foreground/35" strokeWidth={2} />
            <span className="absolute inset-0 w-1/2 overflow-hidden">
              <Star className="h-3.5 w-3.5 min-w-[14px] fill-amber-500 text-amber-500" strokeWidth={0} />
            </span>
          </span>
        ) : (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              active ? "fill-amber-500 text-amber-500" : "text-muted-foreground/35",
            )}
            strokeWidth={2}
          />
        );
      })}
    </div>
  );
}

function MediaCard({ m, itemId }: { m: any; itemId: string }) {
  const { ensureAndNavigate } = useEnsureMedia();
  return (
    <div
      data-testid={`link-media-${itemId}`}
      role="button"
      tabIndex={0}
      onClick={() => ensureAndNavigate(m)}
      onKeyDown={(e) => e.key === "Enter" && ensureAndNavigate(m)}
      className="group cursor-pointer"
    >
      <motion.div
        whileHover={{ y: -4 }}
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
    </div>
  );
}

function Cover({ m }: { m: any }) {
  const Icon = mediaIcon(m.type as MediaType);
  const displayRating = m.rating ? parseFloat(m.rating) : null;
  const itemId = m.id || m.externalId || "unknown";
  return (
    <div
      className={cn(
        "media-cover relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-card shadow-sm",
        "bg-noise",
      )}
      data-testid={`cover-${itemId}`}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br contrast-125", m.coverGradient || "from-slate-700 to-slate-900")} />
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
          {m.type.toUpperCase()}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="text-sm font-semibold leading-tight text-white drop-shadow-sm">{m.title}</div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="truncate text-xs text-white/80 drop-shadow-sm">
            {m.creator}
            {m.year ? ` · ${m.year}` : ""}
          </div>
          {displayRating !== null && (
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

function TopNav({
  query,
  setQuery,
  currentUser,
}: {
  query: string;
  setQuery: (v: string) => void;
  currentUser: any;
}) {
  return (
    <div className="sticky top-0 z-40 w-full pt-3 pb-2 sm:pt-4 sm:pb-3 px-4 sm:px-6">
      {/* Background blur pill for the top gap to avoid content showing above the navbar */}
      <div className="absolute inset-x-0 top-0 h-4 bg-background/80 backdrop-blur-xl pointer-events-none" />
      <div className="relative mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 transition-all">
        <Link href="/" data-testid="link-home" className="group flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/5 ring-1 ring-border/50 transition-colors group-hover:bg-foreground/10">
            <span className="font-brand text-lg font-semibold text-primary">T</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-brand text-[15px] font-semibold leading-tight text-foreground">Tastelog</div>
            <div className="text-xs font-medium text-muted-foreground">Your taste, across mediums</div>
          </div>
        </Link>

        <div className="ml-auto hidden w-[420px] max-w-full items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 shadow-inner transition-colors focus-within:bg-background/80 sm:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, animation, books, TV, music, games…"
            className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
            data-testid="input-search"
          />
          <Badge variant="secondary" className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-muted/80 text-muted-foreground">
            ⌘K
          </Badge>
        </div>

        <div className="flex items-center gap-3 pl-2">
          <ThemeToggle />

          <Button skeuo size="sm" className="rounded-xl shadow-sm font-semibold tracking-wide" data-testid="button-log" asChild>
            <Link href="/review/new" data-testid="link-new-review">
              <Plus className="mr-1.5 size-4" />
              Log
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-xl shadow-sm sm:hidden"
                data-testid="button-open-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="p-0 rounded-b-2xl border-b border-border/50 bg-background/95 backdrop-blur-xl">
              <SheetHeader className="px-4 pt-6">
                <SheetTitle className="font-serif text-xl">Search</SheetTitle>
                <SheetDescription>
                  Find something to review, save, or browse.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 mt-4">
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 shadow-inner">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search films, animation, books…"
                    className="h-10 border-0 bg-transparent text-base focus-visible:ring-0 shadow-none px-1"
                    data-testid="input-search-mobile"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {currentUser ? (
            <Link href={`/u/${currentUser.username}`} data-testid="link-profile" className="grid place-items-center ml-1">
              <Avatar className="h-9 w-9 ring-2 ring-background transition-transform hover:scale-105" data-testid="avatar-you">
                <AvatarImage alt={currentUser.displayName} src={currentUser.avatarUrl ?? ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                  {currentUser.displayName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" className="rounded-xl ml-1 font-semibold" asChild>
              <Link href="/signin" data-testid="link-signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function relativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 7) return date.toLocaleDateString();
  if (diffDay >= 1) return `${diffDay}d`;
  if (diffHr >= 1) return `${diffHr}h`;
  if (diffMin >= 1) return `${diffMin}m`;
  return "Just now";
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SocialProofStrip({
  reviewCount,
  discoverCount,
  reviewerCount,
}: {
  reviewCount: number;
  discoverCount: number;
  reviewerCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" data-testid="social-proof-strip">
      <div className="rounded-md border bg-card/60 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Heart className="h-3.5 w-3.5 text-red-600" />
          Community reviews
        </div>
        <div className="mt-1 font-serif text-lg font-semibold">{reviewCount}</div>
      </div>
      <div className="rounded-md border bg-card/60 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          Trending now
        </div>
        <div className="mt-1 font-serif text-lg font-semibold">{discoverCount}</div>
      </div>
      <div className="rounded-md border bg-card/60 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          Top reviewers
        </div>
        <div className="mt-1 font-serif text-lg font-semibold">{reviewerCount}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const debouncedQuery = useDebounce(query, 300);
  const { currentUser } = useAuth();

  const trendingType = activeTab === "all" ? "all" : activeTab;
  const { data: trendingData = [], isLoading: trendingLoading } = useQuery<any[]>({
    queryKey: ["/api/trending", trendingType],
    queryFn: async () => {
      const r = await fetch(`/api/trending/${trendingType}?limit=12`);
      const data = await r.json();
      return r.ok && Array.isArray(data) ? data : [];
    },
  });

  const isSearching = debouncedQuery.trim().length > 0;
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<any[]>({
    queryKey: ["/api/search/all", debouncedQuery, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedQuery.trim() });
      if (activeTab !== "all") params.set("type", activeTab);
      const r = await fetch(`/api/search/all?${params}`);
      const data = await r.json();
      return r.ok && Array.isArray(data) ? data : [];
    },
    enabled: isSearching,
  });

  const rawMedia = isSearching ? searchResults : trendingData;
  const media = Array.isArray(rawMedia) ? rawMedia : [];
  const mediaLoading = isSearching ? searchLoading : trendingLoading;

  const { data: popularReviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: ["/api/reviews/popular"],
  });

  const { data: favoritesData = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${currentUser?.id}/favorites`],
    enabled: !!currentUser?.id,
  });

  const { data: watchlistData = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${currentUser?.id}/watchlist`],
    enabled: !!currentUser?.id,
  });

  const { data: topReviewers = [] } = useQuery<any[]>({
    queryKey: ["/api/users/top-reviewers"],
  });

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const likeMutation = useMutation({
    mutationFn: async ({ reviewId, liked }: { reviewId: string; liked: boolean }) => {
      if (liked) {
        await apiRequest("DELETE", `/api/reviews/${reviewId}/like`);
      } else {
        await apiRequest("POST", `/api/reviews/${reviewId}/like`);
      }
    },
    onSuccess: (_, { reviewId, liked: wasLiked }) => {
      queryClient.setQueryData(["/api/reviews/popular"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((r) =>
          r.id === reviewId
            ? { ...r, likeCount: Math.max(0, (r.likeCount ?? 0) + (wasLiked ? -1 : 1)) }
            : r,
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/popular"] });
    },
  });

  const toggleLike = (reviewId: string) => {
    const currentlyLiked = likedMap[reviewId] ?? false;
    setLikedMap((p) => ({ ...p, [reviewId]: !currentlyLiked }));
    likeMutation.mutate({ reviewId, liked: currentlyLiked });
  };

  return (
    <div className="min-h-dvh bg-background">
      <TopNav query={query} setQuery={setQuery} currentUser={currentUser} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"
        >
          <section>
            <div className="glass bg-noise rounded-lg p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                    data-testid="badge-slogan"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    taste across films, animation, books, TV, music & games
                  </div>
                  <h1
                    className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
                    data-testid="text-home-title"
                  >
                    Log what you love.
                    <span className="block text-primary">Find people with your taste.</span>
                  </h1>
                  <p
                    className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground"
                    data-testid="text-home-subtitle"
                  >
                    Write short reviews, keep a watchlist, and follow friends across mediums.
                    Your profile becomes a living moodboard.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-md"
                    data-testid="button-explore"
                    asChild
                  >
                    <Link href="/discover" data-testid="link-discover">
                      Explore
                    </Link>
                  </Button>
                  <Button skeuo className="rounded-md" data-testid="button-start-review" asChild>
                    <Link href="/review/new" data-testid="link-start-review">
                      Start a review
                    </Link>
                  </Button>
                </div>
              </div>

              <Separator className="my-5" />
              <SocialProofStrip
                reviewCount={popularReviews.length}
                discoverCount={media.length}
                reviewerCount={topReviewers.length}
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-7 rounded-md bg-muted/50 p-1">
                    <TabsTrigger value="all" className="rounded-md" data-testid="tab-all">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="movie" className="rounded-md" data-testid="tab-movie">
                      Movies
                    </TabsTrigger>
                    <TabsTrigger value="anime" className="rounded-md" data-testid="tab-anime">
                      Animation
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

                <div className="flex items-center justify-between gap-2 sm:hidden">
                  <div className="text-xs text-muted-foreground" data-testid="text-results">
                    {media.length} results
                  </div>
                  <Link
                    href="/discover"
                    data-testid="link-see-all"
                    className="text-xs font-medium text-primary hover:opacity-80"
                  >
                    See all
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {mediaLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] animate-pulse rounded-md bg-muted/50"
                    />
                  ))
                ) : (
                  media.slice(0, 6).map((m: any, idx: number) => {
                    const itemId = m.id || m.externalId || `item-${idx}`;
                    return (
                      <MediaCard key={`${m.type}-${itemId}`} m={m} itemId={itemId} />
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <h2 className="font-serif text-xl font-semibold" data-testid="text-popular-title">
                    Popular reviews this week
                  </h2>
                </div>
                <Link
                  href="/discover"
                  data-testid="link-popular-more"
                  className="text-sm font-medium text-primary hover:opacity-80"
                >
                  Browse
                </Link>
              </div>

              <div className="mt-3 grid gap-3">
                {reviewsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-lg bg-muted/50"
                    />
                  ))
                ) : (
                  popularReviews.map((r: any) => {
                    const isLiked = likedMap[r.id] ?? false;
                    const likeCount = r.likeCount ?? 0;
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border bg-card p-4 sm:p-5"
                        data-testid={`card-review-${r.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Link href={`/u/${r.user.username}`} data-testid={`link-author-${r.id}`}>
                            <Avatar className="h-10 w-10 ring-1 ring-border" data-testid={`avatar-author-${r.id}`}>
                              <AvatarImage alt={r.user.displayName} src={r.user.avatarUrl ?? ""} />
                              <AvatarFallback className="bg-primary/15">
                                {r.user.displayName.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/u/${r.user.username}`}
                                    data-testid={`link-handle-${r.id}`}
                                    className="truncate text-sm font-semibold hover:opacity-80"
                                  >
                                    {r.user.displayName}
                                  </Link>
                                  <span
                                    className="text-xs text-muted-foreground"
                                    data-testid={`text-time-${r.id}`}
                                  >
                                    {relativeTime(r.createdAt)}
                                  </span>
                                </div>
                                <Link
                                  href={`/m/${r.media.id}`}
                                  data-testid={`link-reviewed-${r.id}`}
                                  className="mt-0.5 block truncate text-sm text-muted-foreground hover:text-foreground"
                                >
                                  reviewed <span className="font-medium text-foreground">{r.media.title}</span>
                                </Link>
                              </div>
                              <Stars value={r.rating} />
                            </div>

                            <p
                              className="mt-2 text-sm leading-relaxed text-foreground/90"
                              data-testid={`text-review-${r.id}`}
                            >
                              {r.body}
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                              <motion.button
                                type="button"
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-md px-0 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                  isLiked ? "text-red-500 dark:text-red-400" : "text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => toggleLike(r.id)}
                                data-testid={`button-like-${r.id}`}
                                whileTap={{ scale: 0.92 }}
                              >
                                <motion.span
                                  key={isLiked ? "liked" : "unliked"}
                                  initial={false}
                                  animate={{
                                    scale: isLiked ? [1, 1.4, 1] : 1,
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    ease: [0.34, 1.56, 0.64, 1],
                                  }}
                                >
                                  <Heart
                                    className={cn(
                                      "h-4 w-4",
                                      isLiked
                                        ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400"
                                        : "",
                                    )}
                                    strokeWidth={2}
                                  />
                                </motion.span>
                                <span
                                  className="tabular-nums"
                                  data-testid={`text-likes-${r.id}`}
                                >
                                  {likeCount}
                                </span>
                              </motion.button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-md"
                                data-testid={`button-open-${r.id}`}
                                asChild
                              >
                                <Link href={`/m/${r.media.id}`} data-testid={`link-open-${r.id}`}>
                                  Open
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="rounded-lg border border-border bg-card p-5" data-testid="card-profile-preview">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 ring-1 ring-border" data-testid="avatar-profile-preview">
                  <AvatarImage alt={currentUser?.displayName ?? "You"} src={currentUser?.avatarUrl ?? ""} />
                  <AvatarFallback className="bg-primary/15">
                    {(currentUser?.displayName ?? "A").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" data-testid="text-profile-name">
                    {currentUser?.displayName ?? "..."}
                  </div>
                  <div className="truncate text-xs text-muted-foreground" data-testid="text-profile-handle">
                    @{currentUser?.username ?? "..."}
                  </div>
                </div>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-md"
                    data-testid="button-view-profile"
                    asChild
                  >
                    <Link href={currentUser ? `/u/${currentUser.username}` : "/signin"} data-testid="link-go-profile">
                      View
                    </Link>
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border bg-card/60 p-3" data-testid="stat-reviews">
                  <div className="text-xs text-muted-foreground">Reviews</div>
                  <div className="mt-1 font-serif text-lg font-semibold">{currentUser?.reviews ?? 0}</div>
                </div>
                <div className="rounded-md border bg-card/60 p-3" data-testid="stat-followers">
                  <div className="text-xs text-muted-foreground">Followers</div>
                  <div className="mt-1 font-serif text-lg font-semibold">{currentUser?.followers ?? 0}</div>
                </div>
                <div className="rounded-md border bg-card/60 p-3" data-testid="stat-following">
                  <div className="text-xs text-muted-foreground">Following</div>
                  <div className="mt-1 font-serif text-lg font-semibold">{currentUser?.following ?? 0}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" data-testid="text-faves-title">
                    Your favorites
                  </div>
                  <Link
                    href={currentUser ? `/u/${currentUser.username}` : "/signin"}
                    data-testid="link-edit-faves"
                    className="text-xs font-medium text-primary hover:opacity-80"
                  >
                    Edit
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {favoritesData.slice(0, 4).map((m: any) => (
                    <Link key={m.id} href={`/m/${m.id}`} data-testid={`link-fave-${m.id}`}>
                      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
                        <div className={cn("media-cover relative aspect-[3/4] bg-gradient-to-br contrast-125", m.coverGradient)}>
                          {m.coverUrl && (
                            <img src={m.coverUrl} alt={m.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>

            {import.meta.env.VITE_AD_SLOT_HOME_RAIL && (
              <Card className="rounded-lg border border-border bg-card p-4" data-testid="card-ad-home">
                <AdSlot
                  slotId={import.meta.env.VITE_AD_SLOT_HOME_RAIL}
                  format="rectangle"
                  className="flex justify-center"
                />
              </Card>
            )}

            <Card className="rounded-lg border border-border bg-card p-5" data-testid="card-top-reviewers">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <div className="font-serif text-lg font-semibold" data-testid="text-top-reviewers-title">
                  Top Reviewers
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Most active members</div>

              <Separator className="my-4" />

              <div className="space-y-3">
                {topReviewers.map((reviewer: any, idx: number) => (
                  <Link key={reviewer.id} href={`/u/${reviewer.username}`} data-testid={`link-reviewer-${reviewer.id}`}>
                    <div className="flex items-center gap-3 rounded-md border bg-card/60 p-3 hover:bg-card/80 transition">
                      <div className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        idx === 0 ? "bg-amber-500/20 text-amber-500" :
                        idx === 1 ? "bg-zinc-400/20 text-zinc-400" :
                        idx === 2 ? "bg-orange-600/20 text-orange-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </div>
                      <Avatar className="h-8 w-8 ring-1 ring-border" data-testid={`avatar-reviewer-${reviewer.id}`}>
                        <AvatarImage alt={reviewer.displayName} src={reviewer.avatarUrl ?? ""} />
                        <AvatarFallback className="bg-primary/15 text-xs">
                          {reviewer.displayName?.slice(0, 1) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold" data-testid={`text-reviewer-name-${reviewer.id}`}>
                          {reviewer.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{reviewer.username}
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full" data-testid={`badge-review-count-${reviewer.id}`}>
                        {reviewer.reviewCount} reviews
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="rounded-lg border border-border bg-card p-5" data-testid="card-watchlist-preview">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-watchlist-title">
                    Watchlist
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-watchlist-subtitle">
                    Save things for later.
                  </div>
                </div>
                <Link
                  href="/watchlist"
                  data-testid="link-watchlist"
                  className="text-sm font-medium text-primary hover:opacity-80"
                >
                  Open
                </Link>
              </div>

              <Separator className="my-4" />

              <ScrollArea className="h-[280px] pr-3" data-testid="scroll-watchlist">
                <div className="space-y-2">
                  {watchlistData.slice(0, 5).map((m: any) => (
                    <Link key={m.id} href={`/m/${m.id}`} data-testid={`row-watchlist-${m.id}`}>
                      <div className="flex items-center gap-3 rounded-md border bg-card/60 p-3 hover:bg-card/80 transition">
                        <div className="media-cover relative h-10 w-10 overflow-hidden rounded-md border bg-card shadow-sm">
                          <div className={cn("h-full w-full bg-gradient-to-br contrast-125", m.coverGradient)} />
                          {m.coverUrl && (
                            <img src={m.coverUrl} alt={m.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" data-testid={`text-watchlist-title-${m.id}`}>
                            {m.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground" data-testid={`text-watchlist-meta-${m.id}`}>
                            {m.creator}
                          </div>
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                          {m.type}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </aside>
        </motion.div>

        <Footer className="mt-8" />
      </main>

      <BottomNav />
    </div>
  );
}
