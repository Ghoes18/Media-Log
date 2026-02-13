import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Film,
  Heart,
  Plus,
  Settings2,
  Star,
  Tv2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type Activity = {
  id: string;
  kind: "review" | "like" | "watchlist";
  when: string;
  blurb: string;
  media: Media;
};

const favoritesSeed: Media[] = [
  {
    id: "m5",
    type: "movie",
    title: "Spirited Away",
    year: "2001",
    creator: "Hayao Miyazaki",
    coverGradient: "from-emerald-500/25 via-cyan-500/15 to-violet-500/15",
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
];

const activitySeed: Activity[] = [
  {
    id: "a1",
    kind: "review",
    when: "Today",
    blurb: "Reviewed Cowboy Bebop · 5★",
    media: favoritesSeed[1],
  },
  {
    id: "a2",
    kind: "watchlist",
    when: "Yesterday",
    blurb: "Added Severance to watchlist",
    media: {
      id: "m7",
      type: "tv",
      title: "Severance",
      year: "2022",
      creator: "Dan Erickson",
      coverGradient: "from-sky-500/20 via-cyan-500/10 to-emerald-500/10",
    },
  },
  {
    id: "a3",
    kind: "like",
    when: "2d",
    blurb: "Liked Luna’s review of The Left Hand of Darkness",
    media: favoritesSeed[2],
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

export default function Profile() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle ?? "you";

  const isMe = handle === "you";

  const [following, setFollowing] = useState(!isMe);

  const profile = useMemo(() => {
    const name = isMe ? "You" : handle.slice(0, 1).toUpperCase() + handle.slice(1);
    const bio = isMe
      ? "Writing small reviews like postcards. Mostly sci-fi, quiet dramas, and books that change your brain."
      : "Taste: neon, tenderness, and slightly unhinged TV seasons.";

    return {
      handle,
      name,
      bio,
      stats: {
        reviews: isMe ? 38 : 121,
        followers: isMe ? 214 : 845,
        following: isMe ? 119 : 92,
      },
    };
  }, [handle, isMe]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:flex sm:gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-xl"
            data-testid="button-back"
            asChild
          >
            <Link href="/" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="min-w-0">
            <h1 className="truncate font-serif text-base font-semibold sm:text-lg" data-testid="text-profile-title">
              {profile.name}
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-profile-handle">
              @{profile.handle}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isMe ? (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-xl sm:hidden"
                  data-testid="button-settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  className="hidden h-10 rounded-xl sm:inline-flex"
                  data-testid="button-edit-profile"
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Edit profile
                </Button>
              </>
            ) : (
              <Button
                className="h-10 rounded-xl"
                variant={following ? "secondary" : "default"}
                data-testid="button-follow"
                onClick={() => setFollowing((v) => !v)}
              >
                <span className="sm:hidden" data-testid="text-follow-compact">
                  {following ? "Following" : "Follow"}
                </span>
                <span className="hidden sm:inline" data-testid="text-follow-full">
                  {following ? (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Follow
                    </>
                  )}
                </span>
              </Button>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <Tabs defaultValue="overview" className="w-full" data-testid="tabs-profile">
              <TabsList className="w-full rounded-2xl border bg-card/60 p-1" data-testid="tabs-list-profile">
                <TabsTrigger value="overview" className="flex-1 rounded-xl" data-testid="tab-overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="faves" className="flex-1 rounded-xl" data-testid="tab-faves">
                  Favorites
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 rounded-xl" data-testid="tab-activity">
                  Activity
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
          <section className="space-y-4">
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-profile-header">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 ring-1 ring-border" data-testid="avatar-profile">
                  <AvatarImage alt={profile.name} src="" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                    {profile.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-serif text-2xl font-semibold" data-testid="text-name">
                          {profile.name}
                        </h2>
                        <Badge variant="secondary" className="rounded-full" data-testid="badge-pro">
                          <Star className="mr-1 h-3.5 w-3.5 fill-primary text-primary" />
                          PROTOTYPE
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-testid="text-bio">
                        {profile.bio}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border bg-card/60 p-3" data-testid="stat-reviews">
                      <div className="text-xs text-muted-foreground">Reviews</div>
                      <div className="mt-1 font-serif text-lg font-semibold">{profile.stats.reviews}</div>
                    </div>
                    <div className="rounded-2xl border bg-card/60 p-3" data-testid="stat-followers">
                      <div className="text-xs text-muted-foreground">Followers</div>
                      <div className="mt-1 font-serif text-lg font-semibold">{profile.stats.followers}</div>
                    </div>
                    <div className="rounded-2xl border bg-card/60 p-3" data-testid="stat-following">
                      <div className="text-xs text-muted-foreground">Following</div>
                      <div className="mt-1 font-serif text-lg font-semibold">{profile.stats.following}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-favorites">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-favorites-title">
                    Favorites
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-favorites-subtitle">
                    A little shelf of you.
                  </div>
                </div>
                <Button variant="secondary" className="rounded-xl" data-testid="button-edit-favorites">
                  Edit
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-4 gap-2">
                {favoritesSeed.map((m) => {
                  const Icon = iconFor(m.type);
                  return (
                    <Link
                      key={m.id}
                      href={`/m/${m.id}`}
                      data-testid={`link-favorite-${m.id}`}
                      className="group"
                    >
                      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className={cn("relative aspect-[3/4] bg-gradient-to-br", m.coverGradient)}>
                          <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
                            <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>

            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-watchlist">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-watchlist-title">
                    Watchlist
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-watchlist-subtitle">
                    Save things for later.
                  </div>
                </div>
                <Link
                  href="/watchlist"
                  data-testid="link-watchlist"
                  className="text-sm font-medium text-primary hover:opacity-80"
                >
                  Open
                </Link>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-2">
                {["m7", "m8", "m9", "m10"].map((id) => (
                  <Link
                    key={id}
                    href={`/m/${id}`}
                    data-testid={`link-watch-${id}`}
                    className="rounded-2xl border bg-card/60 px-3 py-2 text-sm font-medium hover:bg-card/80 transition"
                  >
                    {id}
                  </Link>
                ))}
              </div>
            </Card>
          </section>

          <section>
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7" data-testid="card-activity">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold" data-testid="text-activity-title">
                    Recent activity
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-activity-subtitle">
                    Reviews, likes, and saves.
                  </div>
                </div>
                <Button variant="secondary" className="rounded-xl" data-testid="button-activity-filter">
                  Filter
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                {activitySeed.map((a) => (
                  <Link key={a.id} href={`/m/${a.media.id}`} data-testid={`link-activity-${a.id}`}>
                    <Card className="rounded-3xl border bg-card/60 p-4 hover:bg-card/80 transition">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "h-12 w-10 overflow-hidden rounded-2xl border bg-card shadow-sm",
                          )}
                        >
                          <div className={cn("h-full w-full bg-gradient-to-br", a.media.coverGradient)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-semibold" data-testid={`text-activity-blurb-${a.id}`}>
                              {a.blurb}
                            </div>
                            <div className="text-xs text-muted-foreground" data-testid={`text-activity-when-${a.id}`}>
                              {a.when}
                            </div>
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground" data-testid={`text-activity-title-${a.id}`}>
                            {a.media.title}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        </motion.div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
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
          <Link href="/u/you" data-testid="nav-profile" className="text-sm font-medium hover:opacity-80">
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
