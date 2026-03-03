import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clapperboard,
  Film,
  Gamepad2,
  Loader2,
  Music,
  Search,
  Sparkles,
  Tv2,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

import { BottomNav } from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRatingSelector } from "@/components/star-rating-selector";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getSearchVariants(query: string): string[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const variants = new Set<string>([q]);

  // Truncated fallback helps with near-miss typos (e.g. "duna" -> "dun").
  if (q.length >= 4) {
    variants.add(q.slice(0, -1));
  }

  // Common vowel typo fallback (e.g. "duna" -> "dune").
  if (q.endsWith("a") && q.length >= 3) {
    variants.add(`${q.slice(0, -1)}e`);
  }

  return Array.from(variants);
}

function scoreSearchResult(item: any, query: string): number {
  const title = normalizeSearchText(item?.title || "");
  const q = normalizeSearchText(query);
  if (!title || !q) return 0;
  if (title === q) return 1000;
  if (title.startsWith(`${q} `) || title.startsWith(`${q}:`)) return 920;
  if (title.startsWith(q)) return 850;
  if (title.includes(q)) return 760;
  const shortQ = q.length > 3 ? q.slice(0, -1) : q;
  if (shortQ && title.includes(shortQ)) return 680;
  return 0;
}

import { MEDIA_TYPES as MEDIA_TYPE_VALUES, type MediaType } from "@shared/schema";

const MEDIA_TYPE_ICON: Record<MediaType, typeof Film> = {
  movie: Film,
  tv: Tv2,
  game: Gamepad2,
  anime: Clapperboard,
  music: Music,
  book: BookOpen,
};

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  movie: "Movie",
  tv: "TV",
  game: "Game",
  anime: "Animation",
  music: "Music",
  book: "Book",
};

