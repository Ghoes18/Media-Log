import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Lock, Globe, Users, Film, Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

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
  ownerId: string;
  createdAt: string;
  owner: UserStub;
  itemCount: number;
  collaboratorCount: number;
  isCollaborator: boolean;
}

interface InvitationWithDetails {
  id: string;
  listId: string;
  status: string;
  list: { id: string; name: string };
  invitedBy: UserStub;
}

export default function Lists() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "public">("private");

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lists", {
        name: newName,
        description: newDesc,
        visibility: newVisibility,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      setNewVisibility("private");
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

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Sign in to see your lists</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Lists</h1>
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            New List
          </Button>
        </div>

        {showNew && (
          <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Create a new list</h2>
            <div className="space-y-3">
              <Input
                placeholder="List name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                maxLength={500}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant={newVisibility === "private" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewVisibility("private")}
                >
                  <Lock className="mr-1 h-3 w-3" /> Private
                </Button>
                <Button
                  variant={newVisibility === "public" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewVisibility("public")}
                >
                  <Globe className="mr-1 h-3 w-3" /> Public
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={!newName.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create
                </Button>
                <Button variant="ghost" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {invitations.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pending Invitations
            </h2>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={inv.invitedBy.avatarUrl} />
                  <AvatarFallback>{inv.invitedBy.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{inv.list.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Invited by {inv.invitedBy.displayName}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600 hover:text-green-700"
                    disabled={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(inv.id)}
                    title="Accept"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                    disabled={declineMutation.isPending}
                    onClick={() => declineMutation.mutate(inv.id)}
                    title="Decline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && userLists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No lists yet</p>
            <p className="text-sm text-muted-foreground">Create a list to organise media with friends</p>
          </div>
        )}

        <div className="space-y-3">
          {userLists.map((list) => (
            <Link key={list.id} href={`/lists/${list.id}`}>
              <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{list.name}</p>
                    {list.visibility === "public" ? (
                      <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    {list.isCollaborator && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Collaborator
                      </span>
                    )}
                  </div>
                  {list.description && (
                    <p className="truncate text-xs text-muted-foreground">{list.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Film className="h-3 w-3" /> {list.itemCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {list.collaboratorCount}
                    </span>
                    {!list.isCollaborator && (
                      <span className="text-xs">by {list.owner.displayName}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
