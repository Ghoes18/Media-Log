import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";

interface UserStub {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface Collaborator {
  userId: string;
}

interface InviteCollaboratorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  collaborators: Collaborator[];
}

export function InviteCollaboratorsModal({
  open,
  onOpenChange,
  listId,
  collaborators,
}: InviteCollaboratorsModalProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isFetching } = useQuery<UserStub[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const inviteMutation = useMutation({
    mutationFn: async (invitedUserId: string) => {
      const res = await apiRequest("POST", `/api/lists/${listId}/invitations`, { invitedUserId });
      return res.json();
    },
    onSuccess: (_data, invitedUserId) => {
      setInvitedIds((prev) => new Set([...Array.from(prev), invitedUserId]));
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
    },
  });

  const collaboratorIds = new Set(collaborators.map((c) => c.userId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Collaborators</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search by name or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {isFetching && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!isFetching && debouncedQuery.length >= 2 && results.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">No users found</p>
          )}
          <ul className="space-y-2">
            {results.map((user) => {
              const isCollab = collaboratorIds.has(user.id);
              const isInvited = invitedIds.has(user.id);
              return (
                <li key={user.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{user.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  {isCollab ? (
                    <span className="text-xs text-muted-foreground">Already a collaborator</span>
                  ) : isInvited ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3 w-3" /> Invited
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={inviteMutation.isPending}
                      onClick={() => inviteMutation.mutate(user.id)}
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      Invite
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
