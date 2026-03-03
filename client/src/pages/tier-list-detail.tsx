import { useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Globe,
  Heart,
  MessageCircle,
  UserPlus,
  X,
  Search,
  Loader2,
  Upload,
  Share2,
  Copy,
  GitFork,
  ArrowLeftRight,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { TierBoard } from "@/components/lists/TierBoard";
import { InviteCollaboratorsModal } from "@/components/lists/InviteCollaboratorsModal";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface UserStub {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface TierItemDetail {
  id: string;
  tierListId: string;
  mediaId: string;
  tierId: string | null;
  position: number;
  media: { id: string; coverUrl: string; coverGradient: string; title?: string };
}

interface TierWithItems {
  id: string;
  label: string;
  color: string;
  position: number;
  items: TierItemDetail[];
}

interface TierListDetail {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  visibility: string;
  isTemplate?: boolean;
  sourceTierListId?: string | null;
  owner: UserStub | null;
  tiers: TierWithItems[];
  unassignedItems: TierItemDetail[];
  collaborators: { userId: string; user: UserStub }[];
  invitations: { id: string; invitedUser: UserStub }[];
  isOwner: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

interface CommunityAggregateByMedia {
  mediaId: string;
  mediaTitle: string;
  tierLabel: string;
  tierPosition: number;
  percent: number;
  totalRanked: number;
}

interface CommunityAggregate {
  templateId: string;
  forkCount: number;
  tierLabels: string[];
  byMedia: CommunityAggregateByMedia[];
}

export default function TierListDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editTierOpen, setEditTierOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TierWithItems | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deletingTier, setDeletingTier] = useState<TierWithItems | null>(null);
  const [addTierOpen, setAddTierOpen] = useState(false);
  const [newTierLabel, setNewTierLabel] = useState("");
  const [newTierColor, setNewTierColor] = useState("#94a3b8");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [exporting, setExporting] = useState(false);
  const [quickFillSource, setQuickFillSource] = useState<"trending" | "watchlist">("trending");
  const [quickFillType, setQuickFillType] = useState<string>("anime");
  const [quickFillLimit, setQuickFillLimit] = useState(20);
  const boardRef = useRef<HTMLDivElement>(null);

  const { data: tierList, isLoading, error } = useQuery<TierListDetail>({
    queryKey: [`/api/tier-lists/${id}`],
    queryFn: async () => {
      if (!id) throw new Error("No id");
      const res = await apiRequest("GET", `/api/tier-lists/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<{ id: string; body: string; createdAt: string; user: UserStub }[]>({
    queryKey: [`/api/tier-lists/${id}/comments`],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiRequest("GET", `/api/tier-lists/${id}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && tierList?.visibility === "public",
  });

  const showCommunityAggregate =
    !!id &&
    !!tierList &&
    tierList.visibility === "public" &&
    (tierList.isTemplate === true || !!tierList.sourceTierListId);
  const { data: communityAggregate, isLoading: aggregateLoading, isError: aggregateError } = useQuery<CommunityAggregate>({
    queryKey: [`/api/tier-lists/${id}/community-aggregate`],
    queryFn: async () => {
      if (!id) throw new Error("No id");
      const res = await apiRequest("GET", `/api/tier-lists/${id}/community-aggregate`);
      if (!res.ok) throw new Error("Not available");
      return res.json();
    },
    enabled: showCommunityAggregate,
    staleTime: Infinity,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ itemId, tierId, position }: { itemId: string; tierId: string | null; position: number }) => {
      await apiRequest("PATCH", `/api/tier-lists/${id}/items/${itemId}/move`, { tierId, position });
    },
    onMutate: async ({ itemId, tierId, position }) => {
      const queryKey = [`/api/tier-lists/${id}`] as const;
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<TierListDetail>(queryKey);
      if (!prev) return { prev: undefined };

      const item = prev.tiers.flatMap((t) => t.items).find((i) => i.id === itemId)
        ?? prev.unassignedItems.find((i) => i.id === itemId);
      if (!item) return { prev };

      const withoutItem = (items: TierItemDetail[]) => items.filter((i) => i.id !== itemId);
      const insertAt = <T,>(arr: T[], index: number, x: T): T[] => [...arr.slice(0, index), x, ...arr.slice(index)];

      const newTiers = prev.tiers.map((t) => ({
        ...t,
        items: t.id === (item.tierId ?? "") ? withoutItem(t.items) : t.items,
      }));
      const newUnassigned = item.tierId === null ? withoutItem(prev.unassignedItems) : prev.unassignedItems;

      const moved = { ...item, tierId, position };
      if (tierId === null) {
        const unassigned = insertAt(
          newUnassigned.map((u, i) => ({ ...u, position: i })),
          Math.min(position, newUnassigned.length),
          moved,
        ).map((u, i) => ({ ...u, position: i }));
        queryClient.setQueryData(queryKey, { ...prev, tiers: newTiers, unassignedItems: unassigned });
      } else {
        const tier = newTiers.find((t) => t.id === tierId);
        const others = tier ? tier.items : [];
        const inserted = insertAt(others, Math.min(position, others.length), moved).map((u, i) => ({ ...u, position: i }));
        const tiers = newTiers.map((t) =>
          t.id === tierId ? { ...t, items: inserted } : { ...t, items: t.items.map((u, i) => ({ ...u, position: i })) },
        );
        queryClient.setQueryData(queryKey, { ...prev, tiers, unassignedItems: newUnassigned });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData([`/api/tier-lists/${id}`], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const res = await apiRequest("POST", `/api/tier-lists/${id}/items`, { mediaId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      setAddItemOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    },
  });

  const quickFillMutation = useMutation({
    mutationFn: async (payload: { source: "trending" | "watchlist"; type?: string; limit?: number }) => {
      const res = await apiRequest("POST", `/api/tier-lists/${id}/items/quick-fill`, payload);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Quick-fill failed");
      }
      return res.json() as Promise<{ added: number; skipped: number }>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      if (variables.source === "watchlist") {
        if (data.added === 0 && data.skipped === 0) toast.info("No items in your watchlist");
        else if (data.skipped > 0) toast.success(`Added ${data.added} items (${data.skipped} already in list)`);
        else toast.success(`Added ${data.added} item${data.added !== 1 ? "s" : ""} from watchlist`);
      } else {
        if (data.added === 0 && data.skipped === 0) toast.info("No items added");
        else if (data.skipped > 0) toast.success(`Added ${data.added} items (${data.skipped} already in list)`);
        else toast.success(`Added ${data.added} item${data.added !== 1 ? "s" : ""}`);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Quick-fill failed");
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/tier-lists/${id}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ tierId, label, color }: { tierId: string; label: string; color: string }) => {
      await apiRequest("PATCH", `/api/tier-lists/${id}/tiers/${tierId}`, { label, color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      setEditTierOpen(false);
      setEditingTier(null);
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      await apiRequest("DELETE", `/api/tier-lists/${id}/tiers/${tierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      setEditTierOpen(false);
      setEditingTier(null);
    },
  });

  const addTierMutation = useMutation({
    mutationFn: async ({ label, color }: { label: string; color: string }) => {
      await apiRequest("POST", `/api/tier-lists/${id}/tiers`, { label, color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      setAddTierOpen(false);
      setNewTierLabel("");
      setNewTierColor("#94a3b8");
    },
  });

  const reorderTiersMutation = useMutation({
    mutationFn: async (tierIds: string[]) => {
      await apiRequest("PUT", `/api/tier-lists/${id}/tiers/reorder`, { tierIds });
    },
    onMutate: async (tierIds) => {
      const queryKey = [`/api/tier-lists/${id}`] as const;
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<TierListDetail>(queryKey);
      if (prev) {
        const reordered = tierIds
          .map((tid) => prev.tiers.find((t) => t.id === tid))
          .filter(Boolean) as TierWithItems[];
        queryClient.setQueryData(queryKey, { ...prev, tiers: reordered.map((t, i) => ({ ...t, position: i })) });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData([`/api/tier-lists/${id}`], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tier-lists/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tier-lists/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
  });

  const removeCollabMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/tier-lists/${id}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tier-lists/${id}/comments`, { body: commentBody });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      refetchComments();
      setCommentBody("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/tier-lists/${id}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
      refetchComments();
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tier-lists/from-template", { sourceTierListId: id });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create from template");
      }
      return res.json();
    },
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tier-lists"] });
      navigate(`/tier-lists/${list.id}`);
      toast.success("Created your copy. Start ranking!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to use template");
    },
  });

  const forkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tier-lists/${id}/fork`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to fork tier list");
      }
      return res.json();
    },
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tier-lists"] });
      navigate(`/tier-lists/${list.id}`);
      toast.success("Forked! Rearrange items to make it your own.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to fork");
    },
  });

  const { data: reactions = [] } = useQuery<{ itemId: string; agreeCount: number; disagreeCount: number; userReaction?: string | null }[]>({
    queryKey: [`/api/tier-lists/${id}/reactions`],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiRequest("GET", `/api/tier-lists/${id}/reactions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && tierList?.visibility === "public",
  });

  const reactMutation = useMutation({
    mutationFn: async ({ itemId, reaction }: { itemId: string; reaction: "agree" | "disagree" }) => {
      await apiRequest("POST", `/api/tier-lists/${id}/items/${itemId}/react`, { reaction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}/reactions`] });
    },
  });

  const unreactMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/tier-lists/${id}/items/${itemId}/react`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}/reactions`] });
    },
  });

  const reactionsByItem = new Map(reactions.map((r) => [r.itemId, r]));

  const templateToggleMutation = useMutation({
    mutationFn: async (isTemplate: boolean) => {
      await apiRequest("PATCH", `/api/tier-lists/${id}`, { isTemplate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tier-lists/${id}`] });
    },
    onError: () => {
      toast.error("Failed to update template setting");
    },
  });

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await apiRequest("GET", `/api/search/all?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setSearchResults(data);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAddMedia(item: { id?: string; type: string; title: string; creator?: string; year?: string; coverUrl?: string; coverGradient?: string; externalId?: string }) {
    let mediaId = item.id;
    if (!mediaId) {
      const res = await apiRequest("POST", "/api/media/ensure", {
        type: item.type,
        title: item.title,
        creator: item.creator ?? "",
        year: item.year ?? "",
        coverUrl: item.coverUrl ?? "",
        coverGradient: item.coverGradient ?? "from-slate-700 to-slate-900",
        externalId: item.externalId ?? "",
      });
      const media = await res.json();
      mediaId = media.id;
    }
    if (mediaId) addItemMutation.mutate(mediaId);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: authHeaders,
        body: form,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const media = await res.json();
      addItemMutation.mutate(media.id);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const canEdit = tierList?.isOwner || tierList?.collaborators?.some((c) => c.userId === currentUser?.id);

  async function handleExportImage() {
    const node = boardRef.current;
    if (!node || !tierList) return;
    setExporting(true);
    try {
      // Let the board re-render with isExporting so hover controls are hidden
      await new Promise((r) => setTimeout(r, 150));
      const rawBg = typeof getComputedStyle !== "undefined"
        ? getComputedStyle(document.documentElement).getPropertyValue("--background")?.trim()
        : "";
      const backgroundColor = rawBg
        ? (rawBg.startsWith("hsl") ? rawBg : `hsl(${rawBg})`)
        : "#fafafa";
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor,
        pixelRatio: 2,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const slug = (tierList.name.replaceAll(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "tier-list");
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${slug}-${date}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: tierList.name,
          files: [file],
        });
        toast.success("Shared");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Downloaded");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tierList || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">Tier list not found</p>
        <Button variant="outline" onClick={() => navigate("/lists")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to lists
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/30">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" asChild>
            <Link href="/lists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-lg font-semibold leading-tight">{tierList.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {tierList.visibility === "public" ? (
                <Globe className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {tierList.tiers.reduce((a, t) => a + t.items.length, 0) + tierList.unassignedItems.length} items
              </span>
              {tierList.owner && (
                <>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <Link href={`/u/${tierList.owner.username}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {tierList.owner.displayName}
                  </Link>
                </>
              )}
            </div>
          </div>
          {tierList.visibility === "public" && tierList.isTemplate && currentUser && !tierList.isOwner && (
            <Button
              variant="default"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => useTemplateMutation.mutate()}
              disabled={useTemplateMutation.isPending}
            >
              {useTemplateMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {useTemplateMutation.isPending ? "Creating…" : "Use this template"}
            </Button>
          )}
          {tierList.visibility === "public" && !tierList.isTemplate && currentUser && !tierList.isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => forkMutation.mutate()}
              disabled={forkMutation.isPending}
            >
              {forkMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <GitFork className="mr-1.5 h-4 w-4" />
              )}
              {forkMutation.isPending ? "Forking…" : "Fork list"}
            </Button>
          )}
          {tierList.visibility === "public" && tierList.sourceTierListId && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => navigate(`/tier-lists/compare?a=${id}&b=${tierList.sourceTierListId}`)}
            >
              <ArrowLeftRight className="mr-1.5 h-4 w-4" />
              Compare with original
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            onClick={handleExportImage}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="mr-1.5 h-4 w-4" />
            )}
            {exporting ? "Exporting…" : "Share"}
          </Button>
          {canEdit && (
            <Button skeuo size="sm" className="rounded-xl shrink-0" onClick={() => setAddItemOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {tierList.description && (
          <p className="mb-6 text-sm text-muted-foreground">{tierList.description}</p>
        )}
        {tierList.visibility === "public" && tierList.isTemplate && !tierList.isOwner && (
          <p className="mb-4 text-sm text-muted-foreground">
            Use this template to create your own ranking.
          </p>
        )}

        {showCommunityAggregate && (
          <div className="mb-6 rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Community consensus
            </h2>
            {aggregateLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            )}
            {!aggregateLoading && aggregateError && (
              <p className="text-sm text-muted-foreground">Unable to load community rankings.</p>
            )}
            {!aggregateLoading && !aggregateError && communityAggregate && communityAggregate.forkCount === 0 && (
              <p className="text-sm text-muted-foreground">
                No community rankings yet. Be the first to rank from this template.
              </p>
            )}
            {!aggregateLoading && !aggregateError && communityAggregate && communityAggregate.forkCount > 0 && communityAggregate.byMedia.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No community rankings yet. Be the first to rank from this template.
              </p>
            )}
            {!aggregateLoading && !aggregateError && communityAggregate && communityAggregate.byMedia.length > 0 && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Based on {communityAggregate.forkCount} ranking{communityAggregate.forkCount !== 1 ? "s" : ""}.
                </p>
                <ul className="space-y-1.5 text-sm">
                  {communityAggregate.byMedia.map((m) => (
                    <li key={m.mediaId} className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{m.mediaTitle || "Untitled"}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {m.tierLabel}-tier ({m.percent}% of users)
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <TierBoard
          ref={boardRef}
          tiers={tierList.tiers}
          unassignedItems={tierList.unassignedItems}
          canEdit={!!canEdit}
          isExporting={exporting}
          onMoveItem={(itemId, toTierId, toPosition) => {
            moveMutation.mutate({ itemId, tierId: toTierId, position: toPosition });
          }}
          onEditTier={(tier) => {
            setEditingTier(tier);
            setEditLabel(tier.label);
            setEditColor(tier.color);
            setEditTierOpen(true);
          }}
          onDeleteTier={(tier) => setDeletingTier(tier)}
          onAddTier={() => setAddTierOpen(true)}
          onReorderTiers={(tierIds) => reorderTiersMutation.mutate(tierIds)}
        />

        {tierList.visibility === "public" && !canEdit && currentUser && (
          <div className="mt-6 rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ThumbsUp className="h-3.5 w-3.5" />
              React to placements
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Agree or disagree with individual rankings.
            </p>
            <div className="space-y-1.5">
              {tierList.tiers.map((tier) =>
                tier.items.map((item) => {
                  const r = reactionsByItem.get(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-2 py-1">
                      {item.media.coverUrl ? (
                        <img src={item.media.coverUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1 font-medium">{item.media.title || "Untitled"}</span>
                      <span className="text-xs text-muted-foreground shrink-0 w-8 text-center">{tier.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className={cn(
                            "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors",
                            r?.userReaction === "agree"
                              ? "bg-green-500/20 text-green-600 dark:text-green-400"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                          onClick={() => {
                            if (r?.userReaction === "agree") unreactMutation.mutate(item.id);
                            else reactMutation.mutate({ itemId: item.id, reaction: "agree" });
                          }}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {(r?.agreeCount ?? 0) > 0 && <span>{r!.agreeCount}</span>}
                        </button>
                        <button
                          className={cn(
                            "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors",
                            r?.userReaction === "disagree"
                              ? "bg-red-500/20 text-red-600 dark:text-red-400"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                          onClick={() => {
                            if (r?.userReaction === "disagree") unreactMutation.mutate(item.id);
                            else reactMutation.mutate({ itemId: item.id, reaction: "disagree" });
                          }}
                        >
                          <ThumbsDown className="h-3 w-3" />
                          {(r?.disagreeCount ?? 0) > 0 && <span>{r!.disagreeCount}</span>}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {(canEdit || tierList.collaborators.length > 0) && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {tierList.ownerId === currentUser?.id && (
              <>
                {tierList.visibility === "public" && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label id="template-toggle-label" htmlFor="template-toggle" className="text-sm font-medium">Publish as template</Label>
                        <p className="text-xs text-muted-foreground">Let others copy this list to rank for themselves.</p>
                      </div>
                      <Switch
                        id="template-toggle"
                        aria-labelledby="template-toggle-label"
                        checked={!!tierList.isTemplate}
                        onCheckedChange={(checked) => templateToggleMutation.mutate(!!checked)}
                        disabled={templateToggleMutation.isPending}
                      />
                    </div>
                  </div>
                )}
                <div className="rounded-lg border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Collaborators</h2>
                <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-2 h-3 w-3" /> Invite
                </Button>
                {tierList.collaborators.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tierList.collaborators.map((c) => (
                      <div key={c.userId} className="flex items-center gap-2 rounded border bg-muted/30 pl-1 pr-2 py-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={c.user.avatarUrl} />
                          <AvatarFallback className="text-xs">{c.user.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{c.user.displayName}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCollabMutation.mutate(c.userId)}
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        )}

        {tierList.visibility === "public" && (
          <div className="mt-10 space-y-6">
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant={tierList.isLiked ? "default" : "outline"}
                onClick={() => (tierList.isLiked ? unlikeMutation.mutate() : likeMutation.mutate())}
              >
                <Heart className={cn("mr-1.5 h-4 w-4", tierList.isLiked && "fill-current")} />
                {tierList.likeCount}
              </Button>
              <span className="text-sm text-muted-foreground">
                <MessageCircle className="inline h-4 w-4 mr-1" />
                {comments.length} comments
              </span>
            </div>

            {currentUser && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commentMutation.mutate()}
                />
                <Button size="sm" disabled={!commentBody.trim()} onClick={() => commentMutation.mutate()}>
                  Post
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 rounded-lg border bg-card p-4 group">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={c.user.avatarUrl} />
                    <AvatarFallback className="text-xs">{c.user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.user.displayName}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.body}</p>
                  </div>
                  {currentUser?.id === c.user.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => deleteCommentMutation.mutate(c.id)}
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full rounded-xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add items</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto flex-1 p-1 -m-1">
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Quick-fill from category</label>
              <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                    quickFillSource === "trending" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setQuickFillSource("trending")}
                >
                  Trending
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                    quickFillSource === "watchlist" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setQuickFillSource("watchlist")}
                >
                  My watchlist
                </button>
              </div>
              {quickFillSource === "trending" && (
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label="Category type"
                    value={quickFillType}
                    onChange={(e) => setQuickFillType(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="movie">Movies</option>
                    <option value="tv">TV</option>
                    <option value="anime">Anime</option>
                    <option value="book">Books</option>
                    <option value="music">Music</option>
                    <option value="game">Games</option>
                  </select>
                  <select
                    aria-label="Number of items"
                    value={quickFillLimit}
                    onChange={(e) => setQuickFillLimit(Number(e.target.value))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                  </select>
                </div>
              )}
              <Button
                size="sm"
                className="w-full"
                disabled={quickFillMutation.isPending}
                onClick={() => {
                  quickFillMutation.mutate({
                    source: quickFillSource,
                    ...(quickFillSource === "trending" ? { type: quickFillType, limit: quickFillLimit } : { limit: 100 }),
                  });
                }}
              >
                {quickFillMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                {quickFillMutation.isPending
                  ? "Adding…"
                  : quickFillSource === "watchlist"
                    ? "Add from watchlist"
                    : `Add top ${quickFillLimit} ${quickFillType}`}
              </Button>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-muted-foreground">Search media</label>
              <div className="relative mt-1 shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Movies, books, music..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              {searchLoading && (
                <div className="mt-2 flex justify-center py-2 shrink-0">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {searchResults.length > 0 && (
                <ul className="mt-2 max-h-[40vh] sm:max-h-[300px] overflow-y-auto rounded-lg border divide-y divide-border/50">
                  {searchResults.map((item: any, i) => (
                    <li key={i}>
                      <button
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors disabled:opacity-50 cursor-pointer"
                        onClick={() => handleAddMedia(item)}
                        disabled={addItemMutation.isPending}
                      >
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt="" className="h-11 w-8 object-cover rounded shrink-0" />
                        ) : (
                          <div className="h-11 w-8 rounded bg-muted shrink-0" />
                        )}
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium leading-tight">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground mt-0.5">{[item.type, item.year].filter(Boolean).join(" · ")}</p>
                        </div>
                        {addItemMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Upload image</label>
              <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed p-4 hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{uploading ? "Uploading..." : "Choose file"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editTierOpen} onOpenChange={setEditTierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tier</DialogTitle>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium">Label</label>
                <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={20} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Color</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-10 w-14 p-1 cursor-pointer"
                  />
                  <Input value={editColor} onChange={(e) => setEditColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditTierOpen(false)}>Cancel</Button>
                <Button onClick={() => updateTierMutation.mutate({ tierId: editingTier.id, label: editLabel, color: editColor })}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {tierList.ownerId === currentUser?.id && (
        <InviteCollaboratorsModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          listId={tierList.id}
          collaborators={tierList.collaborators}
          inviteEndpoint={`/api/tier-lists/${id}/invitations`}
          invalidateKeys={[[`/api/tier-lists/${id}`]]}
        />
      )}

      <AlertDialog open={!!deletingTier} onOpenChange={(open) => !open && setDeletingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tier "{deletingTier?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Items in this tier will be moved back to the unranked pool. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingTier) {
                  deleteTierMutation.mutate(deletingTier.id);
                  setDeletingTier(null);
                }
              }}
            >
              Delete tier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addTierOpen} onOpenChange={setAddTierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">Label</label>
              <Input
                value={newTierLabel}
                onChange={(e) => setNewTierLabel(e.target.value)}
                placeholder="e.g. S, A, B..."
                maxLength={20}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Color</label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="color"
                  value={newTierColor}
                  onChange={(e) => setNewTierColor(e.target.value)}
                  className="h-10 w-14 p-1 cursor-pointer"
                />
                <Input value={newTierColor} onChange={(e) => setNewTierColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddTierOpen(false)}>Cancel</Button>
              <Button
                disabled={!newTierLabel.trim() || addTierMutation.isPending}
                onClick={() => addTierMutation.mutate({ label: newTierLabel.trim(), color: newTierColor })}
              >
                {addTierMutation.isPending ? "Adding..." : "Add tier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
