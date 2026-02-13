import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Clapperboard,
  Film,
  Heart,
  Share2,
  Sparkles,
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

type MediaType = "movie" | "anime" | "book" | "tv";

type Media = {
  id: string;
  type: MediaType;
  title: string;
  year?: string;
  creator?: string;
  coverGradient: string;
  synopsis: string;
  tags: string[];
  ratingAvg: number;
};

type Review = {
  id: string;
  author: { handle: string; name: string };
  rating: number;
  text: string;
  likes: number;
};

const seed: Media[] = [
  {
    id: "m1",
    type: "movie",
    title: "Blade Runner 2049",
    year: "2017",
    creator: "Denis Villeneuve",
    coverGradient: "from-violet-500/30 via-fuchsia-500/20 to-emerald-400/20",
    synopsis:
      "A blade runner unearths a long-buried secret that could plunge what's left of society into chaos — and forces him to question what makes a life real.",
    tags: ["neo-noir", "sci-fi", "mood"],
    ratingAvg: 4.3,
  },
  {
    id: "m2",
    type: "anime",
    title: "Cowboy Bebop",
    year: "1998",
    creator: "Shinichirō Watanabe",
    coverGradient: "from-orange-500/25 via-rose-500/15 to-sky-500/15",
    synopsis:
      "A ragtag crew of bounty hunters drifts through the solar system. Stylish, episodic, and quietly devastating.",
    tags: ["space", "jazz", "classic"],
    ratingAvg: 4.6,
  },
  {
    id: "m3",
    type: "book",
    title: "The Left Hand of Darkness",
    year: "1969",
    creator: "Ursula K. Le Guin",
    coverGradient: "from-sky-500/20 via-indigo-500/15 to-emerald-500/15",
    synopsis:
      "An envoy arrives on a winter planet where gender is fluid — and discovers how politics, loyalty, and love reshape identity.",
    tags: ["speculative", "politics", "ice"],
    ratingAvg: 4.4,
  },
  {
    id: "m4",
    type: "tv",
    title: "The Bear",
    year: "2022",
    creator: "Christopher Storer",
    coverGradient: "from-emerald-500/20 via-teal-500/15 to-amber-500/15",
    synopsis:
      "A fine-dining chef returns home to run his family's sandwich shop — and finds grief, pressure, and tenderness in the heat.",
    tags: ["chaos", "kitchen", "hearts"],
    ratingAvg: 4.1,
  },
  {
    id: "m5",
    type: "movie",
    title: "Spirited Away",
    year: "2001",
    creator: "Hayao Miyazaki",
    coverGradient: "from-emerald-500/25 via-cyan-500/15 to-violet-500/15",
    synopsis:
      "A girl wanders into a spirit world and must work at a bathhouse to save her parents — a story that feels like a dream you remember forever.",
    tags: ["wonder", "myth", "coming-of-age"],
    ratingAvg: 4.7,
  },
];

const reviewSeed: Record<string, Review[]> = {
  m1: [
    {
      id: "rv1",
      author: { handle: "kaito", name: "Kaito" },
      rating: 4.5,
      text: "Neon loneliness done right. A sequel that understands time as texture.",
      likes: 58,
    },
  ],
  m2: [
    {
      id: "rv2",
      author: { handle: "luna", name: "Luna Park" },
      rating: 5,
      text: "Every episode is a different flavor, and the finale is the quiet kind of unforgettable.",
      likes: 92,
    },
  ],
  m3: [
    {
      id: "rv3",
      author: { handle: "mori", name: "Mori" },
      rating: 4,
      text: "A book that makes you re-parse every assumption. Cold world, warm people.",
      likes: 41,
    },
  ],
  m4: [
    {
      id: "rv4",
      author: { handle: "jules", name: "Jules" },
      rating: 4,
      text: "Stressful in the best way. The tenderness sneaks in through the noise.",
      likes: 33,
    },
  ],
  m5: [
    {
      id: "rv5",
      author: { handle: "luna", name: "Luna Park" },
      rating: 5,
      text: "Still the gold standard: wonder that never talks down to you.",
      likes: 120,
    },
  ],
};

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

