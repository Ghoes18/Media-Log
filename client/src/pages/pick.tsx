import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Film,
  Gamepad2,
  Music,
  Shuffle,
  Star,
  Tv2,
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEnsureMedia } from "@/lib/use-ensure-media";

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

async function fetchRandomMedia(mode: "categories" | "imdbTop250", categories: string[]) {
  const params = new URLSearchParams();
  params.set("mode", mode);
  if (mode === "categories" && categories.length > 0) {
    params.set("categories", categories.join(","));
  }
  const res = await fetch(`/api/picker/random?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function fetchRoulettePool(categories: string[], isImdb: boolean): Promise<any[]> {
  try {
    if (isImdb) {
      const res = await fetch("/api/trending/movie?limit=20");
      if (!res.ok) return [];
      return res.json();
    }
    const fetches = categories.map((cat) =>
      fetch(`/api/trending/${cat}?limit=12`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );
    const results = await Promise.all(fetches);
    const pool = results.flat().filter((m: any) => m && (m.title || m.name));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  } catch {
    return [];
  }
}

function normalizeForEnsure(m: any) {
  return {
    id: m.id,
    externalId: m.externalId ?? "",
    type: m.type || "movie",
    title: m.title || m.name || "Unknown",
    creator: m.creator ?? "",
    year: m.year ?? "",
    coverUrl: m.coverUrl ?? "",
    coverGradient: m.coverGradient ?? "from-slate-700 to-slate-900",
    synopsis: m.synopsis ?? "",
    tags: m.tags ?? [],
    rating: m.rating ?? "",
  };
}

const SPIN_INTERVAL_START = 60;
const SPIN_INTERVAL_END = 280;
const SPIN_STEPS = 18;

function RouletteOverlay({
  isVisible,
  pool,
  pickedMedia,
  prefersReducedMotion,
}: {
  isVisible: boolean;
  pool: any[];
  pickedMedia: any | null;
  prefersReducedMotion: boolean | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"spinning" | "slowing" | "reveal">("spinning");
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!isVisible) {
      setPhase("spinning");
      stepRef.current = 0;
      return;
    }
    if (pickedMedia) {
      setPhase("reveal");
      if (intervalRef.current) clearTimeout(intervalRef.current);
      return;
    }
    if (pool.length === 0) return;

    setPhase("spinning");
    stepRef.current = 0;

    const tick = () => {
      setCurrentIndex((i) => (i + 1) % pool.length);
      stepRef.current += 1;

      if (stepRef.current >= SPIN_STEPS) {
        setPhase("slowing");
      }

      const progress = Math.min(stepRef.current / (SPIN_STEPS + 8), 1);
      const eased = progress * progress;
      const delay =
        SPIN_INTERVAL_START + (SPIN_INTERVAL_END - SPIN_INTERVAL_START) * eased;

      intervalRef.current = setTimeout(tick, delay);
    };

    intervalRef.current = setTimeout(tick, SPIN_INTERVAL_START);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isVisible, pickedMedia, pool.length]);

  if (!isVisible) return null;

  const hasPool = pool.length > 0;
  const currentItem = hasPool ? pool[currentIndex % pool.length] : null;
  const CurrentIcon = currentItem ? mediaIcon(currentItem.type) : Shuffle;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
    >
      <AnimatePresence mode="wait">
        {phase !== "reveal" ? (
          <motion.div
            key="spin"
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            className="flex flex-col items-center justify-center gap-6"
          >
            {hasPool && currentItem ? (
              <>
                <div className="relative h-56 w-40 sm:h-64 sm:w-48 overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-border/50">
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br contrast-125",
                      currentItem.coverGradient || "from-slate-700 to-slate-900"
                    )}
                  />
                  {currentItem.coverUrl && (
                    <img
                      src={currentItem.coverUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute left-2.5 top-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white ring-1 ring-white/15 backdrop-blur-sm">
                      <CurrentIcon className="h-3 w-3" strokeWidth={2} />
                      {(currentItem.type || "").toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <div className="truncate text-sm font-semibold text-white drop-shadow-sm">
                      {currentItem.title || currentItem.name}
                    </div>
                    {currentItem.creator && (
                      <div className="truncate text-xs text-white/70">
                        {currentItem.creator}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="font-serif text-lg font-semibold text-foreground/80 animate-pulse">
                    {phase === "slowing" ? "Almost there..." : "Shuffling..."}
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card shadow-xl ring-1 ring-border">
                  <Shuffle className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="font-serif text-lg font-semibold text-foreground/80 animate-pulse">
                  Loading pool...
                </div>
              </div>
            )}
          </motion.div>
        ) : pickedMedia ? (
          <motion.div
            key="picked"
            initial={{ opacity: 0, scale: 0.5, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
              duration: prefersReducedMotion ? 0 : 0.6,
            }}
            className="flex flex-col items-center text-center px-6 w-full max-w-sm"
          >
            <div className="relative h-72 w-52 sm:h-80 sm:w-56 overflow-hidden rounded-xl border bg-card shadow-2xl ring-2 ring-primary/30">
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br contrast-125",
                  pickedMedia.coverGradient || "from-slate-700 to-slate-900"
                )}
              />
              {pickedMedia.coverUrl && (
                <img
                  src={pickedMedia.coverUrl}
                  alt={pickedMedia.title || pickedMedia.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {(() => {
                const RevealIcon = mediaIcon(pickedMedia.type);
                return (
                  <div className="absolute left-3 top-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/15 backdrop-blur-sm">
                      <RevealIcon className="h-3.5 w-3.5" strokeWidth={2} />
                      {(pickedMedia.type || "").toUpperCase()}
                    </span>
                  </div>
                );
              })()}

              {pickedMedia.rating && (
                <div className="absolute right-3 top-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {Number.parseFloat(pickedMedia.rating).toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : 0.15,
                duration: 0.35,
              }}
              className="mt-5 font-serif text-2xl font-bold leading-tight sm:text-3xl"
            >
              {pickedMedia.title || pickedMedia.name}
            </motion.h2>

            {pickedMedia.creator && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: prefersReducedMotion ? 0 : 0.25,
                  duration: 0.3,
                }}
                className="mt-1 text-sm text-muted-foreground"
              >
                {pickedMedia.creator}
                {pickedMedia.year ? ` \u00B7 ${pickedMedia.year}` : ""}
              </motion.p>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: prefersReducedMotion ? 0 : 0.4,
                duration: 0.3,
              }}
              className="mt-3 text-xs text-muted-foreground/70"
            >
              Opening...
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Pick() {
  const [categories, setCategories] = useState<Set<MediaType>>(new Set());
  const [imdbTop250, setImdbTop250] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [pickedMedia, setPickedMedia] = useState<any>(null);
  const [roulettePool, setRoulettePool] = useState<any[]>([]);

  const { ensureAndNavigate, isPending: ensurePending } = useEnsureMedia();
  const prefersReducedMotion = useReducedMotion();

  const startRoulette = useCallback(async () => {
    const cats = imdbTop250 ? [] : Array.from(categories);
    setShowOverlay(true);
    setPickedMedia(null);
    setRoulettePool([]);

    const pool = await fetchRoulettePool(cats, imdbTop250);
    setRoulettePool(pool);
  }, [categories, imdbTop250]);

  const pickMutation = useMutation({
    mutationFn: async () => {
      const mode = imdbTop250 ? "imdbTop250" : "categories";
      const cats = imdbTop250 ? [] : Array.from(categories);
      const [res] = await Promise.all([
        fetchRandomMedia(mode, cats),
        new Promise((resolve) => setTimeout(resolve, 2400)),
      ]);
      return res;
    },
    onSuccess: (data) => {
      setPickedMedia(data);
      setTimeout(() => {
        ensureAndNavigate(normalizeForEnsure(data));
      }, 2200);
    },
    onError: () => {
      setShowOverlay(false);
      setRoulettePool([]);
    },
  });

  const handleRandomize = () => {
    startRoulette();
    pickMutation.mutate();
  };

  const canRandomize = imdbTop250 || categories.size > 0;
  const isPending = pickMutation.isPending || ensurePending;

  const toggleCategory = (t: MediaType) => {
    if (imdbTop250) return;
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleImdbTop250 = () => {
    if (imdbTop250) {
      setImdbTop250(false);
    } else {
      setImdbTop250(true);
      setCategories(new Set());
    }
  };

  const selectAllCategories = () => {
    if (imdbTop250) return;
    setCategories(new Set(MEDIA_TYPES));
  };

  const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.2 };

  return (
    <div className="min-h-dvh bg-background">
      <RouletteOverlay
        isVisible={showOverlay}
        pool={roulettePool}
        pickedMedia={pickedMedia}
        prefersReducedMotion={prefersReducedMotion}
      />

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
            <h1
              className="truncate font-serif text-lg font-semibold"
              data-testid="text-pick-title"
            >
              Pick for me
            </h1>
            <p
              className="truncate text-xs text-muted-foreground"
              data-testid="text-pick-subtitle"
            >
              Too indecisive? Let fate decide.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card
            className="glass bg-noise rounded-lg p-5 sm:p-7"
            data-testid="card-pick"
          >
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                data-testid="badge-pick"
              >
                <Shuffle className="h-3.5 w-3.5 text-primary" />
                one tap, one pick
              </div>
              <h2
                className="mt-3 font-serif text-2xl font-semibold"
                data-testid="text-pick-heading"
              >
                Choose your pool.
              </h2>
              <p
                className="mt-1 text-sm text-muted-foreground"
                data-testid="text-pick-desc"
              >
                Select one, some, or all categories. Or pick from IMDb Top 250.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_TYPES.map((t) => {
                    const Icon = mediaIcon(t);
                    const selected = categories.has(t);
                    const disabled = imdbTop250;
                    const baseProps = {
                      key: t,
                      type: "button" as const,
                      onClick: () => toggleCategory(t),
                      disabled,
                      "data-testid": `chip-${t}`,
                      className: cn(
                        "inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card hover:bg-card/80",
                        disabled && "cursor-not-allowed opacity-50"
                      ),
                    };
                    return selected ? (
                      <button {...baseProps} aria-pressed="true">
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                        {MEDIA_LABELS[t]}
                      </button>
                    ) : (
                      <button {...baseProps} aria-pressed="false">
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                        {MEDIA_LABELS[t]}
                      </button>
                    );
                  })}
                  {!imdbTop250 && (
                    <button
                      type="button"
                      onClick={selectAllCategories}
                      data-testid="button-select-all"
                      className="inline-flex min-h-[44px] items-center rounded-full border border-dashed border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Select all
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Special
                </p>
                {imdbTop250 ? (
                  <button
                    type="button"
                    onClick={toggleImdbTop250}
                    disabled={categories.size > 0}
                    aria-pressed="true"
                    data-testid="chip-imdb-top250"
                    className={cn(
                      "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      categories.size > 0 && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Star
                      className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500"
                      strokeWidth={2}
                    />
                    IMDb Top 250
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleImdbTop250}
                    disabled={categories.size > 0}
                    aria-pressed="false"
                    data-testid="chip-imdb-top250"
                    className={cn(
                      "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "border-border bg-card hover:bg-card/80",
                      categories.size > 0 && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Star
                      className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500"
                      strokeWidth={2}
                    />
                    IMDb Top 250
                  </button>
                )}
                {categories.size > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Clear categories above to use IMDb Top 250.
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  skeuo
                  size="lg"
                  disabled={!canRandomize || isPending}
                  onClick={handleRandomize}
                  data-testid="button-randomize"
                  className="min-h-[48px] w-full rounded-md font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="flex items-center gap-2">
                    <Shuffle className="h-5 w-5" strokeWidth={2} />
                    Randomize
                  </span>
                </Button>
              </div>

              <AnimatePresence>
                {pickMutation.isError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="rounded-md border border-destructive/30 bg-destructive/10 p-3"
                    data-testid="error-pick"
                  >
                    <p className="text-sm text-destructive">
                      {pickMutation.error instanceof Error
                        ? pickMutation.error.message
                        : "Something went wrong."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-md"
                      onClick={() => pickMutation.reset()}
                      data-testid="button-retry"
                    >
                      Try again
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
