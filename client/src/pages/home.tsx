import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clapperboard,
  Film,
  Heart,
  Plus,
  Search,
  Star,
  Tv2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { ThemeToggle } from "@/components/theme-toggle";
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

type MediaType = "movie" | "anime" | "book" | "tv";

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
        return (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              active
                ? "fill-primary text-primary"
                : halfActive
                  ? "fill-primary/50 text-primary/60"
                  : "text-muted-foreground/35",
            )}
            strokeWidth={2}
          />
        );
      })}
    </div>
  );
}

function Cover({ m }: { m: any }) {
  const Icon = mediaIcon(m.type as MediaType);
  const displayRating = m.rating ? parseFloat(m.rating) : null;
  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-card shadow-sm",
        "bg-noise",
      )}
      data-testid={`cover-${m.id}`}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", m.coverGradient)} />
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
              <Star className="h-3.5 w-3.5 fill-white/90 text-white/90" />
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
    <div className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" data-testid="link-home" className="group flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary/18 via-primary/8 to-accent/14 ring-1 ring-border ring-soft">
            <span className="font-serif text-lg font-semibold text-gradient">T</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-serif text-[15px] font-semibold leading-tight">Tastelog</div>
            <div className="text-xs text-muted-foreground">Your taste, across mediums</div>
          </div>
        </Link>

        <div className="ml-auto hidden w-[420px] max-w-full items-center gap-2 rounded-2xl border bg-card/60 px-3 py-2 shadow-sm backdrop-blur sm:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, anime, books, TV…"
            className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            data-testid="input-search"
          />
          <Badge variant="secondary" className="rounded-full">
            ⌘K
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button size="sm" className="rounded-xl" data-testid="button-log" asChild>
            <Link href="/review/new" data-testid="link-new-review">
              Log
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-xl sm:hidden"
                data-testid="button-open-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="p-0">
              <SheetHeader className="px-4 pt-4">
                <SheetTitle className="font-serif">Search</SheetTitle>
                <SheetDescription>
                  Find something to review, save, or browse.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
                <div className="mt-3 flex items-center gap-2 rounded-2xl border bg-card px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search films, anime, books, TV…"
                    className="h-9 rounded-xl"
                    data-testid="input-search-mobile"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href={`/u/${currentUser?.username ?? "alice"}`} data-testid="link-profile" className="grid place-items-center">
            <Avatar className="h-9 w-9 ring-1 ring-border" data-testid="avatar-you">
              <AvatarImage alt={currentUser?.displayName ?? "You"} src={currentUser?.avatarUrl ?? ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                {(currentUser?.displayName ?? "A").slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          </Link>
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

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/username/alice"],
  });

  const { data: mediaData = [], isLoading: mediaLoading } = useQuery<any[]>({
    queryKey: ["/api/media", activeTab],
    queryFn: () =>
      fetch(activeTab === "all" ? "/api/media" : `/api/media?type=${activeTab}`).then((r) =>
        r.json(),
      ),
  });

  const { data: reviewsData = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: ["/api/reviews/recent"],
  });

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const likeMutation = useMutation({
    mutationFn: async ({ reviewId, liked }: { reviewId: string; liked: boolean }) => {
      if (liked) {
        await apiRequest("DELETE", `/api/reviews/${reviewId}/like`, {
          userId: currentUser?.id,
        });
      } else {
        await apiRequest("POST", `/api/reviews/${reviewId}/like`, {
          userId: currentUser?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/recent"] });
    },
  });

  const media = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mediaData;
    return mediaData.filter((m: any) =>
      [m.title, m.creator, m.year].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [query, mediaData]);

  const toggleLike = (reviewId: string) => {
    const currentlyLiked = likedMap[reviewId] ?? false;
    setLikedMap((p) => ({ ...p, [reviewId]: !currentlyLiked }));
    likeMutation.mutate({ reviewId, liked: currentlyLiked });
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/30">
      <TopNav query={query} setQuery={setQuery} currentUser={currentUser} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"
        >
          <section>
            <div className="glass bg-noise rounded-3xl p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                    data-testid="badge-slogan"
                  >
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    taste across films, anime, books & TV
                  </div>
                  <h1
                    className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
                    data-testid="text-home-title"
                  >
                    Log what you love.
                    <span className="block text-gradient">Find people with your taste.</span>
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
                    className="rounded-xl"
                    data-testid="button-explore"
                    asChild
                  >
                    <Link href="/discover" data-testid="link-discover">
                      Explore
                    </Link>
                  </Button>
                  <Button className="rounded-xl" data-testid="button-start-review" asChild>
                    <Link href="/review/new" data-testid="link-start-review">
                      Start a review
                    </Link>
                  </Button>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-muted/50 p-1">
                    <TabsTrigger value="all" className="rounded-xl" data-testid="tab-all">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="movie" className="rounded-xl" data-testid="tab-movie">
                      Movies
                    </TabsTrigger>
                    <TabsTrigger value="anime" className="rounded-xl" data-testid="tab-anime">
                      Anime
                    </TabsTrigger>
                    <TabsTrigger value="book" className="rounded-xl" data-testid="tab-book">
                      Books
                    </TabsTrigger>
                    <TabsTrigger value="tv" className="rounded-xl" data-testid="tab-tv">
                      TV
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
                      className="aspect-[3/4] animate-pulse rounded-xl bg-muted/50"
                    />
                  ))
                ) : (
                  media.slice(0, 6).map((m: any) => (
                    <Link
                      key={m.id}
                      href={`/m/${m.id}`}
                      data-testid={`link-media-${m.id}`}
                      className="group"
                    >
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl"
                      >
                        <Cover m={m} />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {(m.tags ?? []).slice(0, 3).map((t: string) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="rounded-full"
                              data-testid={`badge-tag-${m.id}-${t}`}
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between">
                <h2 className="font-serif text-xl font-semibold" data-testid="text-activity-title">
                  Recent activity
                </h2>
                <Link
                  href="/discover"
                  data-testid="link-activity-more"
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
                      className="h-32 animate-pulse rounded-3xl bg-muted/50"
                    />
                  ))
                ) : (
                  reviewsData.map((r: any) => {
                    const isLiked = likedMap[r.id] ?? false;
                    const likeCount = r.likeCount + (isLiked ? 1 : 0);
                    return (
                      <Card
                        key={r.id}
                        className="glass bg-noise rounded-3xl p-4 sm:p-5"
                        data-testid={`card-review-${r.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Link href={`/u/${r.user.username}`} data-testid={`link-author-${r.id}`}>
                            <Avatar className="h-10 w-10 ring-1 ring-border" data-testid={`avatar-author-${r.id}`}>
                              <AvatarImage alt={r.user.displayName} src={r.user.avatarUrl ?? ""} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
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
                              <Button
                                variant={isLiked ? "default" : "secondary"}
                                size="sm"
                                className={cn(
                                  "rounded-xl",
                                  isLiked && "bg-primary/20 text-foreground border border-border",
                                )}
                                onClick={() => toggleLike(r.id)}
                                data-testid={`button-like-${r.id}`}
                              >
                                <Heart
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isLiked
                                      ? "fill-primary text-primary"
                                      : "text-muted-foreground",
                                  )}
                                  strokeWidth={2}
                                />
                                {isLiked ? "Liked" : "Like"}
                                <span
                                  className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10"
                                  data-testid={`text-likes-${r.id}`}
                                >
                                  {likeCount}
                                </span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl"
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
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="glass bg-noise rounded-3xl p-5" data-testid="card-profile-preview">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 ring-1 ring-border" data-testid="avatar-profile-preview">
                  <AvatarImage alt={currentUser?.displayName ?? "You"} src={currentUser?.avatarUrl ?? ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
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
                    className="rounded-xl"
                    data-testid="button-view-profile"
                    asChild
                  >
                    <Link href={`/u/${currentUser?.username ?? "alice"}`} data-testid="link-go-profile">
                      View
                    </Link>
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border bg-card/60 p-3" data-testid="stat-reviews">
                  <div className="text-xs text-muted-foreground">Reviews</div>
                  <div className="mt-1 font-serif text-lg font-semibold">{currentUser?.reviews ?? 0}</div>
                </div>
                <div className="rounded-2xl border bg-card/60 p-3" data-testid="stat-followers">
                  <div className="text-xs text-muted-foreground">Followers</div>
                  <div className="mt-1 font-serif text-lg font-semibold">{currentUser?.followers ?? 0}</div>
                </div>
                <div className="rounded-2xl border bg-card/60 p-3" data-testid="stat-following">
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
                    href={`/u/${currentUser?.username ?? "alice"}`}
                    data-testid="link-edit-faves"
                    className="text-xs font-medium text-primary hover:opacity-80"
                  >
                    Edit
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {mediaData.slice(0, 4).map((m: any) => (
                    <Link key={m.id} href={`/m/${m.id}`} data-testid={`link-fave-${m.id}`}>
                      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className={cn("aspect-[3/4] bg-gradient-to-br", m.coverGradient)} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="glass bg-noise rounded-3xl p-5" data-testid="card-watchlist-preview">
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
                  {mediaData.slice(1, 6).map((m: any) => (
                    <Link key={m.id} href={`/m/${m.id}`} data-testid={`row-watchlist-${m.id}`}>
                      <div className="flex items-center gap-3 rounded-2xl border bg-card/60 p-3 hover:bg-card/80 transition">
                        <div className="h-10 w-10 overflow-hidden rounded-xl border bg-card shadow-sm">
                          <div className={cn("h-full w-full bg-gradient-to-br", m.coverGradient)} />
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
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" data-testid="nav-home" className="text-sm font-medium hover:opacity-80">
            Home
          </Link>
          <Link
            href="/discover"
            data-testid="nav-discover"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
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
            href={`/u/${currentUser?.username ?? "alice"}`}
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