export default function MediaDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "m1";

  const media = useMemo(() => seed.find((m) => m.id === id) ?? seed[0], [id]);
  const Icon = iconFor(media.type);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState("");

  const reviews = reviewSeed[media.id] ?? [];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" data-testid="link-back-home">
            <a>
              <Button variant="secondary" size="icon" className="rounded-xl" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </a>
          </Link>

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
              className="rounded-xl"
              data-testid="button-save"
              onClick={() => setSaved((v) => !v)}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              {saved ? "Saved" : "Watchlist"}
            </Button>
            <Button
              variant={liked ? "default" : "secondary"}
              className="rounded-xl"
              data-testid="button-like"
              onClick={() => setLiked((v) => !v)}
            >
              <Heart className="mr-2 h-4 w-4" />
              {liked ? "Liked" : "Like"}
            </Button>
            <Button variant="secondary" className="rounded-xl" data-testid="button-share">
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
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-media-hero">
              <div className="flex items-start gap-4">
                <div
                  className="relative h-40 w-28 overflow-hidden rounded-3xl border bg-card shadow-sm"
                  data-testid="img-media-cover"
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br", media.coverGradient)} />
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

                    <div className="rounded-2xl border bg-card/60 px-3 py-2" data-testid="box-rating">
                      <div className="text-xs text-muted-foreground">Avg rating</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="font-serif text-lg font-semibold">{media.ratingAvg.toFixed(1)}</div>
                        <Stars value={media.ratingAvg} />
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-testid="text-synopsis">
                    {media.synopsis}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {media.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full" data-testid={`badge-tag-${t}`}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="glass bg-noise mt-4 rounded-3xl p-5 sm:p-7" data-testid="card-write">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-write-title">
                    Write a quick review
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-write-subtitle">
                    Small, honest, specific.
                  </div>
                </div>
                <Link href="/review/new" data-testid="link-full-editor">
                  <a className="text-sm font-medium text-primary hover:opacity-80">Full editor</a>
                </Link>
              </div>

              <Separator className="my-4" />

              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What did it taste like?"
                className="min-h-[110px] rounded-2xl"
                data-testid="input-quick-review"
              />

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground" data-testid="text-draft-hint">
                  Tip: mention a scene / line / moment.
                </div>
                <Button className="rounded-xl" data-testid="button-post-quick" onClick={() => setDraft("")}
                >
                  Post
                </Button>
              </div>
            </Card>
          </section>

          <section>
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-reviews">
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
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
                  <TabsTrigger value="top" className="rounded-xl" data-testid="tab-top">
                    Top
                  </TabsTrigger>
                  <TabsTrigger value="new" className="rounded-xl" data-testid="tab-new">
                    New
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="top" className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <Card key={r.id} className="rounded-3xl border bg-card/60 p-4" data-testid={`card-review-${r.id}`}>
                      <div className="flex items-start gap-3">
                        <Link href={`/u/${r.author.handle}`} data-testid={`link-review-author-${r.id}`}>
                          <a>
                            <Avatar className="h-10 w-10 ring-1 ring-border" data-testid={`avatar-review-${r.id}`}>
                              <AvatarImage alt={r.author.name} src="" />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                                {r.author.name.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          </a>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-semibold" data-testid={`text-author-${r.id}`}>
                                  {r.author.name}
                                </div>
                                <Badge variant="secondary" className="rounded-full" data-testid={`badge-rating-${r.id}`}>
                                  {r.rating}★
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-xl"
                              data-testid={`button-like-review-${r.id}`}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Like
                              <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                                {r.likes}
                              </span>
                            </Button>
                          </div>

                          <p className="mt-2 text-sm leading-relaxed text-foreground/90" data-testid={`text-review-${r.id}`}>
                            {r.text}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="new" className="mt-4">
                  <div className="rounded-3xl border bg-card/60 p-10 text-center" data-testid="empty-new">
                    <div className="font-serif text-xl font-semibold">New reviews will show up here.</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      In a real app, this is sorted by time.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </section>
        </motion.div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" data-testid="nav-home">
            <a className="text-sm font-medium text-muted-foreground hover:text-foreground">Home</a>
          </Link>
          <Link href="/discover" data-testid="nav-discover">
            <a className="text-sm font-medium text-muted-foreground hover:text-foreground">Discover</a>
          </Link>
          <Link href="/watchlist" data-testid="nav-watchlist">
            <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Watchlist
            </a>
          </Link>
          <Link href="/u/you" data-testid="nav-profile">
            <a className="text-sm font-medium text-muted-foreground hover:text-foreground">Profile</a>
          </Link>
        </div>
      </div>
    </div>
  );
}
