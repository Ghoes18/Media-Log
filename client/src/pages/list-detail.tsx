import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Film,
  Globe,
  Lock,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
  X,
  Check,
  Search,
  Loader2,
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

interface ListDetail {
  id: string;
  name: string;
  description: string;
  visibility: string;
  ownerId: string;
  createdAt: string;
  items: ListItemDetail[];
  collaborators: CollaboratorItem[];
  invitations: InvitationItem[];
  isOwner: boolean;
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
    enabled: !!id && !!currentUser,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string; visibility?: string }) => {
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

  const addItemMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const res = await apiRequest("POST", `/api/lists/${id}/items`, { mediaId });
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

  const removeCollabMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/lists/${id}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
    },
  });

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

  async function handleAddMedia(item: SearchResult) {
    // ensure media exists in our DB
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
    addItemMutation.mutate(media.id);
  }

  function startEdit() {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description ?? "");
    setEditVisibility(list.visibility === "public" ? "public" : "private");
    setEditing(true);
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Sign in to view this list</p>
      </div>
    );
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
  const canContribute =
    list.isOwner || list.collaborators.some((c) => c.userId === currentUser.id);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lists")} className="-ml-2 mt-0.5">
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={editVisibility === "private" ? "default" : "outline"}
                    onClick={() => setEditVisibility("private")}
                  >
                    <Lock className="mr-1 h-3 w-3" /> Private
                  </Button>
                  <Button
                    size="sm"
                    variant={editVisibility === "public" ? "default" : "outline"}
                    onClick={() => setEditVisibility("public")}
                  >
                    <Globe className="mr-1 h-3 w-3" /> Public
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editName.trim() || updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({ name: editName, description: editDesc, visibility: editVisibility })
                    }
                  >
                    <Check className="mr-1 h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold truncate">{list.name}</h1>
                  {list.visibility === "public" ? (
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
                {list.description && (
                  <p className="text-sm text-muted-foreground">{list.description}</p>
                )}
              </>
            )}
          </div>
          {canEdit && !editing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={startEdit} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/80"
                onClick={() => {
                  if (confirm("Delete this list? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
                title="Delete list"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Owner actions */}
        {canEdit && (
          <div className="mb-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1 h-3 w-3" />
              Invite Collaborators
            </Button>
          </div>
        )}

        {/* Collaborators */}
        {list.collaborators.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Collaborators
            </h2>
            <div className="flex flex-wrap gap-2">
              {list.collaborators.map((collab) => (
                <div
                  key={collab.userId}
                  className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={collab.user.avatarUrl} />
                    <AvatarFallback>{collab.user.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{collab.user.displayName}</span>
                  {canEdit && (
                    <button
                      onClick={() => removeCollabMutation.mutate(collab.userId)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove collaborator"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add media */}
        {canContribute && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Add Media
            </h2>
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
              <ul className="mt-2 space-y-1 rounded-md border bg-popover shadow-sm">
                {searchResults.map((item, i) => (
                  <li key={i}>
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                      onClick={() => handleAddMedia(item)}
                      disabled={addItemMutation.isPending}
                    >
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="h-10 w-7 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            "h-10 w-7 shrink-0 rounded bg-gradient-to-br",
                            item.coverGradient ?? "from-slate-700 to-slate-900"
                          )}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[item.type, item.year].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Items */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Items ({list.items.length})
          </h2>
          {list.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Film className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No items yet — add your first!</p>
            </div>
          )}
          <div className="space-y-2">
            {list.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <Link href={`/m/${item.mediaId}`}>
                  {item.media.coverUrl ? (
                    <img
                      src={item.media.coverUrl}
                      alt={item.media.title}
                      className="h-12 w-8 shrink-0 rounded object-cover cursor-pointer"
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-12 w-8 shrink-0 rounded bg-gradient-to-br cursor-pointer",
                        item.media.coverGradient ?? "from-slate-700 to-slate-900"
                      )}
                    />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/m/${item.mediaId}`}>
                    <p className="truncate text-sm font-medium hover:underline cursor-pointer">
                      {item.media.title}
                    </p>
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {[item.media.type, item.media.year].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={item.addedBy.avatarUrl} />
                      <AvatarFallback className="text-[8px]">
                        {item.addedBy.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground">
                      {item.addedBy.displayName}
                    </span>
                  </div>
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
        </div>
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
