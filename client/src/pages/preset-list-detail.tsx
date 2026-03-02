import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Check,
  GitFork,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useEnsureMedia } from "@/lib/use-ensure-media";
import { cn } from "@/lib/utils";

interface PresetItem {
  externalId: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  synopsis: string;
  tags: string[];
  type: string;
  rating: string;
}

interface PresetComment {
  id: string;
  presetListId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string };
}

interface PresetListDetail {
  id: string;
  name: string;
  description: string;
  mediaType: string;
  icon: string;
  expectedCount: number;
  ranked?: boolean;
  items: PresetItem[];
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  progress: string[];
}

export default function PresetListDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { ensureAndNavigate } = useEnsureMedia();
  const [commentBody, setCommentBody] = useState("");

  const { data: preset, isLoading, error } = useQuery<PresetListDetail>({
    queryKey: ["/api/preset-lists", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/preset-lists/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<PresetComment[]>({
    queryKey: ["/api/preset-lists", id, "comments"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/preset-lists/${id}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/preset-lists/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists"] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/preset-lists/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists"] });
    },
  });

  const progressMutation = useMutation({
    mutationFn: async ({
      externalId,
      completed,
    }: { externalId: string; completed: boolean }) => {
      const encoded = encodeURIComponent(externalId);
      if (completed) {
        await apiRequest("POST", `/api/preset-lists/${id}/progress/${encoded}`);
      } else {
        await apiRequest("DELETE", `/api/preset-lists/${id}/progress/${encoded}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists", id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest("POST", `/api/preset-lists/${id}/comments`, { body });
      return res.json();
    },
    onSuccess: () => {
      setCommentBody("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists", id] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/preset-lists/${id}/comments/${commentId}`);
    },
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/preset-lists", id] });
    },
  });

  const forkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/preset-lists/${id}/fork`);
      return res.json();
    },
    onSuccess: (list: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      navigate(`/lists/${list.id}`);
    },
  });

  const progressSet = new Set(preset?.progress ?? []);
  const completedCount = preset ? progressSet.size : 0;
  const heroImage = preset?.items?.[0]?.coverUrl;

  if (error || (!isLoading && !preset)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground mb-4 font-mono uppercase tracking-widest text-sm">List not found</p>
        <Link href="/lists">
          <Button variant="outline" className="rounded-none btn-skeuo-base border-border shadow-sm">Back to Lists</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !preset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <Link href="/lists">
            <Button variant="outline" size="icon" className="mb-6 rounded-none bg-background/80 border-border shadow-sm btn-skeuo-base hover:bg-background text-foreground" aria-label="Back to lists">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="rounded-none bg-primary/20 border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-widest font-mono">
                  {preset.mediaType}
                </span>
                {preset.ranked && (
                  <span className="rounded-none bg-card border border-border px-2.5 py-1 text-xs font-bold text-foreground uppercase tracking-widest font-mono">
                    Ranked
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-brand tracking-tight text-foreground mb-2 leading-tight">
                {preset.name}
              </h1>
              {preset.description && (
                <p className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed">
                  {preset.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <Button
                size="lg"
                variant={preset.hasLiked ? "default" : "outline"}
                className={cn(
                  "rounded-none shadow-sm transition-all duration-300 btn-skeuo-base",
                  preset.hasLiked ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive" : "bg-card border-border hover:bg-muted text-foreground"
                )}
                onClick={() => currentUser ? (preset.hasLiked ? unlikeMutation.mutate() : likeMutation.mutate()) : null}
                disabled={likeMutation.isPending || unlikeMutation.isPending || !currentUser}
              >
                <Heart className={cn("mr-2 h-5 w-5", preset.hasLiked ? "fill-current" : "")} />
                {preset.likeCount}
              </Button>
              
              {currentUser && (
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-none bg-card border-border shadow-sm hover:bg-muted text-foreground btn-skeuo-base"
                  onClick={() => forkMutation.mutate()}
                  disabled={forkMutation.isPending}
                >
                  <GitFork className="mr-2 h-5 w-5" /> FORK LIST
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {currentUser && preset.items.length > 0 && (
          <div className="mb-10 bg-card border border-border rounded-none p-6 shadow-sm relative">
            <div className="bg-noise absolute inset-0 z-0"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between text-sm font-mono font-bold uppercase tracking-wider mb-3">
                <span className="text-foreground">Your Progress</span>
                <span className="text-primary">{completedCount} <span className="text-muted-foreground font-normal">/ {preset.items.length}</span></span>
              </div>
              <div className="h-3 rounded-none bg-muted border border-border overflow-hidden shadow-inner">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out relative"
                  style={{
                    width: `${preset.items.length ? (completedCount / preset.items.length) * 100 : 0}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-border pb-2">
            <h2 className="text-xl font-brand tracking-tight">
              ITEMS <span className="text-muted-foreground font-mono text-base ml-2">({preset.items.length})</span>
            </h2>
          </div>
          
          {preset.items.length === 0 && (
            <div className="py-16 text-center bg-card rounded-none border border-border shadow-sm relative">
              <div className="bg-noise absolute inset-0 z-0"></div>
              <p className="text-muted-foreground font-mono uppercase text-sm relative z-10">No items in this list yet.</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {preset.items.map((item, index) => {
              const isCompleted = progressSet.has(item.externalId);
              return (
                <div key={item.externalId} className="relative group">
                  <button
                    type="button"
                    className="w-full text-left outline-none block"
                    onClick={() =>
                      ensureAndNavigate({
                        type: item.type,
                        title: item.title,
                        creator: item.creator,
                        year: item.year,
                        coverUrl: item.coverUrl,
                        synopsis: item.synopsis,
                        tags: item.tags,
                        rating: item.rating,
                        externalId: item.externalId,
                      })
                    }
                  >
                    <div className="relative aspect-[2/3] rounded-none overflow-hidden bg-card border border-border transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[4px_4px_0_0_var(--color-border)]">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className={cn(
                            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105",
                            isCompleted ? "opacity-50 grayscale-[50%]" : ""
                          )}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const placeholder = e.currentTarget.nextElementSibling;
                            if (placeholder instanceof HTMLElement)
                              placeholder.style.display = "block";
                          }}
                        />
                      ) : null}
                      <div
                        className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-950"
                        style={{ display: item.coverUrl ? "none" : "block" }}
                        aria-hidden
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                      {preset.ranked && (
                        <div className="absolute top-0 left-0 bg-card border-b border-r border-border text-foreground text-xs font-brand px-3 py-1.5 z-10">
                          #{index + 1}
                        </div>
                      )}
                      
                      {currentUser && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            progressMutation.mutate({
                              externalId: item.externalId,
                              completed: !isCompleted,
                            });
                          }}
                          className={cn(
                            "absolute top-2 right-2 rounded-none p-2 transition-all duration-300 z-20 shadow-sm border border-border",
                            isCompleted
                              ? "bg-primary text-primary-foreground scale-100 opacity-100"
                              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                          )}
                          disabled={progressMutation.isPending}
                          title={isCompleted ? "Mark incomplete" : "Mark complete"}
                        >
                          <Check className="h-4 w-4" strokeWidth={isCompleted ? 3 : 2} />
                        </button>
                      )}
                      
                      {isCompleted && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="bg-background/80 rounded-none p-3 border border-border shadow-sm">
                            <Check className="h-8 w-8 text-primary" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 px-1 border-l-2 border-primary/50 pl-2">
                      <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      {item.year && (
                        <p className="truncate text-xs font-mono uppercase text-muted-foreground mt-0.5">{item.year}</p>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-16 pt-10 border-t border-border">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-brand tracking-tight uppercase">
              Comments <span className="text-muted-foreground font-mono text-base">({comments.length})</span>
            </h2>
          </div>
          
          {currentUser && (
            <div className="mb-8 flex gap-4 bg-card p-4 rounded-none border border-border shadow-sm relative">
              <div className="bg-noise absolute inset-0 z-0"></div>
              <Avatar className="h-10 w-10 shrink-0 border border-border rounded-none relative z-10">
                <AvatarImage src={currentUser.avatarUrl} className="rounded-none" />
                <AvatarFallback className="bg-primary/20 text-primary rounded-none font-brand">{currentUser.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-3 relative z-10">
                <Textarea
                  placeholder="Share your thoughts on this list..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={3}
                  className="resize-none bg-background border-border shadow-inner focus-visible:ring-primary rounded-none"
                />
                <div className="flex justify-end">
                  <Button
                    className="rounded-none px-6 btn-skeuo-base border border-primary/20 shadow-sm"
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
            <p className="text-muted-foreground text-center py-8 bg-card rounded-none border border-border font-mono text-sm uppercase shadow-sm">Sign in to leave a comment.</p>
          )}
          
          <div className="space-y-6">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-4 group">
                <Avatar className="h-10 w-10 shrink-0 border border-border rounded-none shadow-sm">
                  <AvatarImage src={c.user.avatarUrl} className="rounded-none" />
                  <AvatarFallback className="bg-primary/10 text-primary rounded-none font-brand">{c.user.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 bg-card rounded-none p-4 border border-border shadow-sm relative">
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
      </div>
      <BottomNav />
    </div>
  );
}
