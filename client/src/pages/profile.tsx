import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Film,
  Heart,
  Music,
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

function iconFor(type: string) {
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
    default:
      return Film;
  }
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export default function Profile() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle ?? "alice";
  const queryClient = useQueryClient();

  const isMe = handle === "alice";

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/username/alice"],
    enabled: !isMe,
  });

  const { data: profileUser, isLoading: profileLoading } = useQuery<any>({
    queryKey: [`/api/users/username/${handle}`],
  });

  const userId = profileUser?.id;
  const currentUserId = isMe ? userId : currentUser?.id;

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/favorites`],
    enabled: !!userId,
  });

  const { data: userReviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/reviews`],
    enabled: !!userId,
  });

  const { data: watchlistItems = [], isLoading: watchlistLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/watchlist`],
    enabled: !!userId,
  });

  const { data: followingStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/users/${currentUserId}/following/${userId}`],
    enabled: !!currentUserId && !!userId && !isMe,
  });

  const following = followingStatus?.following ?? false;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (following) {
        await apiRequest("DELETE", `/api/users/${currentUserId}/follow/${userId}`);
      } else {
        await apiRequest("POST", `/api/users/${currentUserId}/follow/${userId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/following/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/username/${handle}`] });
    },
  });

  if (profileLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile…</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    );
  }

  const profile = {
    handle: profileUser.username,
    name: profileUser.displayName,
    bio: profileUser.bio || "",
    avatarUrl: profileUser.avatarUrl || "",
    stats: {
      reviews: profileUser.reviews ?? 0,
      followers: profileUser.followers ?? 0,
      following: profileUser.following ?? 0,
    },
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:gap-3">
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
                onClick={() => followMutation.mutate()}
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
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            <Tabs defaultValue="overview" className="w-full min-w-0" data-testid="tabs-profile">
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
          className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] min-w-0"
        >
          <section className="space-y-4">
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7 min-w-0" data-testid="card-profile-header">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0 ring-1 ring-border" data-testid="avatar-profile">
                  <AvatarImage alt={profile.name} src={profile.avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                    {profile.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-serif text-2xl font-semibold" data-testid="text-name">
                          {profile.name}
                        </h2>
                        <Badge variant="secondary" className="shrink-0 rounded-full" data-testid="badge-pro">
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

            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7 overflow-hidden" data-testid="card-favorites">
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

              {favoritesLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading favorites…</div>
              ) : favorites.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No favorites yet.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {favorites.map((m: any) => {
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
                            {m.coverUrl && (
                              <img src={m.coverUrl} alt={m.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                            )}
                            <div className="absolute left-2 top-2 rounded-full bg-black/35 p-1 ring-1 ring-white/15">
                              <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7 overflow-hidden" data-testid="card-watchlist">
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

              {watchlistLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading watchlist…</div>
              ) : watchlistItems.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Watchlist is empty.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {watchlistItems.map((m: any) => (
                    <Link
                      key={m.id}
                      href={`/m/${m.id}`}
                      data-testid={`link-watch-${m.id}`}
                      className="rounded-2xl border bg-card/60 px-3 py-2 text-sm font-medium hover:bg-card/80 transition"
                    >
                      {m.title}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <Card className="glass bg-noise rounded-3xl p-5 sm:p-7 overflow-hidden" data-testid="card-activity">
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

              {reviewsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading activity…</div>
              ) : userReviews.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No activity yet.</div>
              ) : (
                <div className="space-y-3">
                  {userReviews.map((r: any) => (
                    <Link key={r.id} href={`/m/${r.media?.id ?? r.mediaId}`} data-testid={`link-activity-${r.id}`}>
                      <Card className="rounded-3xl border bg-card/60 p-4 hover:bg-card/80 transition">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "h-12 w-10 shrink-0 overflow-hidden rounded-2xl border bg-card shadow-sm",
                            )}
                          >
                            <div className={cn("h-full w-full bg-gradient-to-br", r.media?.coverGradient ?? "")} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-semibold" data-testid={`text-activity-blurb-${r.id}`}>
                                Reviewed {r.media?.title ?? "Unknown"} · {r.rating}★
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-activity-when-${r.id}`}>
                                {timeAgo(r.createdAt)}
                              </div>
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground" data-testid={`text-activity-title-${r.id}`}>
                              {r.media?.title ?? "Unknown"}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
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