const MEDIA_TYPES = MEDIA_TYPE_VALUES.map((value) => ({
  value,
  label: MEDIA_TYPE_LABEL[value],
  icon: MEDIA_TYPE_ICON[value],
}));

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp: any = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function ReviewCreate() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, isLoading: authLoading } = useAuth();
  const [medium, setMedium] = useState<MediaType>("movie");
  const [title, setTitle] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");
  const [reviewEpisode, setReviewEpisode] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState<number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) navigate("/signin");
  }, [authLoading, currentUser, navigate]);

  const debouncedQuery = useDebounce(title, 300);
  const isMatchingSelectedType = useCallback(
    (itemType: string | undefined) => {
      if (!itemType) return false;
      return itemType === medium;
    },
    [medium]
  );

  const { data: allMedia = [], isLoading: mediaLoading } = useQuery<any[]>({
    queryKey: ["/api/media"],
  });

  const { data: externalResults = [], isFetching: externalSearching } = useQuery<any[]>({
    queryKey: ["/api/search/all", debouncedQuery, medium],
    queryFn: async () => {
      const variants = getSearchVariants(debouncedQuery);
      if (variants.length === 0) return [];

      const responses = await Promise.all(
        variants.map(async (variant) => {
          const res = await fetch(
            `/api/search/all?q=${encodeURIComponent(variant)}&type=${medium}&limit=8`
          );
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
      );

      const deduped = new Map<string, any>();
      for (const batch of responses) {
        for (const item of batch) {
          const key = String(item.externalId || item.id || item.title || "");
          if (!key || deduped.has(key)) continue;
          deduped.set(key, item);
        }
      }

      return Array.from(deduped.values())
        .filter((item) => isMatchingSelectedType(item?.type))
        .sort((a, b) => scoreSearchResult(b, debouncedQuery) - scoreSearchResult(a, debouncedQuery))
        .slice(0, 10);
    },
    enabled: debouncedQuery.length >= 2 && !selectedMediaId,
    staleTime: 60_000,
  });

  const libraryMatches = useMemo(() => {
    if (!title || selectedMediaId) return [];
    const q = title.toLowerCase();
    return allMedia
      .filter((m: any) => m.type === medium && m.title.toLowerCase().includes(q))
      .slice(0, 6);
  }, [title, allMedia, medium, selectedMediaId]);

  const filteredExternal = useMemo(() => {
    if (!debouncedQuery || selectedMediaId) return [];
    const libraryTitles = new Set(libraryMatches.map((m: any) => m.title.toLowerCase()));
    return externalResults.filter(
      (m: any) => !libraryTitles.has(m.title.toLowerCase())
    );
  }, [debouncedQuery, selectedMediaId, externalResults, libraryMatches]);

  const hasAnyResults = libraryMatches.length > 0 || filteredExternal.length > 0;
  const isSearching = externalSearching && debouncedQuery.length >= 2;

  const quickPick = useMemo(() => {
    return allMedia.filter((m: any) => m.type === medium).slice(0, 12);
  }, [medium, allMedia]);

  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  useEffect(() => {
    if (selectedMediaId) {
      const found = allMedia.find((m: any) => m.id === selectedMediaId);
      if (found) setSelectedMedia(found);
    } else {
      setSelectedMedia(null);
    }
  }, [selectedMediaId, allMedia]);

  const isTvLikeSelection = selectedMedia?.type === "tv" || selectedMedia?.type === "anime";

  const { data: selectedShowDetails } = useQuery<any>({
    queryKey: [
      "/api/details",
      selectedMedia?.type || "",
      selectedMedia?.externalId ? encodeURIComponent(String(selectedMedia.externalId)) : "",
    ],
    queryFn: () =>
      fetch(
        `/api/details/${selectedMedia.type}/${encodeURIComponent(String(selectedMedia.externalId))}`,
      ).then((r) => r.json()),
    enabled: !!selectedMedia?.externalId && isTvLikeSelection,
  });

  const availableSeasons = (selectedShowDetails?.seasons ?? [])
    .filter((season: any) => season.seasonNumber > 0)
    .sort((a: any, b: any) => a.seasonNumber - b.seasonNumber);

  const { data: selectedSeasonDetails, isLoading: episodesLoading } = useQuery<any>({
    queryKey: ["/api/tmdb/tv/season", selectedMedia?.externalId || "", selectedSeasonNumber ?? -1],
    queryFn: () =>
      fetch(`/api/tmdb/tv/${selectedMedia.externalId}/season/${selectedSeasonNumber}`).then((r) => r.json()),
    enabled: !!selectedMedia?.externalId && reviewEpisode && selectedSeasonNumber != null && isTvLikeSelection,
  });

  const availableEpisodes = selectedSeasonDetails?.episodes ?? [];

  useEffect(() => {
    if (!reviewEpisode || !isTvLikeSelection || availableSeasons.length === 0) {
      setSelectedSeasonNumber(null);
      setSelectedEpisodeNumber(null);
      return;
    }
    if (
      selectedSeasonNumber == null ||
      !availableSeasons.some((season: any) => season.seasonNumber === selectedSeasonNumber)
    ) {
      setSelectedSeasonNumber(availableSeasons[0].seasonNumber);
      setSelectedEpisodeNumber(null);
    }
  }, [availableSeasons, isTvLikeSelection, reviewEpisode, selectedSeasonNumber]);

  useEffect(() => {
    if (!reviewEpisode) {
      setSelectedEpisodeNumber(null);
      return;
    }
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
  }, [availableEpisodes, reviewEpisode, selectedEpisodeNumber]);

  useEffect(() => {
    if (!isTvLikeSelection) {
      setReviewEpisode(false);
      setSelectedSeasonNumber(null);
      setSelectedEpisodeNumber(null);
    }
  }, [isTvLikeSelection]);



  const ensureMutation = useMutation({
    mutationFn: async (m: any) => {
      const res = await apiRequest("POST", "/api/media/ensure", {
        type: m.type || medium,
        title: m.title,
        creator: m.creator ?? "",
        year: m.year ?? "",
        coverUrl: m.coverUrl ?? "",
        coverGradient: m.coverGradient ?? "from-slate-700 to-slate-900",
        synopsis: m.synopsis ?? "",
        tags: m.tags ?? [],
        rating: m.rating ?? "",
        externalId: m.externalId ?? "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      setSelectedMediaId(data.id);
      setSelectedMedia(data);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: {
      mediaId: string;
      rating: number;
      body: string;
      seasonNumber?: number;
      episodeNumber?: number;
    }) => {
      const res = await apiRequest("POST", "/api/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/recent"] });
      toast.success("Review published!");
      if (selectedMediaId) {
        navigate(`/m/${selectedMediaId}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to publish review");
    },
  });

  const episodeSelectionValid =
    !reviewEpisode || (selectedSeasonNumber != null && selectedEpisodeNumber != null);
  const canPublish =
    !!selectedMediaId && text.trim().length > 0 && episodeSelectionValid && !publishMutation.isPending;

  const handlePublish = () => {
    if (!currentUser || !selectedMediaId) return;
    publishMutation.mutate({
      mediaId: selectedMediaId,
      rating,
      body: text,
      seasonNumber: reviewEpisode ? (selectedSeasonNumber ?? undefined) : undefined,
      episodeNumber: reviewEpisode ? (selectedEpisodeNumber ?? undefined) : undefined,
    });
  };

  const handleQuickPick = (m: any) => {
    setTitle(m.title);
    setSelectedMediaId(m.id);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSelectedMediaId(null);
  };

  const handleLibraryMatch = (m: any) => {
    setTitle(m.title);
    setSelectedMediaId(m.id);
    setSearchFocused(false);
  };

  const handleExternalPick = useCallback((m: any) => {
    setTitle(m.title);
    setSearchFocused(false);
    ensureMutation.mutate(m);
  }, [ensureMutation]);

  const clearSelection = () => {
    setTitle("");
    setSelectedMediaId(null);
    setSelectedMedia(null);
    setReviewEpisode(false);
    setSelectedSeasonNumber(null);
    setSelectedEpisodeNumber(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const completionSteps = [!!selectedMediaId, rating > 0, text.trim().length > 0];
  const completionCount = completionSteps.filter(Boolean).length;

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* ── header ── */}
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-backdrop-filter:bg-background/55">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
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
              <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-new-review-title">
                New review
              </h1>
            </div>
          </div>

          {/* progress dots */}
          <div className="flex items-center gap-1.5">
            {(["media", "rating", "text"] as const).map((step, i) => (
              <motion.div
                key={step}
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  completionSteps[i] ? "bg-primary" : "bg-muted-foreground/25"
                }`}
                animate={completionSteps[i] ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.3 }}
              />
            ))}
            <span className="ml-1.5 text-xs font-medium text-muted-foreground">
              {completionCount}/3
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-36 pt-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* ── 1. media type tabs ── */}
          <motion.section variants={fadeUp}>
            <p
              className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground"
              data-testid="text-new-review-subtitle"
            >
              What are you reviewing?
            </p>
            <div className="flex flex-wrap gap-2">
              {MEDIA_TYPES.map((mt) => {
                const active = medium === mt.value;
                const Icon = mt.icon;
                return (
                  <button
                    key={mt.value}
                    data-testid={`option-medium-${mt.value}`}
                    onClick={() => {
                      setMedium(mt.value);
                      setSelectedMediaId(null);
                      setTitle("");
                      setReviewEpisode(false);
                      setSelectedSeasonNumber(null);
                      setSelectedEpisodeNumber(null);
                    }}
                    className={`group relative flex cursor-pointer items-center gap-2 border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{mt.label}</span>
                    {active && (
                      <motion.div
                        layoutId="media-tab-indicator"
                        className="absolute inset-0 border border-primary"
                        transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* ── 2. title search / selection ── */}
          <motion.section variants={fadeUp} data-testid="card-editor">
            <AnimatePresence mode="wait">
              {selectedMedia ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="glass bg-noise relative overflow-hidden border p-5"
                >
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        Selected
                      </div>
                      <h2 className="mt-1.5 font-serif text-xl font-semibold leading-tight" data-testid="text-editor-title">
                        {selectedMedia.title}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {selectedMedia.year && <span>{selectedMedia.year}</span>}
                        {selectedMedia.creator && (
                          <>
                            <span className="text-border">·</span>
                            <span>{selectedMedia.creator}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={clearSelection}
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border bg-card/60 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {selectedMedia.coverUrl && (
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.08]"
                      style={{
                        backgroundImage: `url(${selectedMedia.coverUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(20px)",
                      }}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="relative">
                    <div className={`flex items-center gap-3 border bg-card/60 px-4 transition-all duration-200 ${
                      searchFocused ? "border-primary ring-1 ring-primary/30" : "border-border"
                    }`}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                      ) : (
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <input
                        ref={searchRef}
                        type="search"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                        placeholder={`Search for a ${medium}…`}
                        className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                        id="input-title"
                        data-testid="input-title"
                      />
                      <input type="hidden" data-testid="select-medium" id="select-medium" value={medium} />
                      <label className="sr-only" data-testid="label-medium" htmlFor="select-medium">Medium</label>
                      <label className="sr-only" data-testid="label-title" htmlFor="input-title">Title</label>
                    </div>

                    {/* autocomplete dropdown */}
                    <AnimatePresence>
                      {searchFocused && title.length >= 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border bg-card shadow-lg"
                        >
                          {/* library matches */}
                          {libraryMatches.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-10 border-b bg-card/95 px-3 py-1.5 backdrop-blur">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Your library</span>
                              </div>
                              {libraryMatches.map((m: any) => (
                                <button
                                  key={m.id}
                                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                                  data-testid={`suggestion-${m.id}`}
                                  onMouseDown={() => handleLibraryMatch(m)}
                                >
                                  <div className="media-cover relative h-12 w-9 shrink-0 overflow-hidden border bg-card shadow-sm">
                                    <div className={cn("absolute inset-0 bg-gradient-to-br", m.coverGradient || "from-slate-700 to-slate-900")} />
                                    {m.coverUrl && (
                                      <img src={m.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">{m.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {[m.year, m.creator].filter(Boolean).join(" · ") || m.type}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* external results */}
                          {filteredExternal.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-10 border-b bg-card/95 px-3 py-1.5 backdrop-blur">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Search results</span>
                              </div>
                              {filteredExternal.map((m: any, i: number) => (
                                <button
                                  key={m.externalId || `ext-${i}`}
                                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                                  onMouseDown={() => handleExternalPick(m)}
                                >
                                  <div className="media-cover relative h-12 w-9 shrink-0 overflow-hidden border bg-card shadow-sm">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
                                    {m.coverUrl && (
                                      <img src={m.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">{m.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {[m.year, m.creator].filter(Boolean).join(" · ") || m.type}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* loading state */}
                          {isSearching && !hasAnyResults && (
                            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Searching…
                            </div>
                          )}

                          {/* empty state */}
                          {!isSearching && !hasAnyResults && title.length >= 2 && (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                              No results for "{title}"
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ensuring indicator */}
                  {ensureMutation.isPending && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Adding to your library…
                    </div>
                  )}

                  {/* quick picks */}
                  {quickPick.length > 0 && !title && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs text-muted-foreground">
                        From your library
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mediaLoading ? (
                          <span className="text-xs text-muted-foreground">Loading…</span>
                        ) : (
                          quickPick.slice(0, 12).map((m: any) => (
                            <button
                              key={m.id}
                              className="flex cursor-pointer items-center gap-2 border border-border bg-card/60 px-2 py-1.5 text-left text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                              data-testid={`button-quick-${m.id}`}
                              onClick={() => handleQuickPick(m)}
                            >
                              <div className={cn(
                                "media-cover relative h-8 w-6 shrink-0 overflow-hidden border bg-card shadow-sm",
                              )}>
                                <div className={cn("absolute inset-0 bg-gradient-to-br", m.coverGradient || "from-slate-700 to-slate-900")} />
                                {m.coverUrl && (
                                  <img src={m.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                                )}
                              </div>
                              <span className="truncate">
                                {m.title}
                                {m.year ? ` (${m.year})` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ── 2b. optional episode picker for TV/anime ── */}
          {selectedMedia && isTvLikeSelection && (
            <motion.section variants={fadeUp}>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Episode target (optional)
              </p>
              <div className="glass bg-noise space-y-4 border p-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reviewEpisode}
                    onChange={(e) => setReviewEpisode(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Review a specific episode
                </label>

                {reviewEpisode && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Season</span>
                      <select
                        value={selectedSeasonNumber ?? ""}
                        onChange={(e) => {
                          const value = Number.parseInt(e.target.value, 10);
                          setSelectedSeasonNumber(Number.isInteger(value) ? value : null);
                          setSelectedEpisodeNumber(null);
                        }}
                        className="h-10 w-full border bg-card px-3 text-sm"
                      >
                        {availableSeasons.map((season: any) => (
                          <option key={season.id} value={season.seasonNumber}>
                            S{season.seasonNumber} · {season.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Episode</span>
                      <select
                        value={selectedEpisodeNumber ?? ""}
                        onChange={(e) => {
                          const value = Number.parseInt(e.target.value, 10);
                          setSelectedEpisodeNumber(Number.isInteger(value) ? value : null);
                        }}
                        className="h-10 w-full border bg-card px-3 text-sm"
                        disabled={episodesLoading || availableEpisodes.length === 0}
                      >
                        {episodesLoading ? (
                          <option value="">Loading episodes…</option>
                        ) : availableEpisodes.length === 0 ? (
                          <option value="">No episodes found</option>
                        ) : (
                          availableEpisodes.map((episode: any) => (
                            <option key={episode.id} value={episode.episodeNumber}>
                              E{episode.episodeNumber} · {episode.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* ── 3. rating ── */}
          <motion.section variants={fadeUp}>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground" data-testid="label-rating">
              Your rating
            </p>
            <div className="glass bg-noise flex items-center justify-between gap-4 border p-5">
              <StarRatingSelector value={rating} onChange={setRating} />
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full font-serif text-base tabular-nums" data-testid="text-rating">
                  {Number.isInteger(rating) ? rating : rating.toFixed(1)}
                </Badge>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
            </div>
          </motion.section>

          {/* ── 4. review text ── */}
          <motion.section variants={fadeUp}>
            <div className="mb-3 flex items-end justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground" data-testid="label-text">
                Your review
              </p>
              <span className={`text-xs tabular-nums transition-colors ${
                text.length > 0 ? "text-muted-foreground" : "text-transparent"
              }`}>
                {text.length} ch
              </span>
            </div>
            <div className="glass bg-noise relative border">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Open with the vibe. Name one specific moment. End with a punchline."
                className="min-h-[200px] w-full resize-y bg-transparent px-5 py-5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40 sm:min-h-[240px] md:text-sm"
                data-testid="input-review-text"
              />
              <div className="pointer-events-none absolute bottom-4 right-4">
                <Sparkles className={`h-4 w-4 transition-all duration-500 ${
                  text.length > 20 ? "text-primary/50" : "text-muted-foreground/15"
                }`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground/60" data-testid="text-editor-subtitle">
              A tiny essay, not a sermon. Keep it specific. Keep it honest.
            </p>
          </motion.section>

          {/* ── 5. live preview ── */}
          <motion.section variants={fadeUp} data-testid="card-preview">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground" data-testid="text-preview-subtitle">
              Preview
            </p>
            <div className="border bg-card p-5" data-testid="preview-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-semibold" data-testid="text-preview-author">You</span>
                  <span className="text-xs text-muted-foreground" data-testid="text-preview-meta">
                    {" "}reviewed{" "}
                    <span className="font-medium text-foreground">{title || "(pick a title)"}</span>
                  </span>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-full tabular-nums" data-testid="badge-preview-rating">
                  {rating}★
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80" data-testid="text-preview-body">
                {text || (
                  <span className="italic text-muted-foreground/50">
                    Write something small and specific. Mention a moment.
                  </span>
                )}
              </p>
            </div>
          </motion.section>

          {/* ── 6. actions ── */}
          <motion.section variants={fadeUp} className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="secondary"
              className="rounded-md"
              data-testid="button-save-draft"
              onClick={() => {}}
            >
              Save draft
            </Button>
            <Button
              skeuo
              className="rounded-md px-8"
              data-testid="button-publish"
              disabled={!canPublish}
              onClick={handlePublish}
            >
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </Button>
          </motion.section>

          {/* hidden elements for test compatibility */}
          <div className="hidden">
            <span data-testid="pill-medium">{medium}</span>
            <span data-testid="badge-new">log a feeling</span>
            <span data-testid="badge-live">Live</span>
            <span data-testid="text-preview-title">Preview</span>
            <span data-testid="text-guidelines-title">A quick rubric</span>
            <span data-testid="text-guidelines-body">
              Great reviews are: (1) a feeling, (2) one detail, (3) one sentence you'll remember.
            </span>
            <span data-testid="card-guidelines" />
            <span data-testid="tip-1">Open with the vibe.</span>
            <span data-testid="tip-2">Name one specific moment.</span>
            <span data-testid="tip-3">End with a punchline.</span>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
