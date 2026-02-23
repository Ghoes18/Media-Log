import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clapperboard,
  Film,
  Gamepad2,
  Music,
  Star,
  Trash2,
  Tv2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function Watchlist() {
  const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const { currentUser, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !currentUser) navigate("/signin");
  }, [authLoading, currentUser, navigate]);

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${currentUser?.id}/watchlist`],
    enabled: !!currentUser?.id,
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (mediaId: string) => {
      if (!currentUser) return;
      await apiRequest("DELETE", `/api/users/${currentUser.id}/watchlist/${mediaId}`);
    },
    onSuccess: () => {
      if (currentUser) queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/watchlist`] });
    },
  });

  const filtered = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i: any) => i.type === activeTab);
  }, [items, activeTab]);

  if (authLoading || isLoading || !currentUser) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground" data-testid="loading-watchlist">Loading…</div>
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
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-watchlist-page-title">
              Watchlist
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-watchlist-page-subtitle">
              A soft queue for later-you.
            </p>
          </div>

          <div className="ml-auto">
            <Button
              variant="secondary"
              className="rounded-md"
              data-testid="button-clear-done"
              onClick={() => setDone({})}
            >
              Clear done
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="glass bg-noise rounded-lg p-5 sm:p-7" data-testid="card-watchlist-controls">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div
                  className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                  data-testid="badge-watchlist"
                >
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  one list, many mediums
                </div>
                <h2 className="mt-3 font-serif text-2xl font-semibold" data-testid="text-watchlist-title">
                  Save it. Sort it. Enjoy it.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground" data-testid="text-watchlist-subtitle">
                  Tap to mark done, or remove an item.
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-6 rounded-md bg-muted/50 p-1 sm:w-[500px]">
                  <TabsTrigger value="all" className="rounded-md" data-testid="tab-all">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="movie" className="rounded-md" data-testid="tab-movie">
                    Movies
                  </TabsTrigger>
                  <TabsTrigger value="anime" className="rounded-md" data-testid="tab-anime">
                    Anime
                  </TabsTrigger>
                  <TabsTrigger value="book" className="rounded-md" data-testid="tab-book">
                    Books
                  </TabsTrigger>
                  <TabsTrigger value="tv" className="rounded-md" data-testid="tab-tv">
                    TV
                  </TabsTrigger>
                  <TabsTrigger value="game" className="rounded-md" data-testid="tab-game">
                    Games
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {filtered.map((it: any) => {
                const Icon = iconFor(it.type as MediaType);
                const isDone = !!done[it.id];
                return (
                  <Card
                    key={it.id}
                    className={cn(
                      "rounded-lg border border-border bg-card p-4 sm:p-5 transition",
                      isDone ? "opacity-80" : "hover:opacity-[0.98]",
                    )}
                    data-testid={`row-item-${it.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="relative h-20 w-16 overflow-hidden rounded-md border bg-card shadow-sm"
                        data-testid={`img-cover-${it.id}`}
                      >
                        <div className={cn("absolute inset-0 bg-gradient-to-br grayscale contrast-125", it.coverGradient)} />
                        {it.coverUrl && (
                          <img src={it.coverUrl} alt={it.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                        <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
                          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "truncate text-sm font-semibold",
                                isDone && "line-through decoration-muted-foreground/40",
                              )}
                              data-testid={`text-title-${it.id}`}
                            >
                              {it.title}
                            </div>
                            <div className="truncate text-xs text-muted-foreground" data-testid={`text-meta-${it.id}`}>
                              {it.creator}
                              {it.year ? ` · ${it.year}` : ""}
                            </div>
                          </div>
                          <Badge variant="secondary" className="rounded-full" data-testid={`badge-type-${it.id}`}>
                            {it.type}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {(it.tags ?? []).slice(0, 3).map((t: string) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="rounded-full"
                              data-testid={`badge-tag-${it.id}-${t}`}
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            className="rounded-md"
                            variant={isDone ? "secondary" : "default"}
                            data-testid={`button-done-${it.id}`}
                            onClick={() => setDone((p) => ({ ...p, [it.id]: !p[it.id] }))}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            {isDone ? "Undone" : "Mark done"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-md"
                            data-testid={`button-remove-${it.id}`}
                            onClick={() => removeFromWatchlist.mutate(it.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {filtered.length === 0 ? (
                <div className="rounded-lg border bg-card/60 p-10 text-center" data-testid="empty-watchlist">
                  <div className="font-serif text-xl font-semibold">Nothing here (yet).</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Switch the filter or add a few items from Discover.
                  </p>
                  <div className="mt-4">
                    <Button className="rounded-md" data-testid="button-go-discover" asChild>
                      <Link href="/discover" data-testid="link-go-discover">
                        Browse Discover
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
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
          <Link href="/watchlist" data-testid="nav-watchlist" className="text-sm font-medium hover:opacity-80">
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
