import { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Film,
  Globe,
  Lock,
  Pencil,
  Trash2,
  UserPlus,
  X,
  Check,
  Search,
  Loader2,
  Heart,
  MessageCircle,
  LayoutGrid,
  List as ListIcon,
  ChevronUp,
  ChevronDown,
  Plus,
  GitFork,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { InviteCollaboratorsModal } from "@/components/lists/InviteCollaboratorsModal";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserStub {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface MediaItem {
  id: string;
  type: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  coverGradient: string;
}

interface ListItemDetail {
  id: string;
  listId: string;
  mediaId: string;
  addedByUserId: string;
  addedAt: string;
  position?: number;
  note?: string | null;
  media: MediaItem;
  addedBy: UserStub;
}

interface CollaboratorItem {
  listId: string;
  userId: string;
  joinedAt: string;
  user: UserStub;
}

interface InvitationItem {
  id: string;
  invitedUserId: string;
  status: string;
  invitedUser: UserStub;
}

interface ListComment {
  id: string;
  listId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: UserStub;
}

interface ListDetail {
  id: string;
  name: string;
  description: string;
  visibility: string;
  isRanked?: boolean;
  tags?: string[];
  ownerId: string;
  owner?: UserStub;
  createdAt: string;
  items: ListItemDetail[];
  collaborators: CollaboratorItem[];
  invitations: InvitationItem[];
  isOwner: boolean;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
}

interface SearchResult {
  type: string;
  title: string;
  creator?: string;
  year?: string;
  coverUrl?: string;
  coverGradient?: string;
  externalId?: string;
  synopsis?: string;
  tags?: string[];
}

type ViewMode = "grid" | "list";
type SortKey = "order" | "title" | "year" | "type" | "date";

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVisibility, setEditVisibility] = useState<"private" | "public">("private");
  const [editIsRanked, setEditIsRanked] = useState(false);
  const [editTags, setEditTags] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [editingNoteMediaId, setEditingNoteMediaId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [commentBody, setCommentBody] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: list, isLoading, error } = useQuery<ListDetail>({
    queryKey: [`/api/lists/${id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/lists/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<ListComment[]>({
    queryKey: [`/api/lists/${id}/comments`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/lists/${id}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && list?.visibility === "public",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string; visibility?: string; isRanked?: boolean; tags?: string[] }) => {
      const res = await apiRequest("PATCH", `/api/lists/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      navigate("/lists");
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/lists/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/lists/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ mediaId, note }: { mediaId: string; note?: string }) => {
      const res = await apiRequest("POST", `/api/lists/${id}/items`, { mediaId, note });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      setSearchQuery("");
      setSearchResults([]);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await apiRequest("DELETE", `/api/lists/${id}/items/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ mediaId, note }: { mediaId: string; note: string | null }) => {
      await apiRequest("PATCH", `/api/lists/${id}/items/${mediaId}`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      setEditingNoteMediaId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      await apiRequest("PUT", `/api/lists/${id}/reorder`, { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest("POST", `/api/lists/${id}/comments`, { body });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      refetchComments();
      setCommentBody("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/lists/${id}/comments/${commentId}`);
    },
    onSuccess: () => {
      refetchComments();
    },
  });

  const forkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/lists/${id}/fork`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to fork list");
      }
      return res.json();
    },
    onSuccess: (forked: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast.success("List forked! Make it your own.");
      navigate(`/lists/${forked.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to fork list");
    },
  });

  const removeCollabMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/lists/${id}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
    },
  });

  const sortedItems = useMemo(() => {
    if (!list?.items) return [];
    const items = [...list.items];
    if (list.isRanked || sortKey === "order") return items;
    switch (sortKey) {
      case "title":
        return items.sort((a, b) => a.media.title.localeCompare(b.media.title));
      case "year":
        return items.sort((a, b) => (b.media.year || "").localeCompare(a.media.year || ""));
      case "type":
        return items.sort((a, b) => a.media.type.localeCompare(b.media.type));
      case "date":
        return items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      default:
        return items;
    }
  }, [list?.items, list?.isRanked, sortKey]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await apiRequest("GET", `/api/search/all?q=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setSearchResults(data);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAddMedia(item: SearchResult, note?: string) {
    const res = await apiRequest("POST", "/api/media/ensure", {
      type: item.type,
      title: item.title,
      creator: item.creator ?? "",
      year: item.year ?? "",
      coverUrl: item.coverUrl ?? "",
      coverGradient: item.coverGradient ?? "from-slate-700 to-slate-900",
      synopsis: item.synopsis ?? "",
      tags: item.tags ?? [],
      externalId: item.externalId ?? "",
    });
    const media = await res.json();
    addItemMutation.mutate({ mediaId: media.id, note });
  }

  function handleMoveUp(index: number) {
    if (index <= 0 || !list?.items) return;
    const ids = sortedItems.map((i) => i.mediaId);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderMutation.mutate(ids);
  }

  function handleMoveDown(index: number) {
    if (!list?.items || index >= sortedItems.length - 1) return;
    const ids = sortedItems.map((i) => i.mediaId);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderMutation.mutate(ids);
  }

  function startEdit() {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description ?? "");
    setEditVisibility(list.visibility === "public" ? "public" : "private");
    setEditIsRanked(!!list.isRanked);
    setEditTags((list.tags ?? []).join(", "));
    setEditing(true);
  }

  function startEditNote(item: ListItemDetail) {
    setEditingNoteMediaId(item.mediaId);
    setEditingNoteValue(item.note ?? "");
  }

  const heroImage = list?.items?.[0]?.media?.coverUrl;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!list || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">List not found</p>
        <Button variant="outline" className=" btn-skeuo-base border-border shadow-sm" onClick={() => navigate("/lists")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> BACK TO LISTS
        </Button>
      </div>
    );
  }

  const canEdit = list.isOwner;
  const canContribute = list.isOwner || list.collaborators.some((c) => c.userId === currentUser?.id);
  const showSort = !list.isRanked && list.items.length > 1;

  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/30">
      {/* Cinematic Hero */}
      <div className="relative w-full h-[40vh] min-h-[300px] flex items-end border-b border-border overflow-hidden">
        {heroImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 blur-xl scale-110"
              style={{ backgroundImage: `url(${heroImage})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="bg-noise absolute inset-0 z-0 pointer-events-none" />
          </>
        )}
        {!heroImage && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
            <div className="bg-noise absolute inset-0 z-0"></div>
          </>
        )}
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 pb-8">
          <Button variant="outline" size="icon" className="mb-6  bg-background/80 border-border shadow-sm btn-skeuo-base hover:bg-background text-foreground" onClick={() => navigate("/lists")} aria-label="Back to lists">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-4 bg-card p-6 border border-border shadow-md max-w-2xl relative">
                  <div className="bg-noise absolute inset-0 z-0"></div>
                  <div className="relative z-10 space-y-4">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={100}
                      className="text-xl font-bold bg-background border-border shadow-inner "
                      placeholder="List Name"
                    />
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Description"
                      className="bg-background border-border shadow-inner resize-none "
                    />
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 border border-border">
                        <input
                          type="checkbox"
                          id="edit-ranked"
                          checked={editIsRanked}
                          onChange={(e) => setEditIsRanked(e.target.checked)}
                          className="accent-primary"
                        />
                        <label htmlFor="edit-ranked" className="text-sm font-mono font-bold uppercase tracking-wider">Ranked</label>
                      </div>
                      <Input
                        placeholder="Tags (comma-separated)"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="bg-background border-border shadow-inner flex-1 min-w-[200px] "
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant={editVisibility === "private" ? "default" : "outline"} className={` btn-skeuo-base ${editVisibility === "private" ? "border-primary/20" : "border-border"}`} onClick={() => setEditVisibility("private")}>
                        <Lock className="mr-2 h-4 w-4" /> PRIVATE
                      </Button>
                      <Button size="sm" variant={editVisibility === "public" ? "default" : "outline"} className={` btn-skeuo-base ${editVisibility === "public" ? "border-primary/20" : "border-border"}`} onClick={() => setEditVisibility("public")}>
                        <Globe className="mr-2 h-4 w-4" /> PUBLIC
                      </Button>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        disabled={!editName.trim() || updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            name: editName,
                            description: editDesc,
                            visibility: editVisibility,
                            isRanked: editIsRanked,
                            tags: editTags.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
                          })
                        }
                        className=" px-6 btn-skeuo-base border-primary/20 shadow-sm"
                      >
                        <Check className="mr-2 h-4 w-4" /> SAVE CHANGES
                      </Button>
                      <Button variant="outline" className=" btn-skeuo-base border-border shadow-sm" onClick={() => setEditing(false)}>CANCEL</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {list.visibility === "public" ? (
                      <span className=" bg-primary/20 border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-widest font-mono">
                        <Globe className="h-3 w-3 mr-1.5 inline-block" /> PUBLIC
                      </span>
                    ) : (
                      <span className=" bg-card border border-border px-2.5 py-1 text-xs font-bold text-foreground uppercase tracking-widest font-mono">
                        <Lock className="h-3 w-3 mr-1.5 inline-block" /> PRIVATE
                      </span>
                    )}
                    {list.isRanked && (
                      <span className=" bg-card border border-border px-2.5 py-1 text-xs font-bold text-foreground uppercase tracking-widest font-mono">
                        Ranked
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-brand tracking-tight text-foreground mb-2 leading-tight truncate">
                    {list.name}
                  </h1>
                  {list.description && <p className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed mb-4">{list.description}</p>}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-foreground">
                    {list.owner && (
                      <Link href={`/u/${list.owner.username}`}>
                        <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer bg-card border border-border pr-3 pl-1 py-1 shadow-sm">
                          <Avatar className="h-6 w-6  border border-border">
                            <AvatarImage src={list.owner.avatarUrl} className="" />
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-brand ">{list.owner.displayName[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold">{list.owner.displayName}</span>
                        </div>
                      </Link>
                    )}
                    
                    {(list.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(list.tags ?? []).map((tag) => (
                          <span key={tag} className=" bg-card border border-border px-2 py-1 text-xs font-mono font-bold text-foreground uppercase">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {!editing && (
              <div className="flex items-center gap-3 shrink-0">
                {list.visibility === "public" && currentUser && !list.isOwner && (
                  <Button
                    size="lg"
                    variant="outline"
                    className=" shadow-sm transition-all duration-300 btn-skeuo-base bg-card border-border hover:bg-muted text-foreground"
                    onClick={() => forkMutation.mutate()}
                    disabled={forkMutation.isPending}
                  >
                    {forkMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <GitFork className="mr-2 h-5 w-5" />
                    )}
                    {forkMutation.isPending ? "Forking…" : "Fork list"}
                  </Button>
                )}
                {list.visibility === "public" && currentUser && (
                  <Button
                    size="lg"
                    variant={list.isLiked ? "default" : "outline"}
                    className={cn(
                      " shadow-sm transition-all duration-300 btn-skeuo-base",
                      list.isLiked ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive" : "bg-card border-border hover:bg-muted text-foreground"
                    )}
                    onClick={() => (list.isLiked ? unlikeMutation.mutate() : likeMutation.mutate())}
                  >
                    <Heart className={cn("mr-2 h-5 w-5", list.isLiked ? "fill-current" : "")} />
                    {list.likeCount ?? 0}
                  </Button>
                )}
                
                {canEdit && (
                  <>
                    <Button variant="outline" size="icon" className=" bg-card border-border shadow-sm hover:bg-muted text-foreground h-11 w-11 btn-skeuo-base" onClick={startEdit} title="Edit List">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className=" bg-card border-border shadow-sm hover:bg-destructive hover:text-white hover:border-destructive text-foreground h-11 w-11 transition-colors btn-skeuo-base"
                      onClick={() => { if (confirm("Delete this list? This cannot be undone.")) deleteMutation.mutate(); }}
                      title="Delete list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Collaborators & Add Media Section */}
        {(canEdit || list.collaborators.length > 0 || canContribute) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Collaborators */}
            {(canEdit || list.collaborators.length > 0) && (
              <div className="bg-card border border-border p-6 shadow-sm relative">
                <div className="bg-noise absolute inset-0 z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest">Collaborators</h2>
                    {canEdit && !editing && (
                      <Button size="sm" variant="outline" className=" h-8 btn-skeuo-base border-border" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="mr-2 h-3 w-3" /> INVITE
                      </Button>
                    )}
                  </div>
                  
                  {list.collaborators.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {list.collaborators.map((collab) => (
                        <div key={collab.userId} className="flex items-center gap-2 border border-border bg-background pr-3 pl-1 py-1 shadow-sm">
                          <Avatar className="h-6 w-6  border border-border">
                            <AvatarImage src={collab.user.avatarUrl} className="" />
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-brand ">{collab.user.displayName[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-bold">{collab.user.displayName}</span>
                          {canEdit && (
                            <button onClick={() => removeCollabMutation.mutate(collab.userId)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors" title="Remove collaborator">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-mono uppercase">No collaborators yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Add Media */}
            {canContribute && (
              <div className="bg-card border border-border p-6 shadow-sm relative">
                <div className="bg-noise absolute inset-0 z-0"></div>
                <div className="relative z-10">
                  <h2 className="mb-4 text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest">Add Media</h2>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-11 bg-background border-border h-12  shadow-inner"
                      placeholder="Search movies, books, music…"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                  {searchLoading && (
                    <div className="mt-4 flex items-center justify-center text-primary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <ul className="mt-3 space-y-1 border border-border bg-card shadow-xl max-h-64 overflow-y-auto p-2 absolute z-50 w-full md:w-[calc(50%-1.5rem)] max-w-[calc(100vw-2rem)]">
                      {searchResults.map((item, i) => (
                        <li key={i}>
                          <button
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors border border-transparent hover:border-border"
                            onClick={() => handleAddMedia(item)}
                            disabled={addItemMutation.isPending}
                          >
                            {item.coverUrl ? (
                              <img src={item.coverUrl} alt={item.title} className="h-12 w-8 shrink-0 object-cover shadow-sm border border-border" />
                            ) : (
                              <div className={cn("h-12 w-8 shrink-0 shadow-sm bg-gradient-to-br border border-border", item.coverGradient ?? "from-slate-700 to-slate-900")} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                              <p className="truncate text-xs font-mono uppercase text-muted-foreground">{[item.type, item.year].filter(Boolean).join(" · ")}</p>
                            </div>
                            <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items Section */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-2">
            <h2 className="text-xl font-brand tracking-tight">
              ITEMS <span className="text-muted-foreground font-mono text-base ml-2">({list.items.length})</span>
            </h2>
            
            <div className="flex items-center gap-3">
              {showSort && (
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="Sort items"
                  className="h-9 border border-border bg-card px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary cursor-pointer font-mono uppercase "
                >
                  <option value="order" className="bg-background">Custom Order</option>
                  <option value="title" className="bg-background">Title</option>
                  <option value="year" className="bg-background">Year</option>
                  <option value="type" className="bg-background">Type</option>
                  <option value="date" className="bg-background">Date Added</option>
                </select>
              )}
              
              <div className="flex bg-card border border-border p-1 shadow-sm">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className={cn("h-7 w-8 p-0 ", viewMode === "grid" ? "shadow-sm border border-primary/20" : "hover:bg-muted border border-transparent")}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className={cn("h-7 w-8 p-0 ", viewMode === "list" ? "shadow-sm border border-primary/20" : "hover:bg-muted border border-transparent")}
                  title="List view"
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {list.items.length === 0 && (
            <div className="py-16 text-center bg-card border border-border shadow-sm relative">
              <div className="bg-noise absolute inset-0 z-0"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-primary/10 p-4 border border-primary/20 shadow-inner mb-4 w-fit">
                  <Film className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-brand mb-1">No items yet</p>
                <p className="text-sm text-muted-foreground font-mono uppercase">Search and add media to start building your list.</p>
              </div>
            </div>
          )}

          {viewMode === "grid" && list.items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {sortedItems.map((item, index) => (
                <div key={item.id} className="relative group">
                  <Link href={`/m/${item.mediaId}`}>
                    <div className="relative aspect-[2/3] overflow-hidden bg-card border border-border transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[4px_4px_0_0_var(--color-border)]">
                      {item.media.coverUrl ? (
                        <img src={item.media.coverUrl} alt={item.media.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className={cn("h-full w-full bg-gradient-to-br", item.media.coverGradient ?? "from-slate-700 to-slate-900")} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                      
                      {list.isRanked && (
                        <div className="absolute top-0 left-0 bg-card border-b border-r border-border text-foreground text-xs font-brand px-3 py-1.5 z-10 shadow-sm">
                          #{index + 1}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 px-1 border-l-2 border-primary/50 pl-2">
                      <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.media.title}</p>
                      {item.media.year && (
                        <p className="truncate text-xs font-mono uppercase text-muted-foreground mt-0.5">{item.media.year}</p>
                      )}
                    </div>
                  </Link>
                  {canContribute && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 z-20">
                      <button
                        onClick={(e) => { e.preventDefault(); removeItemMutation.mutate(item.mediaId); }}
                        className="bg-card p-2 text-foreground hover:bg-destructive hover:text-white shadow-sm border border-border transition-colors "
                        title="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === "list" && list.items.length > 0 && (
            <div className="space-y-3">
              {sortedItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 border border-border bg-card p-3 hover:bg-muted transition-colors group relative">
                  <div className="flex flex-col gap-1 shrink-0 justify-center h-full pt-1">
                    {canContribute && sortKey === "order" && (
                      <>
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || reorderMutation.isPending}
                          title="Move up"
                          aria-label="Move item up"
                          className="p-1 border border-transparent hover:border-border text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sortedItems.length - 1 || reorderMutation.isPending}
                          title="Move down"
                          aria-label="Move item down"
                          className="p-1 border border-transparent hover:border-border text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {list.isRanked && (!canContribute || sortKey !== "order") && (
                      <span className="text-sm font-brand text-muted-foreground px-2">#{index + 1}</span>
                    )}
                  </div>
                  
                  <Link href={`/m/${item.mediaId}`} className="shrink-0">
                    <div className="overflow-hidden border border-border shadow-sm">
                      {item.media.coverUrl ? (
                        <img src={item.media.coverUrl} alt={item.media.title} className="h-20 w-14 object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className={cn("h-20 w-14 bg-gradient-to-br", item.media.coverGradient ?? "from-slate-700 to-slate-900")} />
                      )}
                    </div>
                  </Link>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <Link href={`/m/${item.mediaId}`}>
                      <p className="text-base font-bold text-foreground hover:text-primary transition-colors truncate">{item.media.title}</p>
                    </Link>
                    <p className="text-xs font-mono uppercase text-muted-foreground mt-0.5">
                      {[item.media.type, item.media.year].filter(Boolean).join(" · ")}
                    </p>
                    
                    {editingNoteMediaId === item.mediaId ? (
                      <div className="mt-3 flex gap-2 max-w-md">
                        <Input
                          value={editingNoteValue}
                          onChange={(e) => setEditingNoteValue(e.target.value)}
                          placeholder="Add a note..."
                          className="h-9 text-sm bg-background border-border  shadow-inner"
                        />
                        <Button size="sm" className="h-9 px-3  btn-skeuo-base border-primary/20" onClick={() => updateNoteMutation.mutate({ mediaId: item.mediaId, note: editingNoteValue.trim() || null })}>
                          SAVE
                        </Button>
                        <Button size="sm" variant="outline" className="h-9 px-3  btn-skeuo-base border-border" onClick={() => setEditingNoteMediaId(null)}>
                          CANCEL
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        {item.note && <p className="text-sm text-foreground/80 font-mono border-l-2 border-primary/50 pl-3 py-0.5 bg-background/50">{item.note}</p>}
                        {canContribute && (
                          <button onClick={() => startEditNote(item)} className="mt-1.5 text-xs font-mono font-bold text-primary/70 hover:text-primary transition-colors uppercase">
                            {item.note ? "EDIT NOTE" : "+ ADD NOTE"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {canContribute && (
                    <button
                      onClick={() => removeItemMutation.mutate(item.mediaId)}
                      className="shrink-0 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        {list.visibility === "public" && (
          <div className="mt-16 pt-10 border-t border-border">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-brand tracking-tight uppercase">
                Comments <span className="text-muted-foreground font-mono text-base">({comments.length})</span>
              </h2>
            </div>
            
            {currentUser && (
              <div className="mb-8 flex gap-4 bg-card p-4 border border-border shadow-sm relative">
                <div className="bg-noise absolute inset-0 z-0"></div>
                <Avatar className="h-10 w-10 shrink-0 border border-border  relative z-10">
                  <AvatarImage src={currentUser.avatarUrl} className="" />
                  <AvatarFallback className="bg-primary/20 text-primary font-brand ">{currentUser.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex flex-col gap-3 relative z-10">
                  <Textarea
                    placeholder="Share your thoughts on this list..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    className="resize-none bg-background border-border shadow-inner focus-visible:ring-primary "
                  />
                  <div className="flex justify-end">
                    <Button
                      className=" px-6 btn-skeuo-base border border-primary/20 shadow-sm"
                      disabled={!commentBody.trim() || addCommentMutation.isPending}
                      onClick={() => addCommentMutation.mutate(commentBody.trim())}
                    >
                      POST COMMENT
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {comments.length === 0 && !currentUser && (
              <p className="text-muted-foreground text-center py-8 bg-card border border-border font-mono text-sm uppercase shadow-sm">Sign in to leave a comment.</p>
            )}
            
            <div className="space-y-6">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-4 group">
                  <Avatar className="h-10 w-10 shrink-0 border border-border  shadow-sm">
                    <AvatarImage src={c.user.avatarUrl} className="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-brand ">{c.user.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 bg-card p-4 border border-border shadow-sm relative">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Link href={`/u/${c.user.username}`}>
                          <span className="text-sm font-bold hover:text-primary transition-colors cursor-pointer">{c.user.displayName}</span>
                        </Link>
                        <span className="text-xs font-mono uppercase text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {currentUser?.id === c.userId && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(c.id)}
                          className="text-xs font-mono uppercase text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <InviteCollaboratorsModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        listId={id!}
        collaborators={list.collaborators}
      />

      <BottomNav />
    </div>
  );
}
