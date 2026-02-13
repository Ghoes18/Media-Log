import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Film,
  Sparkles,
  Star,
  Tv2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MediaType = "movie" | "anime" | "book" | "tv";

type Media = {
  id: string;
  type: MediaType;
  title: string;
  creator?: string;
  year?: string;
  coverGradient: string;
};

const seed: Media[] = [
  {
    id: "m1",
    type: "movie",
    title: "Blade Runner 2049",
    year: "2017",
    creator: "Denis Villeneuve",
    coverGradient: "from-violet-500/30 via-fuchsia-500/20 to-emerald-400/20",
  },
  {
    id: "m2",
    type: "anime",
    title: "Cowboy Bebop",
    year: "1998",
    creator: "Shinichirō Watanabe",
    coverGradient: "from-orange-500/25 via-rose-500/15 to-sky-500/15",
  },
  {
    id: "m3",
    type: "book",
    title: "The Left Hand of Darkness",
    year: "1969",
    creator: "Ursula K. Le Guin",
    coverGradient: "from-sky-500/20 via-indigo-500/15 to-emerald-500/15",
  },
  {
    id: "m4",
    type: "tv",
    title: "The Bear",
    year: "2022",
    creator: "Christopher Storer",
    coverGradient: "from-emerald-500/20 via-teal-500/15 to-amber-500/15",
  },
  {
    id: "m5",
    type: "movie",
    title: "Spirited Away",
    year: "2001",
    creator: "Hayao Miyazaki",
    coverGradient: "from-emerald-500/25 via-cyan-500/15 to-violet-500/15",
  },
];

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

export default function ReviewCreate() {
  const [medium, setMedium] = useState<MediaType>("movie");
  const [title, setTitle] = useState("");
  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");

  const quickPick = useMemo(() => seed.filter((m) => m.type === medium), [medium]);
  const Icon = iconFor(medium);

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
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-new-review-title">
              New review
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-new-review-subtitle">
              A tiny essay, not a sermon.
            </p>
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
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-editor">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                    data-testid="badge-new"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    log a feeling
                  </div>
                  <h2 className="mt-3 font-serif text-2xl font-semibold" data-testid="text-editor-title">
                    Write it like a postcard.
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground" data-testid="text-editor-subtitle">
                    Keep it specific. Keep it honest.
                  </p>
                </div>
                <div className="rounded-2xl border bg-card/60 px-3 py-2" data-testid="pill-medium">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {medium.toUpperCase()}
                  </div>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label data-testid="label-medium">Medium</Label>
                  <Select
                    value={medium}
                    onValueChange={(v) => setMedium(v as any)}
                  >
                    <SelectTrigger className="rounded-2xl" data-testid="select-medium">
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie" data-testid="option-medium-movie">
                        Movie
                      </SelectItem>
                      <SelectItem value="anime" data-testid="option-medium-anime">
                        Anime
                      </SelectItem>
                      <SelectItem value="book" data-testid="option-medium-book">
                        Book
                      </SelectItem>
                      <SelectItem value="tv" data-testid="option-medium-tv">
                        TV Show
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-title">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Search or type a title…"
                    className="rounded-2xl"
                    data-testid="input-title"
                  />
                  <div className="flex flex-wrap gap-2">
                    {quickPick.map((m) => (
                      <Button
                        key={m.id}
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        data-testid={`button-quick-${m.id}`}
                        onClick={() => setTitle(m.title)}
                      >
                        {m.title}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-rating">Rating</Label>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const v = i + 1;
                      return (
                        <Button
                          key={v}
                          variant={v <= rating ? "default" : "secondary"}
                          size="icon"
                          className={cn("h-10 w-10 rounded-xl", v <= rating ? "" : "")}
                          data-testid={`button-star-${v}`}
                          onClick={() => setRating(v)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      );
                    })}
                    <Badge variant="secondary" className="rounded-full" data-testid="text-rating">
                      {rating} / 5
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-text">Review</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What did it taste like? A mood, a color, a quote…"
                    className="min-h-[160px] rounded-2xl"
                    data-testid="input-review-text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    data-testid="button-save-draft"
                    onClick={() => {}}
                  >
                    Save draft
                  </Button>
                  <Button
                    className="rounded-xl"
                    data-testid="button-publish"
                    onClick={() => {
                      setTitle("");
                      setText("");
                      setRating(4);
                    }}
                  >
                    Publish
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-preview">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-preview-title">
                    Preview
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-preview-subtitle">
                    How it’ll look in the feed.
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full" data-testid="badge-live">
                  Live
                </Badge>
              </div>

              <Separator className="my-4" />

              <div className="rounded-3xl border bg-card/60 p-4" data-testid="preview-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" data-testid="text-preview-author">
                      You
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" data-testid="text-preview-meta">
                      reviewed <span className="font-medium text-foreground">{title || "(pick a title)"}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full" data-testid="badge-preview-rating">
                    {rating}★
                  </Badge>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-foreground/90" data-testid="text-preview-body">
                  {text || "Write something small and specific. Mention a moment."}
                </p>
              </div>
            </Card>

            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-guidelines">
              <div className="font-serif text-lg font-semibold" data-testid="text-guidelines-title">
                A quick rubric
              </div>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="text-guidelines-body">
                Great reviews are: (1) a feeling, (2) one detail, (3) one sentence you’ll remember.
              </p>
              <Separator className="my-4" />
              <div className="grid gap-2 text-sm">
                <div className="rounded-2xl border bg-card/60 px-3 py-2" data-testid="tip-1">
                  Open with the vibe.
                </div>
                <div className="rounded-2xl border bg-card/60 px-3 py-2" data-testid="tip-2">
                  Name one specific moment.
                </div>
                <div className="rounded-2xl border bg-card/60 px-3 py-2" data-testid="tip-3">
                  End with a punchline.
                </div>
              </div>
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
