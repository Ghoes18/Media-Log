import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/use-subscription";
import { useEnsureMedia } from "@/lib/use-ensure-media";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronDown,
  Clapperboard,
  Eye,
  Film,
  Gamepad2,
  Heart,
  List,
  Music,
  Play,
  Share2,
  Star,
  Tv2,
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StarRatingSelector } from "@/components/star-rating-selector";
import { AdSlot } from "@/components/ads/AdSlot";
import { AffiliateLinksCard } from "@/components/ads/AffiliateLinksCard";
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

function RatingHistogram({
  reviews,
}: {
  reviews: { rating: number }[];
}) {
  const buckets = new Array(10).fill(0) as number[];

  for (const r of reviews) {
    const val = r.rating;
    const bucketIdx = Math.max(0, Math.min(9, Math.round(val * 2) - 1));
    buckets[bucketIdx]++;
  }

  const totalCount = reviews.length;
  const maxVal = Math.max(...buckets);
  const avg = totalCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount : 0;

  if (totalCount === 0) return null;

  return (
    <div className="mt-6 flex flex-col max-w-[320px]">
      <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-3">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/80 uppercase">Ratings</span>
        <span className="text-[11px] font-medium tracking-widest text-muted-foreground/80 uppercase">
          {totalCount.toLocaleString()} {totalCount === 1 ? "Member" : "Members"}
        </span>
      </div>
      
      <div className="flex items-end gap-5">
        <div className="flex flex-col flex-1">
          <div className="flex items-end gap-1 h-12">
            {buckets.map((val, i) => {
              const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
              const starLabel = (i + 1) * 0.5;
              return (
                <div
                  key={i}
                  className="group relative flex-1 flex flex-col justify-end h-full"
                >
                  <div 
                    className={cn(
                      "w-full transition-colors duration-200 rounded-sm",
                      val > 0
                        ? "bg-slate-500/30 dark:bg-slate-400/30 hover:bg-emerald-500 dark:hover:bg-emerald-400"
                        : "bg-slate-500/10 dark:bg-slate-400/10"
                    )}
                    style={{ height: `${val > 0 ? Math.max(8, heightPct) : 4}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-10">
                    <div className="bg-popover text-popover-foreground text-[10px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap border border-border/50">
                      <span className="text-emerald-500 dark:text-emerald-400 mr-1">★</span> {starLabel} <span className="text-muted-foreground ml-1">{val.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-emerald-500 dark:text-emerald-400">
            <Star className="h-3 w-3 fill-current" />
            <div className="h-px flex-1 mx-2 bg-border/40" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-end pb-0.5">
          <span className="font-serif text-3xl font-medium leading-none text-foreground/90 mb-1.5">
            {avg.toFixed(1)}
          </span>
          <div className="flex gap-0.5 text-emerald-500 dark:text-emerald-400">
            {[...Array(5)].map((_, i) => {
              const isFull = i + 1 <= Math.floor(avg);
              const isHalf = !isFull && i < avg;
              return (
                <div key={i} className="relative h-3 w-3">
                  <Star className="absolute inset-0 h-3 w-3 text-emerald-500/20 dark:text-emerald-400/20" strokeWidth={2} />
                  {isFull && <Star className="absolute inset-0 h-3 w-3 fill-current" strokeWidth={0} />}
                  {isHalf && (
                    <div className="absolute inset-0 w-1/2 overflow-hidden">
                      <Star className="h-3 w-3 min-w-[12px] fill-current" strokeWidth={0} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const TMDB_TYPES = ["movie", "tv", "anime"] as const;

/** IMDb-style logo (black bar + yellow text) for use when showing IMDb classification. */
function ImdbLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-0.5 rounded px-1.5 font-bold text-[10px] tracking-tight text-amber-400 bg-black", className)}
      aria-hidden
    >
      <span className="text-[11px] leading-none">IMDb</span>
    </span>
  );
}

export default function MediaDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState("");
  const [draftRating, setDraftRating] = useState(0);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState<number | null>(null);
  const { currentUser } = useAuth();
  const { isPro } = useSubscription();
  const { ensureAndNavigate } = useEnsureMedia();

  const { data: media, isLoading: mediaLoading } = useQuery<any>({
    queryKey: ["/api/media", id],
    enabled: !!id,
  });

  const { data: richDetails } = useQuery<any>({
    queryKey: [
      "/api/details",
      media?.type || "",
      media?.externalId ? encodeURIComponent(String(media.externalId)) : "",
    ],
    enabled: !!media?.externalId && !!media?.type,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/media/${id}/reviews`],
    enabled: !!id,
  });

  const { data: selectedSeasonDetails, isLoading: seasonDetailsLoading } = useQuery<any>({
    queryKey: ["/api/tmdb/tv/season", media?.externalId || "", selectedSeasonNumber ?? -1],
    queryFn: () =>
      fetch(`/api/tmdb/tv/${media.externalId}/season/${selectedSeasonNumber}`).then((r) => r.json()),
    enabled:
      !!media?.externalId &&
      (media?.type === "tv" || media?.type === "anime") &&
      selectedSeasonNumber != null,
  });

  const { data: episodeReviews = [], isLoading: episodeReviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/media/${id}/reviews`, "episode", selectedSeasonNumber ?? -1, selectedEpisodeNumber ?? -1],
    queryFn: () =>
      fetch(`/api/media/${id}/reviews?season=${selectedSeasonNumber}&episode=${selectedEpisodeNumber}`).then((r) =>
        r.json(),
      ),
    enabled: !!id && selectedSeasonNumber != null && selectedEpisodeNumber != null,
  });

  const { data: allSeasonsData = [] } = useQuery<any[]>({
    queryKey: ["/api/tmdb/tv/all-seasons", media?.externalId || ""],
    queryFn: () =>
      fetch(`/api/tmdb/tv/${media.externalId}/all-seasons`).then((r) => r.json()),
    enabled:
      !!media?.externalId &&
      (media?.type === "tv" || media?.type === "anime"),
    staleTime: 10 * 60 * 1000,
  });

  const [, navigate] = useLocation();

  const { data: stats = { watched: 0, likes: 0, listed: 0 } } = useQuery<any>({
    queryKey: [`/api/media/${id}/stats`],
    enabled: !!id,
  });

  const { data: watchlistStatus } = useQuery<{ onWatchlist: boolean }>({
    queryKey: [`/api/users/${currentUser?.id}/watchlist/check/${id}`],
    enabled: !!currentUser?.id && !!id,
  });

  const { data: likedStatus } = useQuery<{ liked: boolean }>({
    queryKey: [`/api/users/${currentUser?.id}/like-media/check/${id}`],
    enabled: !!currentUser?.id && !!id,
  });

  const { data: watchedStatus } = useQuery<{ watched: boolean }>({
    queryKey: [`/api/users/${currentUser?.id}/watched/check/${id}`],
    enabled: !!currentUser?.id && !!id,
  });

  const saved = watchlistStatus?.onWatchlist ?? false;
  const liked = likedStatus?.liked ?? false;
  const watched = watchedStatus?.watched ?? false;

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
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/watchlist/check/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/stats`] });
      }
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      if (liked) {
        await apiRequest("DELETE", `/api/users/${currentUser.id}/like-media/${id}`);
      } else {
        await apiRequest("POST", `/api/users/${currentUser.id}/like-media/${id}`);
      }
    },
    onSuccess: () => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/like-media/check/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/stats`] });
      }
    },
  });

  const toggleWatched = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      if (watched) {
        await apiRequest("DELETE", `/api/users/${currentUser.id}/watched/${id}`);
      } else {
        await apiRequest("POST", `/api/users/${currentUser.id}/watched/${id}`);
      }
    },
    onSuccess: () => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/watched/check/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/stats`] });
      }
    },
  });

  const postReview = useMutation({
    mutationFn: async (payload: {
      body: string;
      rating: number;
      seasonNumber?: number;
      episodeNumber?: number;
    }) => {
      await apiRequest("POST", "/api/reviews", {
        mediaId: id,
        rating: payload.rating,
        body: payload.body,
        seasonNumber: payload.seasonNumber,
        episodeNumber: payload.episodeNumber,
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
    onSuccess: (_, reviewId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/reviews`] });
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/reviews/${reviewId}/liked/${currentUser.id}`] });
      }
    },
  });

  const unlikeReview = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}/like`);
    },
    onSuccess: (_, reviewId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/media/${id}/reviews`] });
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/reviews/${reviewId}/liked/${currentUser.id}`] });
      }
    },
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: media?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const mediaType = media?.type as MediaType | undefined;
  const isTvLike = mediaType === "tv" || mediaType === "anime";
  const availableSeasons = (richDetails?.seasons ?? [])
    .filter((season: any) => season.seasonNumber > 0)
    .sort((a: any, b: any) => a.seasonNumber - b.seasonNumber);
  const availableEpisodes = selectedSeasonDetails?.episodes ?? [];
  useEffect(() => {
    if (!isTvLike || availableSeasons.length === 0) {
      setSelectedSeasonNumber(null);
      setSelectedEpisodeNumber(null);
      return;
    }
    if (selectedSeasonNumber == null || !availableSeasons.some((season: any) => season.seasonNumber === selectedSeasonNumber)) {
      setSelectedSeasonNumber(availableSeasons[0].seasonNumber);
      setSelectedEpisodeNumber(null);
    }
  }, [availableSeasons, isTvLike, selectedSeasonNumber]);

  useEffect(() => {
    if (availableEpisodes.length === 0) {
      setSelectedEpisodeNumber(null);
      return;
    }
    if (
      selectedEpisodeNumber == null ||
      !availableEpisodes.some((episode: any) => episode.episodeNumber === selectedEpisodeNumber)
    ) {
      setSelectedEpisodeNumber(availableEpisodes[0].episodeNumber);
    }
  }, [availableEpisodes, selectedEpisodeNumber]);

  if (mediaLoading || !media) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground" data-testid="loading-media">Loading…</div>
      </div>
    );
  }

  const Icon = iconFor(media.type as MediaType);
  const topReviews = [...reviews].sort((a: any, b: any) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
  const newReviews = [...reviews];
  const resolvedMediaType = media.type as MediaType;
  const isTmdb = (TMDB_TYPES as readonly string[]).includes(resolvedMediaType);
  const tmdbType = resolvedMediaType === "anime" ? "tv" : resolvedMediaType;

  const personDiscoverUrl = (personId: string | number, personName: string) =>
    `/discover?person=${encodeURIComponent(personName)}&personId=${personId}&type=${resolvedMediaType}`;
  const backdropUrl =
    richDetails?.backdropUrl ||
    (resolvedMediaType === "music" || resolvedMediaType === "book" ? (media.coverUrl || null) : null);
  const posterUrl = richDetails?.posterUrl || media.coverUrl;
  const directorCrew = isTmdb && richDetails?.crew ? richDetails.crew.find((c: any) => c.job === "Director") : null;
  const director = directorCrew?.name || media.creator;
  const tagline = isTmdb && richDetails ? richDetails.tagline || "" : "";
  const overview =
    richDetails?.overview || richDetails?.synopsis || richDetails?.description || media.synopsis || "";
  const runtime = isTmdb && richDetails ? richDetails.runtime : null;
  const genres =
    richDetails?.genres?.map((g: any) => (typeof g === "string" ? g : g.name)) ||
    richDetails?.subjects ||
    media.tags ||
    [];
  const firstCert = isTmdb && richDetails?.releases?.[0]?.certification;
  const countries = (isTmdb && richDetails?.productionCountries?.map((c: any) => c.name)) || [];

  const trailer =
    isTmdb && richDetails?.videos?.length
      ? richDetails.videos.find((v: any) => v.type === "Trailer" && v.official) || richDetails.videos[0]
      : resolvedMediaType === "game" && richDetails?.trailers?.length
        ? richDetails.trailers[0]
        : null;

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
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-media-title">
              {media.title}
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-media-meta">
              {director}
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
            <Button variant="secondary" className="rounded-md" data-testid="button-share" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* Hero with backdrop */}
        <div className="relative -mx-4 mt-0 overflow-hidden">
          {backdropUrl && (
            <div className="absolute inset-0 h-[280px] sm:h-[320px]">
              <img
                src={backdropUrl}
                alt=""
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
            </div>
          )}

          <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col gap-6 sm:flex-row sm:items-end"
            >
              <div
                className="media-cover relative h-48 w-32 shrink-0 overflow-hidden rounded-lg border bg-card shadow-xl sm:h-56 sm:w-40"
                data-testid="img-media-cover"
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br contrast-125", media.coverGradient)} />
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt={media.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
                  <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-2xl font-semibold sm:text-3xl" data-testid="text-title">
                  {media.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {media.year && (
                    <Link href={`/discover?year=${media.year}`} className="hover:text-foreground">
                      {media.year}
                    </Link>
                  )}
                  {director && (
                    <>
                      <span>·</span>
                      {directorCrew ? (
                        <Link
                          href={personDiscoverUrl(directorCrew.id, directorCrew.name)}
                          className="hover:text-foreground hover:underline"
                        >
                          {isTmdb ? "Directed by " : ""}
                          {director}
                        </Link>
                      ) : (
                        <span>
                          {isTmdb ? "Directed by " : ""}
                          {director}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {tagline && (
                  <p className="mt-2 text-sm italic text-muted-foreground" data-testid="text-tagline">
                    {tagline}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {runtime && (
                    <Badge variant="secondary" className="rounded-full">
                      {runtime} min
                    </Badge>
                  )}
                  {firstCert && (
                    <Badge variant="secondary" className="rounded-full">
                      {firstCert}
                    </Badge>
                  )}
                  {countries.slice(0, 2).map((c: string) => (
                    <Badge key={c} variant="secondary" className="rounded-full">
                      {c}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="rounded-full" data-testid="badge-type">
                    {media.type}
                  </Badge>
                </div>

                {/* Action bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant={saved ? "default" : "secondary"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => toggleWatchlist.mutate()}
                    disabled={!currentUser}
                  >
                    <Bookmark className={cn("mr-1.5 h-4 w-4", saved && "fill-current")} />
                    Watchlist
                  </Button>
                  <Button
                    variant={liked ? "default" : "secondary"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => toggleLike.mutate()}
                    disabled={!currentUser}
                  >
                    <Heart className={cn("mr-1.5 h-4 w-4", liked && "fill-red-500 text-red-500")} />
                    Like
                  </Button>
                  <Button
                    variant={watched ? "default" : "secondary"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => toggleWatched.mutate()}
                    disabled={!currentUser}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    {watched ? "Watched" : "Mark watched"}
                  </Button>
                  <Button variant="secondary" size="sm" className="rounded-md" onClick={handleShare}>
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Share
                  </Button>
                </div>

                {/* Social stats */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    {stats.watched} watched
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    {stats.likes} likes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <List className="h-4 w-4" />
                    {stats.listed} listed
                  </span>
                </div>

                {reviews.length > 0 && (
                  <RatingHistogram reviews={reviews} />
                )}

                {isTmdb && (() => {
                  const imdbSourceRating =
                    richDetails?.imdbId &&
                    (richDetails.imdbRating ??
                      (String(media.externalId) === String(richDetails.imdbId) ? media.rating : null));
                  const imdbSourceNum = imdbSourceRating != null ? Number.parseFloat(String(imdbSourceRating)) : NaN;
                  const imdbDisplay = Number.isFinite(imdbSourceNum) ? imdbSourceNum.toFixed(1) : null;
                  const tmdbVal = richDetails?.voteAverage != null ? Number(richDetails.voteAverage) : NaN;
                  const tmdbDisplay = Number.isFinite(tmdbVal) ? tmdbVal.toFixed(1) : null;
                  const hasExternal = imdbDisplay != null || tmdbDisplay != null;
                  if (!hasExternal) return null;
                  return (
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/80 uppercase">
                        External ratings
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {richDetails?.imdbId && (
                          <a
                            href={`https://www.imdb.com/title/${richDetails.imdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded border border-transparent transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={imdbDisplay ? `IMDb rating ${imdbDisplay}` : "View on IMDb"}
                          >
                            <ImdbLogo />
                            <span className="font-serif text-base font-semibold text-foreground/90" data-testid="imdb-rating">
                              {imdbDisplay ?? "—"}
                            </span>
                          </a>
                        )}
                        {tmdbDisplay != null && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded border border-border/50 bg-muted/30 px-2 py-1 font-serif text-base font-semibold text-foreground/90"
                            title="TMDB vote average"
                          >
                            <span className="text-[10px] font-sans font-medium tracking-wider text-muted-foreground uppercase">
                              TMDB
                            </span>
                            {tmdbDisplay}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {/* Synopsis */}
            {overview && (
              <section>
                <h3 className="font-serif text-lg font-semibold">Synopsis</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-testid="text-synopsis">
                  {overview}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {genres.map((g: string) => (
                    <Badge key={g} variant="secondary" className="rounded-full" data-testid={`badge-tag-${g}`}>
                      {g}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Episode ratings chart for TV/anime */}
            {isTvLike && allSeasonsData && allSeasonsData.some((s: any) => s?.episodes?.length > 0) && (
              <EpisodeRatingsChart
                allSeasonsData={allSeasonsData}
                onEpisodeClick={(seasonNumber, episodeNumber) =>
                  navigate(`/m/${id}/s/${seasonNumber}/e/${episodeNumber}`)
                }
              />
            )}

            {/* Tabbed content: type-specific */}
            {richDetails && isTmdb && (
              <Card className="rounded-lg border border-border bg-card p-5">
                <Tabs
                  defaultValue={
                    richDetails.cast?.length > 0
                      ? "cast"
                      : richDetails.crew?.length > 0
                        ? "crew"
                        : "details"
                  }
                  className="w-full"
                >
                  <TabsList className="flex w-full flex-wrap gap-1 rounded-md bg-muted/50 p-1">
                    {richDetails.cast?.length > 0 && (
                      <TabsTrigger value="cast" className="rounded-md text-xs sm:text-sm">
                        Cast
                      </TabsTrigger>
                    )}
                    {richDetails.crew?.length > 0 && (
                      <TabsTrigger value="crew" className="rounded-md text-xs sm:text-sm">
                        Crew
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="details" className="rounded-md text-xs sm:text-sm">
                      Details
                    </TabsTrigger>
                    {richDetails.genres?.length > 0 && (
                      <TabsTrigger value="genres" className="rounded-md text-xs sm:text-sm">
                        Genres
                      </TabsTrigger>
                    )}
                    {richDetails.releases?.length > 0 && (
                      <TabsTrigger value="releases" className="rounded-md text-xs sm:text-sm">
                        Releases
                      </TabsTrigger>
                    )}
                    {isTvLike && availableSeasons.length > 0 && (
                      <TabsTrigger value="seasons" className="rounded-md text-xs sm:text-sm">
                        Seasons
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {richDetails.cast?.length > 0 && (
                    <TabsContent value="cast" className="mt-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {richDetails.cast.slice(0, 16).map((c: any) => (
                          <Link
                            key={c.id}
                            href={personDiscoverUrl(c.id, c.name)}
                            className="flex items-center gap-3 rounded-md transition-colors hover:bg-muted/50"
                          >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                              {c.profilePath ? (
                                <img src={c.profilePath} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                                  {c.name.slice(0, 1)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium hover:underline">{c.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{c.character}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {richDetails.crew?.length > 0 && (
                    <TabsContent value="crew" className="mt-4">
                      <div className="space-y-4">
                        {["Director", "Writer", "Producer", "Cinematography", "Original Music Composer"].map(
                          (dept) => {
                            const members = richDetails.crew.filter(
                              (c: any) => c.job === dept || c.department === dept
                            );
                            if (members.length === 0) return null;
                            return (
                              <div key={dept}>
                                <h4 className="text-xs font-medium uppercase text-muted-foreground">{dept}</h4>
                                <p className="mt-1 text-sm">
                                  {members.map((m: any, i: number) => (
                                    <span key={m.id}>
                                      {i > 0 && ", "}
                                      <Link
                                        href={personDiscoverUrl(m.id, m.name)}
                                        className="hover:text-foreground hover:underline"
                                      >
                                        {m.name}
                                      </Link>
                                    </span>
                                  ))}
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="details" className="mt-4 space-y-3">
                    {richDetails.productionCompanies?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Studios</h4>
                        <p className="mt-1 text-sm">{richDetails.productionCompanies.map((c: any) => c.name).join(", ")}</p>
                      </div>
                    )}
                    {richDetails.productionCountries?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Countries</h4>
                        <p className="mt-1 text-sm">{richDetails.productionCountries.map((c: any) => c.name).join(", ")}</p>
                      </div>
                    )}
                    {richDetails.spokenLanguages?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Languages</h4>
                        <p className="mt-1 text-sm">{richDetails.spokenLanguages.map((l: any) => l.name).join(", ")}</p>
                      </div>
                    )}
                    {richDetails.alternativeTitles?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Alternative titles</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {richDetails.alternativeTitles.slice(0, 8).map((t: any) => t.title).join(" · ")}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {richDetails.imdbId && (
                        <a
                          href={`https://www.imdb.com/title/${richDetails.imdbId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          IMDb
                        </a>
                      )}
                      <a
                        href={`https://www.themoviedb.org/${tmdbType}/${richDetails.externalId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        TMDB
                      </a>
                    </div>
                  </TabsContent>

                  {richDetails.genres?.length > 0 && (
                    <TabsContent value="genres" className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {richDetails.genres.map((g: any) => (
                          <Badge key={g.id} variant="secondary" className="rounded-full">
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                      {richDetails.keywords?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-medium uppercase text-muted-foreground">Keywords</h4>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {richDetails.keywords.slice(0, 12).map((k: string) => (
                              <Badge key={k} variant="outline" className="rounded-full text-xs">
                                {k}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  )}

                  {richDetails.releases?.length > 0 && (
                    <TabsContent value="releases" className="mt-4">
                      <div className="space-y-2">
                        {richDetails.releases.slice(0, 15).map((r: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{r.iso3166_1}</span>
                            <span className="text-muted-foreground">
                              {r.releaseDate ? new Date(r.releaseDate).toLocaleDateString() : ""} {r.certification}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {isTvLike && availableSeasons.length > 0 && (
                    <TabsContent value="seasons" className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Season</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableSeasons.map((season: any) => (
                            <button
                              key={season.id}
                              type="button"
                              onClick={() => {
                                setSelectedSeasonNumber(season.seasonNumber);
                                setSelectedEpisodeNumber(null);
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                selectedSeasonNumber === season.seasonNumber
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted/50",
                              )}
                            >
                              S{season.seasonNumber} · {season.episodeCount} eps
                            </button>
                          ))}
                        </div>
                      </div>

                      {seasonDetailsLoading ? (
                        <div className="text-sm text-muted-foreground">Loading episodes…</div>
                      ) : availableEpisodes.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No episodes found for this season.</div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="text-xs font-medium uppercase text-muted-foreground">Episode</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            {availableEpisodes.map((episode: any) => (
                              <Link
                                key={episode.id}
                                href={`/m/${id}/s/${episode.seasonNumber}/e/${episode.episodeNumber}`}
                                className={cn(
                                  "overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-muted/50 block",
                                )}
                              >
                                {episode.stillUrl && (
                                  <img
                                    src={episode.stillUrl}
                                    alt=""
                                    className="h-28 w-full object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <div className="space-y-1 p-3">
                                  <div className="text-xs text-muted-foreground">
                                    S{episode.seasonNumber}E{episode.episodeNumber}
                                    {episode.airDate ? ` · ${episode.airDate}` : ""}
                                  </div>
                                  <div className="text-sm font-medium">{episode.name}</div>
                                  {episode.overview && (
                                    <p className="line-clamp-3 text-xs text-muted-foreground">{episode.overview}</p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xs font-medium uppercase text-muted-foreground">Episode reviews</h4>
                            {episodeReviewsLoading ? (
                              <div className="text-sm text-muted-foreground">Loading reviews…</div>
                            ) : episodeReviews.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No reviews for this episode yet.</div>
                            ) : (
                              <div className="space-y-3">
                                {episodeReviews.map((r: any) => (
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
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </Card>
            )}

            {/* Music tabs: Tracklist, Details */}
            {richDetails && mediaType === "music" && (
              <Card className="rounded-lg border border-border bg-card p-5">
                <Tabs defaultValue="tracklist" className="w-full">
                  <TabsList className="flex w-full flex-wrap gap-1 rounded-md bg-muted/50 p-1">
                    {richDetails.tracks?.length > 0 && (
                      <TabsTrigger value="tracklist" className="rounded-md text-xs sm:text-sm">
                        Tracklist
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="details" className="rounded-md text-xs sm:text-sm">
                      Details
                    </TabsTrigger>
                  </TabsList>
                  {richDetails.tracks?.length > 0 && (
                    <TabsContent value="tracklist" className="mt-4">
                      <div className="space-y-2">
                        {richDetails.tracks.map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-4 rounded-md border bg-card/60 px-3 py-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="text-sm font-medium text-muted-foreground">{t.trackNumber}</span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{t.name}</div>
                                {t.artists && (
                                  <div className="truncate text-xs text-muted-foreground">{t.artists}</div>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(t.durationMs / 60000)}:{(Math.floor(t.durationMs / 1000) % 60)
                                .toString()
                                .padStart(2, "0")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                  <TabsContent value="details" className="mt-4 space-y-3">
                    {richDetails.artists?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Artists</h4>
                        <p className="mt-1 text-sm">
                          {richDetails.artists.map((a: any, i: number) => (
                            <span key={a.id}>
                              {i > 0 && ", "}
                              <Link
                                href={personDiscoverUrl(a.id, a.name)}
                                className="hover:text-foreground hover:underline"
                              >
                                {a.name}
                              </Link>
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                    {richDetails.label && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Label</h4>
                        <p className="mt-1 text-sm">{richDetails.label}</p>
                      </div>
                    )}
                    {richDetails.copyrights?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Copyright</h4>
                        <p className="mt-1 text-sm">{richDetails.copyrights.join("; ")}</p>
                      </div>
                    )}
                    {richDetails.albumType && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Album type</h4>
                        <p className="mt-1 text-sm capitalize">{richDetails.albumType}</p>
                      </div>
                    )}
                    {richDetails.releaseDate && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Released</h4>
                        <p className="mt-1 text-sm">{richDetails.releaseDate}</p>
                      </div>
                    )}
                    {richDetails.popularity != null && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-muted-foreground">Popularity</h4>
                        <p className="mt-1 text-sm">{richDetails.popularity}/100</p>
                      </div>
                    )}
                    {richDetails.externalUrl && (
                      <a
                        href={richDetails.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Listen on Spotify
                      </a>
                    )}
                    {richDetails.genres?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {richDetails.genres.map((g: string) => (
                          <Badge key={g} variant="secondary" className="rounded-full">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            )}

            {/* Book tabs: About, Editions, Authors */}
            {richDetails && mediaType === "book" && (
              <Card className="rounded-lg border border-border bg-card p-5">
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="flex w-full flex-wrap gap-1 rounded-md bg-muted/50 p-1">
                    <TabsTrigger value="about" className="rounded-md text-xs sm:text-sm">
                      About
                    </TabsTrigger>
                    {richDetails.editions?.length > 0 && (
                      <TabsTrigger value="editions" className="rounded-md text-xs sm:text-sm">
                        Editions
                      </TabsTrigger>
                    )}
                    {richDetails.authors?.length > 0 && (
                      <TabsTrigger value="authors" className="rounded-md text-xs sm:text-sm">
                        Authors
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="about" className="mt-4">
                    {richDetails.synopsis && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{richDetails.synopsis}</p>
                    )}
                    {richDetails.rating?.count > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="font-serif text-lg font-semibold">
                          {richDetails.rating.average.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">({richDetails.rating.count} ratings)</span>
                      </div>
                    )}
                    {richDetails.subjects?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {richDetails.subjects.map((s: string) => (
                          <Badge key={s} variant="secondary" className="rounded-full">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  {richDetails.editions?.length > 0 && (
                    <TabsContent value="editions" className="mt-4">
                      <div className="space-y-3">
                        {richDetails.editions.map((e: any, i: number) => (
                          <div key={i} className="rounded-md border bg-card/60 p-3 text-sm">
                            {e.publisher && <p><span className="font-medium">Publisher:</span> {e.publisher}</p>}
                            {e.publishDate && <p><span className="font-medium">Year:</span> {e.publishDate}</p>}
                            {e.pages > 0 && <p><span className="font-medium">Pages:</span> {e.pages}</p>}
                            {e.language && <p><span className="font-medium">Language:</span> {e.language}</p>}
                            {e.isbn && <p><span className="font-medium">ISBN:</span> {e.isbn}</p>}
                            {e.format && <p><span className="font-medium">Format:</span> {e.format}</p>}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                  {richDetails.authors?.length > 0 && (
                    <TabsContent value="authors" className="mt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {richDetails.authors.map((a: any) => (
                          <Link
                            key={a.key}
                            href={personDiscoverUrl(a.key, a.name)}
                            className="flex items-start gap-3 rounded-md border bg-card/60 p-3 transition-colors hover:bg-card/80"
                          >
                            {a.photo && (
                              <img
                                src={a.photo}
                                alt={a.name}
                                className="h-16 w-16 shrink-0 rounded-full object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium hover:underline">{a.name}</div>
                              {a.birthDate && (
                                <div className="text-xs text-muted-foreground">{a.birthDate}</div>
                              )}
                              {a.bio && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{a.bio}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </Card>
            )}

            {/* Game tabs: About, Platforms, Developers, Screenshots, Trailers */}
            {richDetails && mediaType === "game" && (
              <Card className="rounded-lg border border-border bg-card p-5">
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="flex w-full flex-wrap gap-1 rounded-md bg-muted/50 p-1">
                    <TabsTrigger value="about" className="rounded-md text-xs sm:text-sm">
                      About
                    </TabsTrigger>
                    {richDetails.platforms?.length > 0 && (
                      <TabsTrigger value="platforms" className="rounded-md text-xs sm:text-sm">
                        Platforms
                      </TabsTrigger>
                    )}
                    {(richDetails.developers?.length > 0 || richDetails.publishers?.length > 0) && (
                      <TabsTrigger value="credits" className="rounded-md text-xs sm:text-sm">
                        Credits
                      </TabsTrigger>
                    )}
                    {richDetails.screenshots?.length > 0 && (
                      <TabsTrigger value="screenshots" className="rounded-md text-xs sm:text-sm">
                        Screenshots
                      </TabsTrigger>
                    )}
                    {richDetails.trailers?.length > 0 && (
                      <TabsTrigger value="trailers" className="rounded-md text-xs sm:text-sm">
                        Trailers
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="about" className="mt-4 space-y-3">
                    {richDetails.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{richDetails.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {richDetails.metacritic != null && (
                        <Badge variant="secondary" className="rounded-full">
                          Metacritic: {richDetails.metacritic}
                        </Badge>
                      )}
                      {richDetails.esrbRating && (
                        <Badge variant="secondary" className="rounded-full">
                          {richDetails.esrbRating}
                        </Badge>
                      )}
                    </div>
                    {richDetails.website && (
                      <a
                        href={richDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Official website
                      </a>
                    )}
                    {richDetails.metacriticUrl && (
                      <a
                        href={richDetails.metacriticUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View on Metacritic
                      </a>
                    )}
                    {(richDetails.genres?.length > 0 || richDetails.tags?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {[...(richDetails.genres || []), ...(richDetails.tags || [])].map((g: string) => (
                          <Badge key={g} variant="outline" className="rounded-full text-xs">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  {richDetails.platforms?.length > 0 && (
                    <TabsContent value="platforms" className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {richDetails.platforms.map((p: any, i: number) => (
                          <Badge key={i} variant="secondary" className="rounded-full">
                            {p.name}
                            {p.releasedAt ? ` (${new Date(p.releasedAt).getFullYear()})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                  {(richDetails.developers?.length > 0 || richDetails.publishers?.length > 0) && (
                    <TabsContent value="credits" className="mt-4 space-y-3">
                      {richDetails.developers?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium uppercase text-muted-foreground">Developers</h4>
                          <p className="mt-1 text-sm">
                            {richDetails.developers.map((d: any, i: number) => (
                              <span key={d.id}>
                                {i > 0 && ", "}
                                <Link
                                  href={personDiscoverUrl(d.id, d.name)}
                                  className="hover:text-foreground hover:underline"
                                >
                                  {d.name}
                                </Link>
                              </span>
                            ))}
                          </p>
                        </div>
                      )}
                      {richDetails.publishers?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium uppercase text-muted-foreground">Publishers</h4>
                          <p className="mt-1 text-sm">{richDetails.publishers.map((p: any) => p.name).join(", ")}</p>
                        </div>
                      )}
                    </TabsContent>
                  )}
                  {richDetails.screenshots?.length > 0 && (
                    <TabsContent value="screenshots" className="mt-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {richDetails.screenshots.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="overflow-hidden rounded-lg border bg-muted"
                          >
                            <img src={url} alt="" className="aspect-video w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                  {richDetails.trailers?.length > 0 && (
                    <TabsContent value="trailers" className="mt-4 space-y-4">
                      {richDetails.trailers.map((t: any, i: number) => (
                        <div key={i}>
                          <div className="text-sm font-medium">{t.name}</div>
                          {t.videoUrl ? (
                            <video
                              className="mt-2 w-full rounded-lg border"
                              src={t.videoUrl}
                              controls
                              poster={t.preview}
                              preload="metadata"
                            />
                          ) : (
                            t.preview && (
                              <img src={t.preview} alt={t.name} className="mt-2 w-full rounded-lg border" />
                            )
                          )}
                        </div>
                      ))}
                    </TabsContent>
                  )}
                </Tabs>
              </Card>
            )}

            {/* Trailer / Video */}
            {trailer && (
              <section>
                <h3 className="font-serif text-lg font-semibold">Trailer</h3>
                <div className="mt-2 aspect-video overflow-hidden rounded-lg border bg-muted">
                  {trailer.key ? (
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube.com/embed/${trailer.key}`}
                      title={trailer.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : trailer.videoUrl ? (
                    <video
                      className="h-full w-full object-contain"
                      src={trailer.videoUrl}
                      controls
                      poster={trailer.preview}
                      title={trailer.name}
                    />
                  ) : null}
                </div>
              </section>
            )}

            {/* Similar media */}
            {richDetails?.similar?.length > 0 && isTmdb && (
              <section>
                <h3 className="font-serif text-lg font-semibold">Similar</h3>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {richDetails.similar.map((s: any) => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        ensureAndNavigate({
                          id: undefined,
                          externalId: String(s.id),
                          type: s.type,
                          title: s.title,
                          coverUrl: s.posterPath,
                          coverGradient: "from-slate-700 to-slate-900",
                          synopsis: s.overview,
                          year: s.releaseDate?.slice(0, 4) || s.firstAirDate?.slice(0, 4),
                          rating: s.voteAverage ? String(s.voteAverage) : "",
                        })
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        ensureAndNavigate({
                          externalId: String(s.id),
                          type: s.type,
                          title: s.title,
                          coverUrl: s.posterPath,
                          coverGradient: "from-slate-700 to-slate-900",
                          synopsis: s.overview,
                          year: s.releaseDate?.slice(0, 4) || s.firstAirDate?.slice(0, 4),
                          rating: s.voteAverage ? String(s.voteAverage) : "",
                        })
                      }
                      className="group shrink-0 cursor-pointer"
                    >
                      <div className="relative h-36 w-24 overflow-hidden rounded-md border bg-card">
                        {s.posterPath ? (
                          <img
                            src={s.posterPath}
                            alt={s.title}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition group-hover:opacity-100" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                          <Play className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      </div>
                      <div className="mt-1 max-w-[96px] truncate text-xs font-medium">{s.title}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
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
                    <div className="text-center text-sm text-muted-foreground p-4" data-testid="loading-reviews">
                      Loading reviews…
                    </div>
                  ) : topReviews.length === 0 ? (
                    <div className="rounded-lg border bg-card/60 p-10 text-center" data-testid="empty-top">
                      <div className="font-serif text-xl font-semibold">No reviews yet.</div>
                      <p className="mt-2 text-sm text-muted-foreground">Be the first to share your thoughts.</p>
                    </div>
                  ) : (
                    topReviews.map((r: any) => (
                      <ReviewCard
                        key={r.id}
                        r={r}
                        currentUser={currentUser}
                        onLike={likeReview}
                        onUnlike={unlikeReview}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="new" className="mt-4 space-y-3">
                  {reviewsLoading ? (
                    <div className="text-center text-sm text-muted-foreground p-4" data-testid="loading-reviews-new">
                      Loading reviews…
                    </div>
                  ) : newReviews.length === 0 ? (
                    <div className="rounded-lg border bg-card/60 p-10 text-center" data-testid="empty-new">
                      <div className="font-serif text-xl font-semibold">No reviews yet.</div>
                      <p className="mt-2 text-sm text-muted-foreground">Be the first to share your thoughts.</p>
                    </div>
                  ) : (
                    newReviews.map((r: any) => (
                      <ReviewCard
                        key={r.id}
                        r={r}
                        currentUser={currentUser}
                        onLike={likeReview}
                        onUnlike={unlikeReview}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar: Quick review */}
          <aside className="space-y-6">
            <Card className="rounded-lg border border-border bg-card p-5 sm:p-7" data-testid="card-write">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-write-title">
                    Write a quick review
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-write-subtitle">
                    Small, honest, specific.
                  </div>
                </div>
                <Link href="/review/new" data-testid="link-full-editor" className="text-sm font-medium text-primary hover:opacity-80">
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
                  skeuo
                  className="rounded-md"
                  data-testid="button-post-quick"
                  disabled={!draft.trim() || draftRating === 0 || !currentUser || postReview.isPending}
                  onClick={() =>
                    postReview.mutate({
                      body: draft,
                      rating: draftRating,
                    })
                  }
                >
                  Post
                </Button>
              </div>
            </Card>

            {!isPro && media && (
              <AffiliateLinksCard
                media={{
                  type: media.type,
                  title: media.title,
                  creator: media.creator,
                  externalId: media.externalId,
                  isbn: richDetails?.editions?.[0]?.isbn ?? undefined,
                  externalUrl: richDetails?.externalUrl ?? undefined,
                }}
              />
            )}

            {import.meta.env.VITE_AD_SLOT_MEDIADETAIL_RAIL && (
              <Card className="rounded-lg border border-border bg-card p-4" data-testid="card-ad-media-detail">
                <AdSlot
                  slotId={import.meta.env.VITE_AD_SLOT_MEDIADETAIL_RAIL}
                  format="rectangle"
                  className="flex justify-center"
                />
              </Card>
            )}
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

const RATING_TIERS = [
  { label: "Masterpiece", color: "bg-fuchsia-600 shadow-[0_0_12px_rgba(192,38,211,0.6)] ring-1 ring-fuchsia-400/50 z-10", min: 9.5, text: "text-white font-black" },
  { label: "Excellent", color: "bg-violet-500 border border-violet-400/30", min: 8.5, text: "text-white font-bold" },
  { label: "Great", color: "bg-blue-500 border border-blue-400/30", min: 7.5, text: "text-white font-semibold" },
  { label: "Good", color: "bg-emerald-500 border border-emerald-400/30", min: 6.5, text: "text-white font-medium" },
  { label: "Mixed", color: "bg-amber-500 border border-amber-400/30", min: 5.0, text: "text-white font-medium" },
  { label: "Poor", color: "bg-orange-500 border border-orange-400/30", min: 3.0, text: "text-white font-medium" },
  { label: "Awful", color: "bg-red-600 border border-red-500/30", min: 0, text: "text-white font-bold" },
];

function getRatingStyles(rating: number) {
  if (!rating || rating === 0) return { color: "bg-muted/10 border border-dashed border-border/50", text: "text-transparent" };
  const tier = RATING_TIERS.find((t) => rating >= t.min) || RATING_TIERS[RATING_TIERS.length - 1];
  return { color: tier.color, text: tier.text };
}

function EpisodeRatingsChart({
  allSeasonsData,
  onEpisodeClick,
}: {
  allSeasonsData: any[];
  onEpisodeClick: (seasonNumber: number, episodeNumber: number) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const validSeasons = allSeasonsData.filter((s) => s && s.episodes && s.episodes.length > 0);
  if (validSeasons.length === 0) return null;

  const maxEpisodes = Math.max(...validSeasons.map((s) => s.episodes.length));

  // Compute averages
  const seasonAverages = validSeasons.map((season) => {
    const ratedEps = season.episodes.filter((ep: any) => ep.voteAverage > 0);
    if (ratedEps.length === 0) return 0;
    return ratedEps.reduce((acc: number, ep: any) => acc + ep.voteAverage, 0) / ratedEps.length;
  });

  return (
    <Card className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl relative overflow-hidden sm:p-5 md:p-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      {/* Header: always visible, touch-friendly collapse toggle (44px min) */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Episode Ratings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
            {isCollapsed ? "Tap to show chart" : "Performance across all seasons"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed((c) => !c)}
          className={cn(
            "shrink-0 flex items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "min-h-[44px] min-w-[44px] touch-manipulation"
          )}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Show episode ratings chart" : "Hide episode ratings chart"}
        >
          <ChevronDown
            className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200", !isCollapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Collapsible body */}
      {!isCollapsed && (
        <>
          {/* Legend: responsive wrap + horizontal scroll on very small screens */}
          <div className="flex flex-wrap gap-x-2 gap-y-2 mt-4 mb-6 overflow-x-auto pb-1 -mx-1 styled-scrollbar sm:gap-x-3 sm:mb-8 md:-mx-0">
            {RATING_TIERS.map((tier) => (
              <div
                key={tier.label}
                className="flex items-center gap-1.5 shrink-0 bg-background/60 px-2 py-1.5 rounded-full border border-border/50 shadow-sm text-[11px] font-medium sm:gap-2 sm:px-2.5 sm:text-xs"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shadow-sm sm:w-2.5 sm:h-2.5",
                    tier.color.split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("shadow")).join(" ")
                  )}
                />
                <span className="text-foreground/80 tracking-tight whitespace-nowrap">{tier.label}</span>
              </div>
            ))}
          </div>

          {/* Chart: horizontal scroll, touch-friendly, smooth on iOS */}
          <div
            className="overflow-x-auto overflow-y-hidden pb-4 -mx-1 styled-scrollbar touch-pan-x md:mx-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="min-w-max flex flex-col gap-1.5">
              {/* Season header row */}
              <div className="flex gap-1.5 mb-2">
                <div className="w-10 shrink-0 sm:w-12" />
                {validSeasons.map((s) => (
                  <div
                    key={s.seasonNumber}
                    className="w-10 shrink-0 flex flex-col items-center justify-center text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest sm:w-12 sm:text-xs"
                  >
                    <span>S{s.seasonNumber}</span>
                  </div>
                ))}
              </div>

              {/* Episode rows: 44px min height on mobile for touch targets */}
              {Array.from({ length: maxEpisodes }).map((_, rowIndex) => {
                const epIndex = rowIndex + 1;
                return (
                  <div key={rowIndex} className="flex gap-1.5">
                    <div className="w-10 h-11 shrink-0 flex items-center justify-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider sm:w-12 sm:h-10 sm:text-[11px]">
                      E{epIndex}
                    </div>
                    {validSeasons.map((season, sIdx) => {
                      const ep = season.episodes.find((e: any) => e.episodeNumber === epIndex);
                      const rating = ep?.voteAverage || 0;
                      const { color, text } = getRatingStyles(rating);

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          title={ep ? `${ep.name} - ${rating.toFixed(1)}/10` : undefined}
                          onClick={() => ep && onEpisodeClick(season.seasonNumber, ep.episodeNumber)}
                          className={cn(
                            "w-10 h-11 shrink-0 flex items-center justify-center rounded-md text-[12px] transition-all duration-300 hover:scale-[1.1] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation sm:w-12 sm:h-10 sm:text-[13px] sm:hover:scale-[1.15] sm:hover:shadow-lg",
                            color,
                            text,
                            !ep && "opacity-0 pointer-events-none"
                          )}
                          disabled={!ep}
                          aria-label={ep ? `Episode ${epIndex}, ${rating.toFixed(1)} out of 10` : undefined}
                        >
                          {rating > 0 ? rating.toFixed(1) : ""}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Average row */}
              <div className="flex gap-1.5 mt-4 pt-4 border-t border-border/40">
                <div className="w-10 h-11 shrink-0 flex items-center justify-center text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest sm:w-12 sm:h-10 sm:text-[10px]">
                  AVG
                </div>
                {seasonAverages.map((avg, sIdx) => (
                  <div
                    key={sIdx}
                    className="w-10 h-11 shrink-0 flex flex-col items-center justify-center gap-1 sm:w-12 sm:h-10"
                  >
                    <span className="text-[12px] font-bold text-foreground/90 sm:text-[13px]">
                      {avg > 0 ? avg.toFixed(1) : "-"}
                    </span>
                    {avg > 0 && (
                      <div className="h-1 w-6 rounded-full bg-muted overflow-hidden flex sm:w-8">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                          style={{ width: `${(avg / 10) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
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
    <Card key={r.id} className="rounded-lg border bg-card/60 p-4" data-testid={`card-review-${r.id}`}>
      <div className="flex items-start gap-3">
        <Link href={`/u/${r.user.username}`} data-testid={`link-review-author-${r.id}`}>
          <Avatar className="h-10 w-10 ring-1 ring-border" data-testid={`avatar-review-${r.id}`}>
            <AvatarImage alt={r.user.displayName} src={r.user.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/15">{r.user.displayName.slice(0, 1)}</AvatarFallback>
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
            <motion.button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-0 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isLiked ? "text-red-500 dark:text-red-400" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={handleLikeToggle}
              disabled={!currentUser}
              data-testid={`button-like-review-${r.id}`}
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
                    isLiked ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400" : "",
                  )}
                  strokeWidth={2}
                />
              </motion.span>
              <span className="tabular-nums" data-testid={`text-likes-${r.id}`}>
                {r.likeCount ?? 0}
              </span>
            </motion.button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-foreground/90" data-testid={`text-review-${r.id}`}>
            {r.body}
          </p>
        </div>
      </div>
    </Card>
  );
}
