import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
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

import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileBadgeSlot, type BadgeData } from "@/components/profile/ProfileBadgeSlot";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ProfileThemeProvider } from "@/components/profile/ProfileThemeProvider";

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

const SECTION_IDS = ["favorites", "watchlist", "activity"] as const;
const SECTION_LABELS: Record<string, string> = {
  favorites: "Favorites",
  watchlist: "Watchlist",
  activity: "Activity",
};

export default function Profile() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle ?? "";
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const isYou = handle === "you";
  const profileQueryKey = isYou ? ["/api/auth/me"] : [`/api/users/username/${handle}`];
  const { data: profileUser, isLoading: profileLoading } = useQuery<any>({
    queryKey: profileQueryKey,
    enabled: !!handle,
  });

  const userId = profileUser?.id;
  const isMe = !!(currentUser && profileUser && (profileUser.id === currentUser.id || profileUser.username === currentUser.username));
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
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });

  if (profileLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile…</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    );
  }

  const profile = {
    handle: profileUser.username,
    name: profileUser.displayName,
    bio: profileUser.bio || profileUser.profileSettings?.aboutMe || "",
    avatarUrl: profileUser.avatarUrl || "",
    pronouns: profileUser.profileSettings?.pronouns || "",
    stats: {
      reviews: profileUser.reviews ?? 0,
      followers: profileUser.followers ?? 0,
      following: profileUser.following ?? 0,
    },
  };

  const settings = profileUser.profileSettings ?? null;
  const badges = (profileUser.badges ?? []) as (BadgeData & { earnedAt?: string })[];
  const layoutOrder = (settings?.layoutOrder as string[] | undefined) ?? [...SECTION_IDS];
  const showBadges = settings?.showBadges !== false;
  const orderedSections = layoutOrder.filter((id) =>
    SECTION_IDS.includes(id as (typeof SECTION_IDS)[number])
  );
  if (orderedSections.length === 0) orderedSections.push(...SECTION_IDS);

  return (
    <ProfileThemeProvider
      themeAccent={settings?.themeAccent}
      themeCustomColor={settings?.themeCustomColor}
      className="min-h-dvh bg-background"
    >
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
          <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-md"
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
                    className="h-10 w-10 rounded-md sm:hidden"
                    data-testid="button-settings"
                    onClick={() => setEditOpen(true)}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="hidden h-10 rounded-md sm:inline-flex"
                    data-testid="button-edit-profile"
                    onClick={() => setEditOpen(true)}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Edit profile
                  </Button>
                  <ProfileEditSheet
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    user={{
                      id: profileUser.id,
                      displayName: profileUser.displayName,
                      bio: profileUser.bio,
                      username: profileUser.username,
                    }}
                    profileSettings={settings}
                    badges={badges}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: profileQueryKey });
                    }}
                  />
                </>
              ) : (
                <Button
                  className="h-10 rounded-md"
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
                        <Heart className="mr-2 h-4 w-4 text-red-600" />
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
            <Tabs defaultValue="overview" className="w-full min-w-0" data-testid="tabs-profile">
              <TabsList className="w-full rounded-md border bg-card/60 p-1" data-testid="tabs-list-profile">
                <TabsTrigger value="overview" className="flex-1 rounded-md" data-testid="tab-overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="faves" className="flex-1 rounded-md" data-testid="tab-faves">
                  Favorites
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 rounded-md" data-testid="tab-activity">
                  Activity
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-0">
          {/* Hero: Discord-style banner + overlay */}
          <div className="-mx-4 sm:-mx-6 lg:mx-0 lg:rounded-xl lg:overflow-hidden lg:border lg:border-border">
            <ProfileBanner
              bannerUrl={settings?.bannerUrl}
              bannerPosition={settings?.bannerPosition ?? undefined}
            />
            <div className="relative -mt-16 px-4 pb-4 sm:px-6">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
                <Avatar
                  className="h-20 w-20 shrink-0 ring-4 ring-background sm:h-24 sm:w-24"
                  data-testid="avatar-profile"
                >
                  <AvatarImage alt={profile.name} src={profile.avatarUrl} />
                  <AvatarFallback className="bg-primary/15 text-xl sm:text-2xl">
                    {profile.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-serif text-2xl font-semibold sm:text-3xl" data-testid="text-name">
                      {profile.name}
                    </h2>
                    <Badge variant="secondary" className="shrink-0 rounded-full" data-testid="badge-pro">
                      <Star className="mr-1 h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      PROTOTYPE
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground" data-testid="text-profile-handle-main">
                    @{profile.handle}
                    {profile.pronouns && (
                      <span className="text-muted-foreground/80"> · {profile.pronouns}</span>
                    )}
                  </p>
                  {showBadges && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {badges.slice(0, 5).map((b) => (
                        <ProfileBadgeSlot key={b.id} badge={b} />
                      ))}
                      {badges.length < 5 &&
                        Array.from({ length: 5 - badges.length }).map((_, i) => (
                          <ProfileBadgeSlot key={`empty-${i}`} isEmpty />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div
              className="rounded-lg border bg-card/60 p-3 [.profile-theme-root_&]:border-[var(--profile-accent)]/20"
              data-testid="stat-reviews"
            >
              <div className="text-xs text-muted-foreground">Reviews</div>
              <div className="mt-1 font-serif text-lg font-semibold [.profile-theme-root_&]:text-[var(--profile-accent)]">
                {profile.stats.reviews}
              </div>
            </div>
            <div
              className="rounded-lg border bg-card/60 p-3 [.profile-theme-root_&]:border-[var(--profile-accent)]/20"
              data-testid="stat-followers"
            >
              <div className="text-xs text-muted-foreground">Followers</div>
              <div className="mt-1 font-serif text-lg font-semibold [.profile-theme-root_&]:text-[var(--profile-accent)]">
                {profile.stats.followers}
              </div>
            </div>
            <div
              className="rounded-lg border bg-card/60 p-3 [.profile-theme-root_&]:border-[var(--profile-accent)]/20"
              data-testid="stat-following"
            >
              <div className="text-xs text-muted-foreground">Following</div>
              <div className="mt-1 font-serif text-lg font-semibold [.profile-theme-root_&]:text-[var(--profile-accent)]">
                {profile.stats.following}
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground" data-testid="text-bio">
              {profile.bio}
            </p>
          )}

          {/* Customizable sections in layout order */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr] min-w-0"
          >
            <section className="space-y-4">
              {(orderedSections[0] === "favorites" || orderedSections[1] === "favorites") && (
                <Card className="rounded-lg border border-border bg-card p-5 sm:p-7 overflow-hidden" data-testid="card-favorites">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-serif text-lg font-semibold" data-testid="text-favorites-title">
                        Favorites
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid="text-favorites-subtitle">
                        A little shelf of you.
                      </div>
                    </div>
                    {isMe && (
                      <Button variant="secondary" className="rounded-md" data-testid="button-edit-favorites" asChild>
                        <Link href="/discover">Edit</Link>
                      </Button>
                    )}
                  </div>
                  <Separator className="my-4" />
                  {favoritesLoading ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Loading favorites…</div>
                  ) : favorites.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">No favorites yet.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {favorites.map((m: any) => {
                        const Icon = iconFor(m.type);
                        return (
                          <Link
                            key={m.id}
                            href={`/m/${m.id}`}
                            data-testid={`link-favorite-${m.id}`}
                            className="group"
                          >
                            <div className="overflow-hidden rounded-md border bg-card shadow-sm">
                              <div className={cn("media-cover relative aspect-[3/4] bg-gradient-to-br contrast-125", m.coverGradient)}>
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
              )}

              {(orderedSections[0] === "watchlist" || orderedSections[1] === "watchlist") && (
                <Card className="rounded-lg border border-border bg-card p-5 sm:p-7 overflow-hidden" data-testid="card-watchlist">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-serif text-lg font-semibold" data-testid="text-watchlist-title">
                        Watchlist
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid="text-watchlist-subtitle">
                        Save things for later.
                      </div>
                    </div>
                    <Link href="/watchlist" data-testid="link-watchlist" className="text-sm font-medium text-primary hover:opacity-80">
                      Open
                    </Link>
                  </div>
                  <Separator className="my-4" />
                  {watchlistLoading ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Loading watchlist…</div>
                  ) : watchlistItems.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Watchlist is empty.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {watchlistItems.map((m: any) => (
                        <Link
                          key={m.id}
                          href={`/m/${m.id}`}
                          data-testid={`link-watch-${m.id}`}
                          className="rounded-md border bg-card/60 px-3 py-2 text-sm font-medium transition hover:bg-card/80"
                        >
                          {m.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </section>

            {(orderedSections[0] === "activity" || orderedSections[1] === "activity" || orderedSections[2] === "activity") && (
              <section>
                <Card className="rounded-lg border border-border bg-card p-5 sm:p-7 overflow-hidden" data-testid="card-activity">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-serif text-lg font-semibold" data-testid="text-activity-title">
                        Recent activity
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid="text-activity-subtitle">
                        Reviews, likes, and saves.
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  {reviewsLoading ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Loading activity…</div>
                  ) : userReviews.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">No activity yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {userReviews.map((r: any) => (
                        <Link key={r.id} href={`/m/${r.media?.id ?? r.mediaId}`} data-testid={`link-activity-${r.id}`}>
                          <Card className="rounded-lg border bg-card/60 p-4 transition hover:bg-card/80">
                            <div className="flex items-start gap-3">
                              <div className={cn("media-cover relative h-12 w-10 shrink-0 overflow-hidden rounded-md border bg-card shadow-sm")}>
                                <div className={cn("h-full w-full bg-gradient-to-br contrast-125", r.media?.coverGradient ?? "")} />
                                {r.media?.coverUrl && (
                                  <img src={r.media.coverUrl} alt={r.media.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                                )}
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
            )}
          </motion.div>
        </main>

        <div className="font-brand fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" data-testid="nav-home" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="/discover" data-testid="nav-discover" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Discover
            </Link>
            <Link href="/watchlist" data-testid="nav-watchlist" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Watchlist
            </Link>
            <Link href="/u/you" data-testid="nav-profile" className="text-sm font-medium hover:opacity-80">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </ProfileThemeProvider>
  );
}
