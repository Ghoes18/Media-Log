import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Lock, Globe, Users, Film, Check, X, Heart, BookOpen, Music, Gamepad2, Tv2, Award, Clapperboard, TrendingUp, ArrowLeft, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { ListPosterCollage } from "@/components/lists/ListPosterCollage";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

interface UserStub {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface ListWithMeta {
  id: string;
  name: string;
  description: string;
  visibility: string;
  isRanked?: boolean;
  tags?: string[];
  ownerId: string;
  createdAt: string;
  owner: UserStub;
  itemCount: number;
  collaboratorCount: number;
  isCollaborator: boolean;
  likeCount?: number;
  commentCount?: number;
  coverUrls?: string[];
}

interface InvitationWithDetails {
  id: string;
  listId?: string;
  tierListId?: string;
  status: string;
  list?: { id: string; name: string };
  tierList?: { id: string; name: string };
  invitedBy: UserStub;
}

interface PresetListMeta {
  id: string;
  name: string;
  description: string;
  mediaType: string;
  icon: string;
  expectedCount: number;
  likeCount: number;
  coverUrls?: string[];
}

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Film,
  Tv2,
  Clapperboard,
  BookOpen,
  Music,
  Gamepad2,
  Award,
  TrendingUp,
};

function PresetListCard({ preset }: { preset: PresetListMeta }) {
  const Icon = PRESET_ICONS[preset.icon] ?? Film;
  return (
    <Link href={`/preset-lists/${preset.id}`}>
      <div className="group relative rounded-lg bg-card border border-border transition-all duration-200 hover:-translate-y-1 cursor-pointer hover:shadow-md overflow-hidden">
        <div className="relative aspect-[4/3] w-full flex items-center justify-center bg-muted/30 overflow-hidden">
          <ListPosterCollage
            coverUrls={preset.coverUrls ?? []}
            aspectRatio="landscape"
            fallbackGradient="from-slate-700 to-slate-900"
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
          {(!preset.coverUrls || preset.coverUrls.length === 0) && (
            <Icon className="h-14 w-14 text-primary/40 group-hover:scale-110 group-hover:text-primary/60 transition-transform duration-500 z-0" />
          )}
          <div className="absolute bottom-3 left-3 z-20">
            <span className="bg-primary/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider rounded-md border border-primary/20">
              {preset.mediaType}
            </span>
          </div>
        </div>
        <div className="p-4">
          <p className="truncate font-semibold text-sm group-hover:text-primary transition-colors">{preset.name}</p>
          {preset.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground mt-1 leading-relaxed">{preset.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Film className="h-3.5 w-3.5" /> {preset.expectedCount}
            </span>
            {preset.likeCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-destructive/70" /> {preset.likeCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ListCard({ list }: { list: ListWithMeta }) {
  return (
    <Link href={`/lists/${list.id}`}>
      <div className="group relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer hover:shadow-md">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <ListPosterCollage
            coverUrls={list.coverUrls ?? []}
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute top-2.5 right-2.5 flex gap-1.5">
            <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-md border border-white/10">
              {list.visibility === "public"
                ? <Globe className="h-3 w-3 text-white/80" />
                : <Lock className="h-3 w-3 text-white/80" />}
            </div>
            {list.isCollaborator && (
              <div className="bg-primary/80 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 flex items-center">
                <span className="text-[9px] font-semibold text-white uppercase tracking-wide">Collab</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="font-semibold text-sm text-white line-clamp-2 leading-tight drop-shadow-sm">
              {list.name}
            </p>
            {list.description && (
              <p className="line-clamp-1 text-xs text-white/60 mt-0.5">{list.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
              <span className="flex items-center gap-1">
                <Film className="h-3 w-3" /> {list.itemCount}
              </span>
              {(list.likeCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-400" /> {list.likeCount}
                </span>
              )}
              {list.collaboratorCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {list.collaboratorCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface TierListWithMeta extends ListWithMeta {
  isTemplate?: boolean;
}

function TierListCard({ list }: { list: TierListWithMeta }) {
  return (
    <Link href={`/tier-lists/${list.id}`}>
      <div className="group relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer hover:shadow-md">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <ListPosterCollage
            coverUrls={list.coverUrls ?? []}
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {list.isTemplate && (
              <span className="bg-amber-500/90 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 text-[9px] font-semibold text-white uppercase tracking-wide">
                Template
              </span>
            )}
            <span className="bg-primary/80 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 text-[9px] font-semibold text-white uppercase tracking-wide flex items-center gap-1">
              <LayoutList className="h-3 w-3" /> Tier
            </span>
          </div>
          <div className="absolute top-2.5 right-14">
            {list.visibility === "public"
              ? <Globe className="h-3 w-3 text-white/80" />
              : <Lock className="h-3 w-3 text-white/80" />}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="font-semibold text-sm text-white line-clamp-2 leading-tight drop-shadow-sm">{list.name}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
              <span className="flex items-center gap-1"><Film className="h-3 w-3" /> {list.itemCount}</span>
              {(list.likeCount ?? 0) > 0 && (
                <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {list.likeCount}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PublicListCard({ list }: { list: ListWithMeta }) {
  return (
    <Link href={`/lists/${list.id}`}>
      <div className="group relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer hover:shadow-md">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <ListPosterCollage
            coverUrls={list.coverUrls ?? []}
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />

          <div className="absolute top-2.5 left-2.5">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm pr-2.5 pl-1 py-1 rounded-full border border-white/10">
              <Avatar className="h-5 w-5">
                <AvatarImage src={list.owner.avatarUrl} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">{list.owner.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-white/90 truncate max-w-[72px]">{list.owner.displayName}</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="font-semibold text-sm text-white line-clamp-2 leading-tight drop-shadow-sm">
              {list.name}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
              <span className="flex items-center gap-1">
                <Film className="h-3 w-3" /> {list.itemCount}
              </span>
              {(list.likeCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-400" /> {list.likeCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Lists() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [showNew, setShowNew] = useState(false);
  const [showNewTier, setShowNewTier] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "public">("private");
  const [newIsRanked, setNewIsRanked] = useState(false);
  const [newTags, setNewTags] = useState("");
  const [newTierName, setNewTierName] = useState("");
  const [newTierDesc, setNewTierDesc] = useState("");
  const [newTierVisibility, setNewTierVisibility] = useState<"private" | "public">("private");

  const { data: userLists = [], isLoading } = useQuery<ListWithMeta[]>({
    queryKey: ["/api/lists"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lists");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const { data: invitations = [] } = useQuery<InvitationWithDetails[]>({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/invitations");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const [publicSort, setPublicSort] = useState<"popular" | "recent">("recent");
  const { data: publicLists = [], isLoading: publicLoading } = useQuery<ListWithMeta[]>({
    queryKey: ["/api/lists/public", publicSort],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/lists/public?sort=${publicSort}&limit=24`);
      return res.json();
    },
  });

  const { data: presetLists = [], isLoading: presetLoading } = useQuery<PresetListMeta[]>({
    queryKey: ["/api/preset-lists"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/preset-lists");
      return res.json();
    },
  });

  const { data: userTierLists = [], isLoading: tierListsLoading } = useQuery<TierListWithMeta[]>({
    queryKey: ["/api/tier-lists"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tier-lists");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const { data: tierListInvitations = [] } = useQuery<InvitationWithDetails[]>({
    queryKey: ["/api/tier-list-invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tier-list-invitations");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const [publicTierSort, setPublicTierSort] = useState<"popular" | "recent">("recent");
  const { data: publicTierLists = [], isLoading: publicTierLoading } = useQuery<TierListWithMeta[]>({
    queryKey: ["/api/tier-lists/public", publicTierSort],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tier-lists/public?sort=${publicTierSort}&limit=24`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = newTags
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);
      const res = await apiRequest("POST", "/api/lists", {
        name: newName,
        description: newDesc,
        visibility: newVisibility,
        isRanked: newIsRanked,
        tags: tags.length > 0 ? tags : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      setNewVisibility("private");
      setNewIsRanked(false);
      setNewTags("");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/invitations/${id}/accept`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/invitations/${id}/decline`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/count"] });
    },
  });

  const createTierMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tier-lists", {
        name: newTierName,
        description: newTierDesc,
        visibility: newTierVisibility,
      });
      const list = await res.json();
      return list;
    },
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tier-lists"] });
      setShowNewTier(false);
      setNewTierName("");
      setNewTierDesc("");
      setNewTierVisibility("private");
      if (list?.id) navigate(`/tier-lists/${list.id}`);
    },
  });

  const acceptTierMutation = useMutation({
    mutationFn: async (invId: string) => {
      const res = await apiRequest("PATCH", `/api/tier-list-invitations/${invId}/accept`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tier-list-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tier-lists"] });
    },
  });

  const declineTierMutation = useMutation({
    mutationFn: async (invId: string) => {
      const res = await apiRequest("PATCH", `/api/tier-list-invitations/${invId}/decline`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tier-list-invitations"] });
    },
  });

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Sign in to see your lists</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md shrink-0" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-semibold">Lists</h1>
            <p className="truncate text-xs text-muted-foreground">Curate, share, and discover collections</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="rounded-md" onClick={() => setShowNewTier(true)}>
              <LayoutList className="mr-1.5 h-4 w-4" /> Tier list
            </Button>
            <Button size="sm" className="rounded-md" onClick={() => setShowNew((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" /> New list
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-24">

        {showNewTier && (
          <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="mb-5 font-serif text-lg font-semibold">Create a tier list</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tier-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input
                  id="tier-name"
                  placeholder="e.g. Best RPGs of All Time"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  maxLength={100}
                  className="bg-background/50 border-white/10 focus-visible:ring-primary h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
                <Textarea
                  id="tier-desc"
                  placeholder="Rank your favorites in S, A, B, C, D tiers"
                  value={newTierDesc}
                  onChange={(e) => setNewTierDesc(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="bg-background/50 border-white/10 focus-visible:ring-primary resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</Label>
                <div className="flex gap-3">
                  <Button
                    variant={newTierVisibility === "private" ? "default" : "outline"}
                    className={newTierVisibility === "private" ? "shadow-md shadow-primary/20" : "bg-background/50 border-white/10"}
                    onClick={() => setNewTierVisibility("private")}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Private
                  </Button>
                  <Button
                    variant={newTierVisibility === "public" ? "default" : "outline"}
                    className={newTierVisibility === "public" ? "shadow-md shadow-primary/20" : "bg-background/50 border-white/10"}
                    onClick={() => setNewTierVisibility("public")}
                  >
                    <Globe className="mr-2 h-4 w-4" /> Public
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Button
                  size="lg"
                  className="flex-1 rounded-none"
                  disabled={!newTierName.trim() || createTierMutation.isPending}
                  onClick={() => createTierMutation.mutate()}
                >
                  Create Tier List
                </Button>
                <Button size="lg" variant="ghost" className="rounded-none hover:bg-white/5" onClick={() => setShowNewTier(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {showNew && (
          <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="mb-5 font-serif text-lg font-semibold">Create a new list</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">List Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Best Sci-Fi Movies of 2024"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                  className="bg-background/50 border-white/10 focus-visible:ring-primary h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
                <Textarea
                  id="desc"
                  placeholder="What is this list about?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="bg-background/50 border-white/10 focus-visible:ring-primary resize-none"
                />
              </div>
              
              <div className="flex flex-wrap gap-6 p-4 rounded-none bg-background/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <Switch
                    id="ranked"
                    checked={newIsRanked}
                    onCheckedChange={setNewIsRanked}
                  />
                  <Label htmlFor="ranked" className="text-sm font-medium cursor-pointer">Ranked list (numbered order)</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</Label>
                <Input
                  id="tags"
                  placeholder="e.g. horror, 2025 (comma-separated)"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="bg-background/50 border-white/10 focus-visible:ring-primary h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</Label>
                <div className="flex gap-3">
                  <Button
                    variant={newVisibility === "private" ? "default" : "outline"}
                    className={newVisibility === "private" ? "shadow-md shadow-primary/20" : "bg-background/50 border-white/10"}
                    onClick={() => setNewVisibility("private")}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Private
                  </Button>
                  <Button
                    variant={newVisibility === "public" ? "default" : "outline"}
                    className={newVisibility === "public" ? "shadow-md shadow-primary/20" : "bg-background/50 border-white/10"}
                    onClick={() => setNewVisibility("public")}
                  >
                    <Globe className="mr-2 h-4 w-4" /> Public
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Button
                  size="lg"
                  className="flex-1 rounded-none"
                  disabled={!newName.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create List
                </Button>
                <Button size="lg" variant="ghost" className="rounded-none hover:bg-white/5" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="mine" className="mb-8">
          <TabsList className="w-full max-w-2xl mb-6 rounded-lg bg-muted/50 p-1 flex flex-wrap">
            <TabsTrigger value="mine" className="flex-1 min-w-[100px] rounded-md text-sm">My Lists</TabsTrigger>
            <TabsTrigger value="tiers" className="flex-1 min-w-[100px] rounded-md text-sm">Tier Lists</TabsTrigger>
            <TabsTrigger value="curated" className="flex-1 min-w-[100px] rounded-md text-sm">Curated</TabsTrigger>
            <TabsTrigger value="discover" className="flex-1 min-w-[100px] rounded-md text-sm">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="animate-in fade-in duration-500">
            {invitations.length > 0 && (
              <div className="mb-10 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Pending invitations
                </h2>
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-transform hover:-translate-y-1 relative"
                  >
                    <Avatar className="h-10 w-10 ring-1 ring-border">
                      <AvatarImage src={inv.invitedBy.avatarUrl} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">{inv.invitedBy.displayName[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-base font-bold tracking-tight">{inv.list?.name ?? inv.tierList?.name ?? "List"}</p>
                      <p className="truncate text-xs font-mono text-muted-foreground uppercase">
                        Invited by <span className="text-foreground font-bold">{inv.invitedBy.displayName}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-none border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors btn-skeuo-base"
                        disabled={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate(inv.id)}
                        title="Accept"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-none border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors btn-skeuo-base"
                        disabled={declineMutation.isPending}
                        onClick={() => declineMutation.mutate(inv.id)}
                        title="Decline"
                      >
                        <X className="h-4 w-4" strokeWidth={3} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[2/3] animate-pulse bg-muted border border-border shadow-sm" />
                ))}
              </div>
            )}

            {!isLoading && userLists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg bg-card border border-border shadow-sm">
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 mb-4">
                  <Film className="h-8 w-8 text-primary" />
                </div>
                <p className="font-serif text-lg font-semibold">No lists yet</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Create a list to organise your favourite media and share it with friends.</p>
                <Button className="mt-5 rounded-lg" onClick={() => setShowNew(true)}>Create your first list</Button>
              </div>
            )}

            {!isLoading && userLists.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userLists.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tiers" className="animate-in fade-in duration-500">
            {tierListInvitations.length > 0 && (
              <div className="mb-10 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Tier list invitations
                </h2>
                {tierListInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-transform hover:-translate-y-1 relative"
                  >
                    <Avatar className="h-10 w-10 ring-1 ring-border">
                      <AvatarImage src={inv.invitedBy.avatarUrl} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">{inv.invitedBy.displayName[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-base font-bold tracking-tight">{inv.tierList?.name ?? inv.list?.name ?? "Tier List"}</p>
                      <p className="truncate text-xs font-mono text-muted-foreground uppercase">
                        Invited by <span className="text-foreground font-bold">{inv.invitedBy.displayName}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-none border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
                        disabled={acceptTierMutation.isPending}
                        onClick={() => acceptTierMutation.mutate(inv.id)}
                        title="Accept"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-none border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                        disabled={declineTierMutation.isPending}
                        onClick={() => declineTierMutation.mutate(inv.id)}
                        title="Decline"
                      >
                        <X className="h-4 w-4" strokeWidth={3} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6 flex gap-2">
              <Button
                size="sm"
                variant={publicTierSort === "popular" ? "default" : "outline"}
                className="rounded-lg"
                onClick={() => setPublicTierSort("popular")}
              >
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Popular
              </Button>
              <Button
                size="sm"
                variant={publicTierSort === "recent" ? "default" : "outline"}
                className="rounded-lg"
                onClick={() => setPublicTierSort("recent")}
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" /> Recent
              </Button>
            </div>

            {tierListsLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[2/3] animate-pulse bg-muted border border-border shadow-sm" />
                ))}
              </div>
            )}

            {!tierListsLoading && userTierLists.length === 0 && tierListInvitations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg bg-card border border-border shadow-sm">
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 mb-4">
                  <LayoutList className="h-8 w-8 text-primary" />
                </div>
                <p className="font-serif text-lg font-semibold">No tier lists yet</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Create a tier list to rank your favorite media in S, A, B, C, D tiers with drag and drop.</p>
                <Button className="mt-5 rounded-lg" onClick={() => setShowNewTier(true)}>Create your first tier list</Button>
              </div>
            )}

            {!tierListsLoading && userTierLists.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userTierLists.map((list) => (
                  <TierListCard key={list.id} list={list} />
                ))}
              </div>
            )}

            {publicTierLists.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Discover tier lists</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {publicTierLists.map((list) => (
                    <TierListCard key={list.id} list={list} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="curated" className="animate-in fade-in duration-500">
            {presetLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[4/3] animate-pulse bg-muted border border-border shadow-sm" />
                ))}
              </div>
            )}
            {!presetLoading && presetLists.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {presetLists.map((preset) => (
                  <PresetListCard key={preset.id} preset={preset} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="animate-in fade-in duration-500">
            <div className="mb-6 flex gap-2">
              <Button
                size="sm"
                variant={publicSort === "popular" ? "default" : "outline"}
                className="rounded-lg"
                onClick={() => setPublicSort("popular")}
              >
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Popular
              </Button>
              <Button
                size="sm"
                variant={publicSort === "recent" ? "default" : "outline"}
                className="rounded-lg"
                onClick={() => setPublicSort("recent")}
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" /> Recent
              </Button>
            </div>
            {publicLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[2/3] animate-pulse bg-card border border-border shadow-sm" />
                ))}
              </div>
            )}
            {!publicLoading && publicLists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg bg-card border border-border shadow-sm">
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 mb-4">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <p className="font-serif text-lg font-semibold">No public lists yet</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Be the first to create and share a public list with the community.</p>
              </div>
            )}
            {!publicLoading && publicLists.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {publicLists.map((list) => (
                  <PublicListCard key={list.id} list={list} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
