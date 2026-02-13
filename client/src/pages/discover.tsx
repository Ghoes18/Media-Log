import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Filter,
  Film,
  Flame,
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

type MediaType = "movie" | "anime" | "book" | "tv";

type Media = {
  id: string;
  type: MediaType;
  title: string;
  year?: string;
  creator?: string;
  coverGradient: string;
  ratingAvg: number;
  tags: string[];
};

const mediaSeed: Media[] = [
  {
    id: "m1",
    type: "movie",
    title: "Blade Runner 2049",
    year: "2017",
    creator: "Denis Villeneuve",
    coverGradient: "from-violet-500/30 via-fuchsia-500/20 to-emerald-400/20",
    ratingAvg: 4.3,
    tags: ["neo-noir", "sci-fi", "mood"],
  },
  {
    id: "m2",
    type: "anime",
    title: "Cowboy Bebop",
    year: "1998",
    creator: "Shinichirō Watanabe",
    coverGradient: "from-orange-500/25 via-rose-500/15 to-sky-500/15",
    ratingAvg: 4.6,
    tags: ["space", "jazz", "classic"],
  },
  {
    id: "m3",
    type: "book",
    title: "The Left Hand of Darkness",
    year: "1969",
    creator: "Ursula K. Le Guin",
    coverGradient: "from-sky-500/20 via-indigo-500/15 to-emerald-500/15",
    ratingAvg: 4.4,
    tags: ["speculative", "politics", "ice"],
  },
  {
    id: "m4",
    type: "tv",
    title: "The Bear",
    year: "2022",
    creator: "Christopher Storer",
    coverGradient: "from-emerald-500/20 via-teal-500/15 to-amber-500/15",
    ratingAvg: 4.1,
    tags: ["chaos", "kitchen", "hearts"],
  },
  {
    id: "m5",
    type: "movie",
    title: "Spirited Away",
    year: "2001",
    creator: "Hayao Miyazaki",
    coverGradient: "from-emerald-500/25 via-cyan-500/15 to-violet-500/15",
    ratingAvg: 4.7,
    tags: ["wonder", "myth", "coming-of-age"],
  },
  {
    id: "m6",
    type: "book",
    title: "Pachinko",
    year: "2017",
    creator: "Min Jin Lee",
    coverGradient: "from-rose-500/25 via-amber-500/10 to-emerald-500/10",
    ratingAvg: 4.2,
    tags: ["family", "history", "diaspora"],
  },
  {
    id: "m7",
    type: "tv",
    title: "Severance",
    year: "2022",
    creator: "Dan Erickson",
    coverGradient: "from-sky-500/20 via-cyan-500/10 to-emerald-500/10",
    ratingAvg: 4.5,
    tags: ["mystery", "work", "dread"],
  },
  {
    id: "m8",
    type: "anime",
    title: "Ping Pong",
    year: "2014",
    creator: "Masaaki Yuasa",
    coverGradient: "from-lime-500/20 via-amber-500/10 to-rose-500/10",
    ratingAvg: 4.4,
    tags: ["sports", "artstyle", "heart"],
  },
];

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

function CoverMini({ m }: { m: Media }) {
  const Icon = mediaIcon(m.type);
  return (
    <div
      className="relative h-20 w-16 overflow-hidden rounded-2xl border bg-card shadow-sm"
      data-testid={`img-cover-${m.id}`}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", m.coverGradient)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
      <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
        <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
      </div>
    </div>
  );
}

export default function Discover() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaType | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? mediaSeed.filter((m) =>
          [m.title, m.creator, m.year].some((v) => (v ?? "").toLowerCase().includes(q)),
        )
      : mediaSeed;

    if (activeTab === "all") return base;
    return base.filter((m) => m.type === activeTab);
  }, [query, activeTab]);

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
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-discover-title">
              Discover
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-discover-subtitle">
              Trending lists, fresh reviews, and niche gems.
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" className="rounded-xl" data-testid="button-filter">
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
          <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-search">
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
                  Search across films, anime, books, and TV shows.
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full items-center gap-2 rounded-2xl border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, creators, years…"
                  className="h-9 rounded-xl"
                  data-testid="input-discover-search"
                />
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-muted/50 p-1 sm:w-[420px]">
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
            </div>
          </Card>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <h3 className="font-serif text-xl font-semibold" data-testid="text-results-title">
                Results
              </h3>
              <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                {filtered.length} items
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              {filtered.map((m) => (
                <Link key={m.id} href={`/m/${m.id}`} data-testid={`link-result-${m.id}`}>
                  <a>
                    <Card className="glass bg-noise rounded-3xl p-4 sm:p-5 hover:opacity-[0.98] transition">
                      <div className="flex items-center gap-4">
                        <CoverMini m={m} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold" data-testid={`text-title-${m.id}`}>
                                {m.title}
                              </div>
                              <div className="truncate text-xs text-muted-foreground" data-testid={`text-meta-${m.id}`}>
                                {m.creator}
                                {m.year ? ` · ${m.year}` : ""}
                              </div>
                            </div>
                            <Badge variant="secondary" className="rounded-full" data-testid={`badge-type-${m.id}`}>
                              {m.type}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {m.tags.slice(0, 3).map((t) => (
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
                        </div>
                      </div>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" data-testid="nav-home">
            <a className="text-sm font-medium text-muted-foreground hover:text-foreground">Home</a>
          </Link>
          <Link href="/discover" data-testid="nav-discover">
            <a className="text-sm font-medium hover:opacity-80">Discover</a>
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
