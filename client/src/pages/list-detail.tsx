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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!list || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">List not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/lists")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const canEdit = list.isOwner;
  const canContribute = list.isOwner || list.collaborators.some((c) => c.userId === currentUser?.id);
  const showSort = !list.isRanked && list.items.length > 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lists")} className="-ml-2 mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="text-lg font-bold"
                />
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Description"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-ranked"
                    checked={editIsRanked}
                    onChange={(e) => setEditIsRanked(e.target.checked)}
                  />
                  <label htmlFor="edit-ranked" className="text-sm">Ranked</label>
                </div>
                <Input
                  placeholder="Tags (comma-separated)"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant={editVisibility === "private" ? "default" : "outline"} onClick={() => setEditVisibility("private")}>
                    <Lock className="mr-1 h-3 w-3" /> Private
                  </Button>
                  <Button size="sm" variant={editVisibility === "public" ? "default" : "outline"} onClick={() => setEditVisibility("public")}>
                    <Globe className="mr-1 h-3 w-3" /> Public
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
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
                  >
                    <Check className="mr-1 h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold truncate">{list.name}</h1>
                  {list.visibility === "public" ? (
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  {list.isRanked && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Ranked</span>
                  )}
                </div>
                {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
                {(list.tags ?? []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(list.tags ?? []).map((tag) => (
                      <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  {list.owner && (
                    <Link href={`/u/${list.owner.username}`}>
                      <div className="flex items-center gap-1.5 hover:underline cursor-pointer">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={list.owner.avatarUrl} />
                          <AvatarFallback className="text-[10px]">{list.owner.displayName[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{list.owner.displayName}</span>
                      </div>
                    </Link>
                  )}
                  {list.visibility === "public" && currentUser && (
                    <>
                      <button
                        onClick={() => (list.isLiked ? unlikeMutation.mutate() : likeMutation.mutate())}
                        className="flex items-center gap-1"
                      >
                        <Heart className={cn("h-4 w-4", list.isLiked && "fill-destructive text-destructive")} />
                        <span>{list.likeCount ?? 0}</span>
                      </button>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" /> {list.commentCount ?? 0}
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {canEdit && !editing && (
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={startEdit} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/80"
                onClick={() => { if (confirm("Delete this list? This cannot be undone.")) deleteMutation.mutate(); }}
                title="Delete list"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {canEdit && !editing && (
          <div className="mb-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1 h-3 w-3" /> Invite Collaborators
            </Button>
          </div>
        )}

        {list.collaborators.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Collaborators</h2>
            <div className="flex flex-wrap gap-2">
              {list.collaborators.map((collab) => (
                <div key={collab.userId} className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={collab.user.avatarUrl} />
                    <AvatarFallback>{collab.user.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{collab.user.displayName}</span>
                  {canEdit && (
                    <button onClick={() => removeCollabMutation.mutate(collab.userId)} className="text-muted-foreground hover:text-destructive" title="Remove collaborator">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {canContribute && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Add Media</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search movies, books, music…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            {searchLoading && (
              <div className="mt-2 flex items-center justify-center py-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {searchResults.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-md border bg-popover shadow-sm max-h-64 overflow-y-auto">
                {searchResults.map((item, i) => (
                  <li key={i}>
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                      onClick={() => handleAddMedia(item)}
                      disabled={addItemMutation.isPending}
                    >
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt={item.title} className="h-10 w-7 shrink-0 rounded object-cover" />
                      ) : (
                        <div className={cn("h-10 w-7 shrink-0 rounded bg-gradient-to-br", item.coverGradient ?? "from-slate-700 to-slate-900")} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{[item.type, item.year].filter(Boolean).join(" · ")}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Items ({list.items.length})</h2>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                className="h-7 px-2"
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className="h-7 px-2"
                title="List view"
                aria-label="List view"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            {showSort && (
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="Sort items"
                title="Sort items"
                className="h-7 rounded-md border bg-background px-2 text-xs"
              >
                <option value="order">List order</option>
                <option value="title">Title</option>
                <option value="year">Year</option>
                <option value="type">Type</option>
                <option value="date">Date added</option>
              </select>
            )}
          </div>

          {list.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Film className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No items yet — add your first!</p>
            </div>
          )}

          {viewMode === "grid" && list.items.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {sortedItems.map((item, index) => (
                <div key={item.id} className="relative group">
                  <Link href={`/m/${item.mediaId}`}>
                    <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                      {item.media.coverUrl ? (
                        <img src={item.media.coverUrl} alt={item.media.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className={cn("h-full w-full bg-gradient-to-br", item.media.coverGradient ?? "from-slate-700 to-slate-900")} />
                      )}
                      {list.isRanked && (
                        <div className="absolute top-1 left-1 rounded bg-black/70 text-white text-xs font-bold px-1.5 py-0.5">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-medium">{item.media.title}</p>
                  </Link>
                  {canContribute && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeItemMutation.mutate(item.mediaId)}
                        className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === "list" && list.items.length > 0 && (
            <div className="space-y-2">
              {sortedItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2">
                  <div className="flex flex-col gap-1 shrink-0">
                    {canContribute && (
                      <>
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || reorderMutation.isPending}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Move up"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sortedItems.length - 1 || reorderMutation.isPending}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Move down"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {list.isRanked && !canContribute && (
                      <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <Link href={`/m/${item.mediaId}`}>
                    {item.media.coverUrl ? (
                      <img src={item.media.coverUrl} alt={item.media.title} className="h-12 w-8 shrink-0 rounded object-cover cursor-pointer" />
                    ) : (
                      <div className={cn("h-12 w-8 shrink-0 rounded bg-gradient-to-br cursor-pointer", item.media.coverGradient ?? "from-slate-700 to-slate-900")} />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/m/${item.mediaId}`}>
                      <p className="truncate text-sm font-medium hover:underline cursor-pointer">{item.media.title}</p>
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.media.type, item.media.year].filter(Boolean).join(" · ")}
                    </p>
                    {editingNoteMediaId === item.mediaId ? (
                      <div className="mt-2 flex gap-1">
                        <Input
                          value={editingNoteValue}
                          onChange={(e) => setEditingNoteValue(e.target.value)}
                          placeholder="Note for this item"
                          className="h-8 text-xs"
                        />
                        <Button size="sm" className="h-8" onClick={() => updateNoteMutation.mutate({ mediaId: item.mediaId, note: editingNoteValue.trim() || null })}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingNoteMediaId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {item.note && <p className="mt-1 text-xs text-muted-foreground italic">{item.note}</p>}
                        {canContribute && (
                          <button onClick={() => startEditNote(item)} className="mt-1 text-xs text-muted-foreground hover:underline">
                            {item.note ? "Edit note" : "Add note"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {canContribute && (
                    <button
                      onClick={() => removeItemMutation.mutate(item.mediaId)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      title="Remove item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {list.visibility === "public" && (
          <div className="mt-8 pt-6 border-t">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comments</h2>
            {currentUser && (
              <div className="mb-4 flex gap-2">
                <Textarea
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  disabled={!commentBody.trim() || addCommentMutation.isPending}
                  onClick={() => addCommentMutation.mutate(commentBody.trim())}
                >
                  Post
                </Button>
              </div>
            )}
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={c.user.avatarUrl} />
                    <AvatarFallback>{c.user.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/u/${c.user.username}`}>
                        <span className="text-sm font-medium hover:underline cursor-pointer">{c.user.displayName}</span>
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      {currentUser?.id === c.userId && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(c.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-sm mt-0.5">{c.body}</p>
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
