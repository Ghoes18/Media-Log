import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentBody, setCommentBody] = useState("");

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

  const moveMutation = useMutation({
    mutationFn: async ({ itemId, tierId, position }: { itemId: string; tierId: string | null; position: number }) => {
      await apiRequest("PATCH", `/api/tier-lists/${id}/items/${itemId}/move`, { tierId, position });
    },
    onSuccess: () => {
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
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/lists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-lg font-semibold">{tierList.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {tierList.visibility === "public" ? "Public" : "Private"} · {tierList.tiers.reduce((a, t) => a + t.items.length, 0) + tierList.unassignedItems.length} items
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setAddItemOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {tierList.description && (
          <p className="mb-6 text-sm text-muted-foreground">{tierList.description}</p>
        )}

        <TierBoard
          tiers={tierList.tiers}
          unassignedItems={tierList.unassignedItems}
          canEdit={!!canEdit}
          onMoveItem={async (itemId, toTierId, toPosition) => {
            await moveMutation.mutateAsync({ itemId, tierId: toTierId, position: toPosition });
          }}
          onEditTier={(tier) => {
            setEditingTier(tier);
            setEditLabel(tier.label);
            setEditColor(tier.color);
            setEditTierOpen(true);
          }}
          onDeleteTier={(tier) => {
            if (confirm(`Delete tier "${tier.label}"? Items will move to the pool.`)) {
              deleteTierMutation.mutate(tier.id);
            }
          }}
        />

        {(canEdit || tierList.collaborators.length > 0) && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {tierList.ownerId === currentUser?.id && (
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search media</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Movies, books, music..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              {searchLoading && <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />}
              {searchResults.length > 0 && (
                <ul className="mt-2 max-h-48 overflow-y-auto rounded border">
                  {searchResults.map((item: any, i) => (
                    <li key={i}>
                      <button
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                        onClick={() => handleAddMedia(item)}
                        disabled={addItemMutation.isPending}
                      >
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt="" className="h-10 w-7 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-7 rounded bg-muted" />
                        )}
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{[item.type, item.year].filter(Boolean).join(" · ")}</p>
                        </div>
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
    </div>
  );
}
