import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Clapperboard,
  Film,
  Gamepad2,
  Heart,
  Music,
  Share2,
  Star,
  Tv2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MediaType = "movie" | "anime" | "book" | "tv" | "music" | "game";

function iconFor(type: MediaType) {
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
    <div className="flex items-center gap-0.5" data-testid="rating-stars">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const active = idx <= full;
        const halfActive = !active && half && idx === full + 1;
        return (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
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

function StarRatingSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" data-testid="star-rating-selector">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          data-testid={`button-star-${n}`}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              n <= value
                ? "fill-primary text-primary"
                : "text-muted-foreground/35 hover:text-primary/50",
            )}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  );
}

export default function MediaDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState("");
  const [draftRating, setDraftRating] = useState(0);
  const { currentUser } = useAuth();

  const { data: media, isLoading: mediaLoading } = useQuery<any>({
    queryKey: ["/api/media", id],
    enabled: !!id,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/media/${id}/reviews`],
    enabled: !!id,
  });

  const { data: watchlistStatus } = useQuery<{ onWatchlist: boolean }>({
    queryKey: [`/api/users/${currentUser?.id}/watchlist/check/${id}`],
    enabled: !!currentUser?.id && !!id,
  });

  const saved = watchlistStatus?.onWatchlist ?? false;

  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      if (saved) {
        await apiRequest("DELETE", `/api/users/${currentUser.id}/watchlist/${id}`);
      } else {
        await apiRequest("POST", `/api/users/${currentUser.id}/watchlist/${id}`);
      }
    },
    onSuccess: () => {
      if (currentUser) queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/watchlist/check/${id}`] });
    },
  });

  const postReview = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reviews", {
        mediaId: id,
        rating: draftRating,
        body: draft,
      });
    },
    onSuccess: () => {
      setDraft("");
      setDraftRating(0);
      queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/reviews`] });
    },
  });

  const likeReview = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("POST", `/api/reviews/${reviewId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/reviews`] });
    },
  });

  const unlikeReview = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/reviews`] });
    },
  });

  if (mediaLoading || !media) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground" data-testid="loading-media">Loading…</div>
      </div>
    );
  }

  const Icon = iconFor(media.type as MediaType);
  const ratingNum = media.rating ? parseFloat(media.rating) : null;
  const topReviews = [...reviews].sort((a: any, b: any) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
  const newReviews = [...reviews];

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
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-media-title">
              {media.title}
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-media-meta">
              {media.creator}
              {media.year ? ` · ${media.year}` : ""}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={saved ? "default" : "secondary"}
              className="rounded-md"
              data-testid="button-save"
              onClick={() => toggleWatchlist.mutate()}
              disabled={!currentUser}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              {saved ? "Saved" : "Watchlist"}
            </Button>
            <Button variant="secondary" className="rounded-md" data-testid="button-share">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"
        >
          <section>
            <Card className="glass bg-noise rounded-lg p-5 sm:p-7" data-testid="card-media-hero">
              <div className="flex items-start gap-4">
                <div
                  className="relative h-40 w-28 overflow-hidden rounded-lg border bg-card shadow-sm"
                  data-testid="img-media-cover"
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br grayscale contrast-125", media.coverGradient)} />
                  {media.coverUrl && (
                    <img src={media.coverUrl} alt={media.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
                    <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-serif text-2xl font-semibold" data-testid="text-title">
                        {media.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full" data-testid="badge-type">
                          {media.type}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full" data-testid="badge-year">
                          {media.year}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full" data-testid="badge-creator">
                          {media.creator}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-md border bg-card/60 px-3 py-2" data-testid="box-rating">
                      <div className="text-xs text-muted-foreground">Avg rating</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="font-serif text-lg font-semibold">
                          {ratingNum != null ? ratingNum.toFixed(1) : "N/A"}
                        </div>
                        {ratingNum != null && <Stars value={ratingNum} />}
                      </div>
                    </div>
                  </div>

                  {media.synopsis && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-testid="text-synopsis">
                      {media.synopsis}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {(media.tags ?? []).map((t: string) => (
                      <Badge key={t} variant="secondary" className="rounded-full" data-testid={`badge-tag-${t}`}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-lg border border-border bg-card mt-4 p-5 sm:p-7" data-testid="card-write">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-write-title">
                    Write a quick review
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-write-subtitle">
                    Small, honest, specific.
                  </div>
                </div>
                <Link
                  href="/review/new"
                  data-testid="link-full-editor"
                  className="text-sm font-medium text-primary hover:opacity-80"
                >
                  Full editor
                </Link>
              </div>

              <Separator className="my-4" />

              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Your rating:</span>
                <StarRatingSelector value={draftRating} onChange={setDraftRating} />
              </div>

              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What did it taste like?"
                className="min-h-[110px] rounded-md"
                data-testid="input-quick-review"
              />

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground" data-testid="text-draft-hint">
                  Tip: mention a scene / line / moment.
                </div>
                <Button
                  className="rounded-md"
                  data-testid="button-post-quick"
                  disabled={!draft.trim() || draftRating === 0 || !currentUser || postReview.isPending}
                  onClick={() => postReview.mutate()}
                >
                  Post
                </Button>
              </div>
            </Card>
          </section>

          <section>
            <Card className="rounded-lg border border-border bg-card p-5 sm:p-7" data-testid="card-reviews">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-reviews-title">
                    Reviews
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-reviews-subtitle">
                    From people you follow and beyond.
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <Tabs defaultValue="top">
                <TabsList className="grid w-full grid-cols-2 rounded-md bg-muted/50 p-1">
                  <TabsTrigger value="top" className="rounded-md" data-testid="tab-top">
                    Top
                  </TabsTrigger>
                  <TabsTrigger value="new" className="rounded-md" data-testid="tab-new">
                    New
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="top" className="mt-4 space-y-3">
                  {reviewsLoading ? (
                    <div className="text-center text-sm text-muted-foreground p-4" data-testid="loading-reviews">Loading reviews…</div>
                  ) : topReviews.length === 0 ? (
                    <div className="rounded-lg border bg-card/60 p-10 text-center" data-testid="empty-top">
                      <div className="font-serif text-xl font-semibold">No reviews yet.</div>
                      <p className="mt-2 text-sm text-muted-foreground">Be the first to share your thoughts.</p>
                    </div>
                  ) : topReviews.map((r: any) => (
                    <ReviewCard key={r.id} r={r} currentUser={currentUser} onLike={likeReview} onUnlike={unlikeReview} />
                  ))}
                </TabsContent>

                <TabsContent value="new" className="mt-4 space-y-3">
                  {reviewsLoading ? (
                    <div className="text-center text-sm text-muted-foreground p-4" data-testid="loading-reviews-new">Loading reviews…</div>
                  ) : newReviews.length === 0 ? (
                    <div className="rounded-lg border bg-card/60 p-10 text-center" data-testid="empty-new">
                      <div className="font-serif text-xl font-semibold">No reviews yet.</div>
                      <p className="mt-2 text-sm text-muted-foreground">Be the first to share your thoughts.</p>
                    </div>
                  ) : newReviews.map((r: any) => (
                    <ReviewCard key={r.id} r={r} currentUser={currentUser} onLike={likeReview} onUnlike={unlikeReview} />
                  ))}
                </TabsContent>
              </Tabs>
            </Card>
          </section>
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

function ReviewCard({ r, currentUser, onLike, onUnlike }: { r: any; currentUser: any; onLike: any; onUnlike: any }) {
  const [liked, setLiked] = useState(false);

  const handleLikeToggle = () => {
    if (liked) {
      onUnlike.mutate(r.id);
      setLiked(false);
    } else {
      onLike.mutate(r.id);
      setLiked(true);
    }
  };

  return (
    <Card key={r.id} className="rounded-lg border bg-card/60 p-4" data-testid={`card-review-${r.id}`}>
      <div className="flex items-start gap-3">
        <Link href={`/u/${r.user.username}`} data-testid={`link-review-author-${r.id}`}>
          <Avatar className="h-10 w-10 ring-1 ring-border" data-testid={`avatar-review-${r.id}`}>
            <AvatarImage alt={r.user.displayName} src={r.user.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/15">
              {r.user.displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold" data-testid={`text-author-${r.id}`}>
                  {r.user.displayName}
                </div>
                <Badge variant="secondary" className="rounded-full" data-testid={`badge-rating-${r.id}`}>
                  {r.rating}★
                </Badge>
              </div>
            </div>
            <Button
              size="sm"
              variant={liked ? "default" : "secondary"}
              className="rounded-md"
              data-testid={`button-like-review-${r.id}`}
              onClick={handleLikeToggle}
              disabled={!currentUser}
            >
              <Heart className="mr-2 h-4 w-4" />
              {liked ? "Liked" : "Like"}
              <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {r.likeCount ?? 0}
              </span>
            </Button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-foreground/90" data-testid={`text-review-${r.id}`}>
            {r.body}
          </p>
        </div>
      </div>
    </Card>
  );
}
