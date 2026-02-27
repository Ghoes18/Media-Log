import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  Star,
  Tv2,
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRatingSelector } from "@/components/star-rating-selector";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const active = idx <= full;
        const halfActive = !active && half && idx === full + 1;
        return halfActive ? (
          <span key={i} className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <Star className="h-4 w-4 text-muted-foreground/35" strokeWidth={2} />
            <span className="absolute inset-0 w-1/2 overflow-hidden">
              <Star className="h-4 w-4 min-w-[16px] fill-amber-500 text-amber-500" strokeWidth={0} />
            </span>
          </span>
        ) : (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              active ? "fill-amber-500 text-amber-500" : "text-muted-foreground/35",
            )}
            strokeWidth={2}
          />
        );
      })}
    </div>
  );
}

function ReviewCard({
  r,
  currentUser,
  onLike,
  onUnlike,
}: {
  r: any;
  currentUser: any;
  onLike: any;
  onUnlike: any;
}) {
  const { data: liked } = useQuery<{ liked: boolean }>({
    queryKey: [`/api/reviews/${r.id}/liked/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });
  const isLiked = liked?.liked ?? false;

  const handleLikeToggle = () => {
    if (isLiked) {
      onUnlike.mutate(r.id);
    } else {
      onLike.mutate(r.id);
    }
  };

  return (
    <Card className="rounded-lg border bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <Link href={`/u/${r.user.username}`}>
          <Avatar className="h-10 w-10 ring-1 ring-border">
            <AvatarImage alt={r.user.displayName} src={r.user.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/15">{r.user.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold">{r.user.displayName}</div>
                <Badge variant="secondary" className="rounded-full">
                  {r.rating}★
                </Badge>
              </div>
            </div>
            <motion.button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-0 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isLiked ? "text-red-500 dark:text-red-400" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={handleLikeToggle}
              disabled={!currentUser}
              whileTap={{ scale: 0.92 }}
            >
              <motion.span
                key={isLiked ? "liked" : "unliked"}
                initial={false}
                animate={{ scale: isLiked ? [1, 1.4, 1] : 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isLiked ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400" : "",
                  )}
                  strokeWidth={2}
                />
              </motion.span>
              <span className="tabular-nums">{r.likeCount ?? 0}</span>
            </motion.button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.body}</p>
        </div>
      </div>
    </Card>
  );
}

export default function EpisodeDetail() {
  const params = useParams<{ id: string; season: string; episode: string }>();
  const id = params.id ?? "";
  const seasonNumber = Number.parseInt(params.season ?? "1", 10);
  const episodeNumber = Number.parseInt(params.episode ?? "1", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const [draft, setDraft] = useState("");
  const [draftRating, setDraftRating] = useState(0);

  const { data: media, isLoading: mediaLoading } = useQuery<any>({
    queryKey: ["/api/media", id],
    enabled: !!id,
  });

  const { data: seasonDetails, isLoading: seasonLoading } = useQuery<any>({
    queryKey: ["/api/tmdb/tv/season", media?.externalId || "", seasonNumber],
    queryFn: () =>
      fetch(`/api/tmdb/tv/${media.externalId}/season/${seasonNumber}`).then((r) => r.json()),
    enabled: !!media?.externalId && (media?.type === "tv" || media?.type === "anime"),
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/media/${id}/reviews`, "episode", seasonNumber, episodeNumber],
    queryFn: () =>
      fetch(`/api/media/${id}/reviews?season=${seasonNumber}&episode=${episodeNumber}`).then((r) => r.json()),
    enabled: !!id,
  });

  const episode = seasonDetails?.episodes?.find((ep: any) => ep.episodeNumber === episodeNumber);

  const postReview = useMutation({
    mutationFn: async (payload: { body: string; rating: number }) => {
      await apiRequest("POST", "/api/reviews", {
        mediaId: id,
        rating: payload.rating,
        body: payload.body,
        seasonNumber,
        episodeNumber,
      });
    },
    onSuccess: () => {
      setDraft("");
      setDraftRating(0);
      queryClient.invalidateQueries({
        queryKey: [`/api/media/${id}/reviews`, "episode", seasonNumber, episodeNumber],
      });
    },
  });

  const likeReview = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("POST", `/api/reviews/${reviewId}/like`);
    },
    onSuccess: (_, reviewId) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/media/${id}/reviews`, "episode", seasonNumber, episodeNumber],
      });
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: [`/api/reviews/${reviewId}/liked/${currentUser.id}`],
        });
      }
    },
  });

  const unlikeReview = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}/like`);
    },
    onSuccess: (_, reviewId) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/media/${id}/reviews`, "episode", seasonNumber, episodeNumber],
      });
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: [`/api/reviews/${reviewId}/liked/${currentUser.id}`],
        });
      }
    },
  });

  const isLoading = mediaLoading || seasonLoading;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const episodeLabel = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
  const tmdbRating = episode?.voteAverage ?? 0;
  const tmdbRatingOnFive = tmdbRating / 2;
  const platformAvg =
    reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : null;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-md"
            onClick={() => navigate(`/m/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-base font-semibold">
              {episode?.name || episodeLabel}
            </h1>
            {media && (
              <Link
                href={`/m/${id}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Tv2 className="h-3 w-3" />
                {media.title}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-8">
            {/* Hero: episode still */}
            {episode?.stillUrl ? (
              <div className="relative overflow-hidden rounded-xl border bg-muted aspect-video">
                <img
                  src={episode.stillUrl}
                  alt={episode.name || episodeLabel}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="text-xs font-medium text-white/70 mb-1">{episodeLabel}</div>
                  <h2 className="font-serif text-2xl font-bold text-white drop-shadow-lg">
                    {episode.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
                    {episode.airDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {episode.airDate}
                      </span>
                    )}
                    {episode.runtime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {episode.runtime}m
                      </span>
                    )}
                    {platformAvg != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {platformAvg.toFixed(1)}
                      </span>
                    )}
                    {tmdbRating > 0 && (
                      <span className="flex items-center gap-1 text-white/60">
                        <span className="text-white/50">TMDB</span> {tmdbRating.toFixed(1)}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* No still: plain header block */
              <div className="rounded-xl border bg-card p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {episodeLabel}
                </div>
                <h2 className="font-serif text-2xl font-bold">{episode?.name || episodeLabel}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {episode?.airDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {episode.airDate}
                    </span>
                  )}
                  {episode?.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {episode.runtime}m
                    </span>
                  )}
                  {platformAvg != null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {platformAvg.toFixed(1)}
                    </span>
                  )}
                  {tmdbRating > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground/80">
                      <span className="text-muted-foreground/60">TMDB</span> {tmdbRating.toFixed(1)}/10
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Synopsis */}
            {episode?.overview && (
              <section>
                <h3 className="font-serif text-lg font-semibold mb-2">Synopsis</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{episode.overview}</p>
              </section>
            )}

            {/* Episode not found yet */}
            {!seasonLoading && !episode && (
              <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
                <Tv2 className="mx-auto h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">Episode details not available.</p>
              </div>
            )}

            {/* Reviews section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold">Reviews</h3>
                <span className="text-xs text-muted-foreground">
                  {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>

              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-lg border bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No reviews for this episode yet. Be the first!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <ReviewCard
                      key={r.id}
                      r={r}
                      currentUser={currentUser}
                      onLike={likeReview}
                      onUnlike={unlikeReview}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar: write a review */}
          <aside className="space-y-4">
            <Card className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <div className="font-serif text-base font-semibold">Write a Review</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {episodeLabel}{episode?.name ? ` — ${episode.name}` : ""}
                </div>
              </div>

              {!currentUser && (
                <div className="rounded-md bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                  <Link href="/signin" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to write a review.
                </div>
              )}

              {currentUser && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Your rating</span>
                    <StarRatingSelector value={draftRating} onChange={setDraftRating} />
                  </div>

                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="What stood out in this episode?"
                    className="min-h-[110px] rounded-md resize-none"
                  />

                  {tmdbRating > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">TMDB rating</span>
                      <Stars value={tmdbRatingOnFive} />
                      <span className="font-medium tabular-nums">{tmdbRating.toFixed(1)}</span>
                    </div>
                  )}

                  <Button
                    skeuo
                    className="w-full rounded-md"
                    disabled={!draft.trim() || draftRating === 0 || postReview.isPending}
                    onClick={() => postReview.mutate({ body: draft, rating: draftRating })}
                  >
                    Post Review
                  </Button>
                </>
              )}
            </Card>

            {/* Navigation: prev / next episode */}
            {seasonDetails?.episodes && seasonDetails.episodes.length > 1 && (
              <Card className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Other Episodes
                </div>
                <div className="flex gap-2">
                  {(() => {
                    const eps: any[] = seasonDetails.episodes;
                    const currentIdx = eps.findIndex((ep: any) => ep.episodeNumber === episodeNumber);
                    const prev = currentIdx > 0 ? eps[currentIdx - 1] : null;
                    const next = currentIdx < eps.length - 1 ? eps[currentIdx + 1] : null;
                    return (
                      <>
                        {prev && (
                          <Link
                            href={`/m/${id}/s/${seasonNumber}/e/${prev.episodeNumber}`}
                            className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-center hover:bg-muted/60 transition-colors"
                          >
                            ← E{prev.episodeNumber}
                            <div className="truncate text-muted-foreground mt-0.5">{prev.name}</div>
                          </Link>
                        )}
                        {next && (
                          <Link
                            href={`/m/${id}/s/${seasonNumber}/e/${next.episodeNumber}`}
                            className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-center hover:bg-muted/60 transition-colors"
                          >
                            E{next.episodeNumber} →
                            <div className="truncate text-muted-foreground mt-0.5">{next.name}</div>
                          </Link>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Card>
            )}

            {/* Back to show */}
            <Button
              variant="outline"
              className="w-full rounded-md"
              asChild
            >
              <Link href={`/m/${id}`}>
                <Tv2 className="h-4 w-4 mr-2" />
                Back to {media?.title || "Show"}
              </Link>
            </Button>
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
