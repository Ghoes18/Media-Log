import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Film,
  Gamepad2,
  Music,
  Star,
  Tv2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StarRatingSelector } from "@/components/star-rating-selector";
import { Textarea } from "@/components/ui/textarea";

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

export default function ReviewCreate() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, isLoading: authLoading } = useAuth();
  const [medium, setMedium] = useState<MediaType>("movie");
  const [title, setTitle] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!authLoading && !currentUser) navigate("/signin");
  }, [authLoading, currentUser, navigate]);

  const { data: allMedia = [], isLoading: mediaLoading } = useQuery<any[]>({
    queryKey: ["/api/media"],
  });

  const quickPick = useMemo(() => {
    let filtered = allMedia.filter((m: any) => m.type === medium);
    if (title && !selectedMediaId) {
      filtered = filtered.filter((m: any) =>
        m.title.toLowerCase().includes(title.toLowerCase())
      );
    }
    return filtered;
  }, [medium, allMedia, title, selectedMediaId]);

  const titleMatches = useMemo(() => {
    if (!title || selectedMediaId) return [];
    return allMedia.filter((m: any) =>
      m.title.toLowerCase().includes(title.toLowerCase())
    );
  }, [title, allMedia, selectedMediaId]);

  const publishMutation = useMutation({
    mutationFn: async (data: { mediaId: string; rating: number; body: string }) => {
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

  const Icon = iconFor(medium);

  const canPublish = !!selectedMediaId && text.trim().length > 0 && !publishMutation.isPending;

  const handlePublish = () => {
    if (!currentUser || !selectedMediaId) return;
    publishMutation.mutate({
      mediaId: selectedMediaId,
      rating,
      body: text,
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

  const handleTitleMatch = (m: any) => {
    setTitle(m.title);
    setSelectedMediaId(m.id);
  };

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

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
            <Card className="glass bg-noise rounded-lg p-5 sm:p-7" data-testid="card-editor">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                    data-testid="badge-new"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    log a feeling
                  </div>
                  <h2 className="mt-3 font-serif text-2xl font-semibold" data-testid="text-editor-title">
                    Write it like a postcard.
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground" data-testid="text-editor-subtitle">
                    Keep it specific. Keep it honest.
                  </p>
                </div>
                <div className="rounded-md border bg-card/60 px-3 py-2" data-testid="pill-medium">
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
                    onValueChange={(v) => {
                      setMedium(v as any);
                      setSelectedMediaId(null);
                      setTitle("");
                    }}
                  >
                    <SelectTrigger className="rounded-md" data-testid="select-medium">
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie" data-testid="option-medium-movie">
                        Movie
                      </SelectItem>
                      <SelectItem value="anime" data-testid="option-medium-anime">
                        Animation
                      </SelectItem>
                      <SelectItem value="book" data-testid="option-medium-book">
                        Book
                      </SelectItem>
                      <SelectItem value="tv" data-testid="option-medium-tv">
                        TV Show
                      </SelectItem>
                      <SelectItem value="music" data-testid="option-medium-music">
                        Music
                      </SelectItem>
                      <SelectItem value="game" data-testid="option-medium-game">
                        Video Game
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-title">Title</Label>
                  <div className="relative">
                    <Input
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Search or type a title…"
                      className="rounded-md"
                      data-testid="input-title"
                    />
                    {titleMatches.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border bg-card shadow-lg">
                        {titleMatches.map((m: any) => (
                          <button
                            key={m.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                            data-testid={`suggestion-${m.id}`}
                            onClick={() => handleTitleMatch(m)}
                          >
                            <span className="font-medium">{m.title}</span>
                            {m.year && <span className="text-muted-foreground">({m.year})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mediaLoading ? (
                      <span className="text-xs text-muted-foreground">Loading…</span>
                    ) : (
                      quickPick.map((m: any) => (
                        <Button
                          key={m.id}
                          variant="secondary"
                          size="sm"
                          className="rounded-full"
                          data-testid={`button-quick-${m.id}`}
                          onClick={() => handleQuickPick(m)}
                        >
                          {m.title}
                        </Button>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-rating">Rating</Label>
                  <div className="flex items-center gap-2">
                    <StarRatingSelector value={rating} onChange={setRating} />
                    <Badge variant="secondary" className="rounded-full" data-testid="text-rating">
                      {Number.isInteger(rating) ? rating : rating.toFixed(1)} / 5
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-text">Review</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What did it taste like? A mood, a color, a quote…"
                    className="min-h-[160px] rounded-md"
                    data-testid="input-review-text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    className="rounded-md"
                    data-testid="button-save-draft"
                    onClick={() => {}}
                  >
                    Save draft
                  </Button>
                  <Button
                    className="rounded-md"
                    data-testid="button-publish"
                    disabled={!canPublish}
                    onClick={handlePublish}
                  >
                    {publishMutation.isPending ? "Publishing…" : "Publish"}
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <Card className="rounded-lg border border-border bg-card p-5 sm:p-7" data-testid="card-preview">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-preview-title">
                    Preview
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-preview-subtitle">
                    How it'll look in the feed.
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full" data-testid="badge-live">
                  Live
                </Badge>
              </div>

              <Separator className="my-4" />

              <div className="rounded-lg border bg-card/60 p-4" data-testid="preview-card">
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

            <Card className="rounded-lg border border-border bg-card p-5 sm:p-7" data-testid="card-guidelines">
              <div className="font-serif text-lg font-semibold" data-testid="text-guidelines-title">
                A quick rubric
              </div>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="text-guidelines-body">
                Great reviews are: (1) a feeling, (2) one detail, (3) one sentence you'll remember.
              </p>
              <Separator className="my-4" />
              <div className="grid gap-2 text-sm">
                <div className="rounded-md border bg-card/60 px-3 py-2" data-testid="tip-1">
                  Open with the vibe.
                </div>
                <div className="rounded-md border bg-card/60 px-3 py-2" data-testid="tip-2">
                  Name one specific moment.
                </div>
                <div className="rounded-md border bg-card/60 px-3 py-2" data-testid="tip-3">
                  End with a punchline.
                </div>
              </div>
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
