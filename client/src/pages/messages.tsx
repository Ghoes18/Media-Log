import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  CheckCheck,
  Clock,
  UserPlus,
  X,
  Inbox,
} from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/websocket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface OtherUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface ConversationItem {
  id: string;
  status: "active" | "request" | "declined";
  requestedById: string | null;
  lastMessageAt: string | null;
  otherUser: OtherUser;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: OtherUser;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConversationRow({
  conv,
  isActive,
  currentUserId,
  onClick,
}: {
  conv: ConversationItem;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const isRequest = conv.status === "request";
  const snippet = conv.lastMessage?.body ?? "No messages yet";
  const isOwnLast = conv.lastMessage?.senderId === currentUserId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 rounded-md border bg-card/60 px-3 py-3 transition",
        isActive
          ? "border-primary/30 bg-primary/10"
          : "border-border hover:bg-card/80",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11 ring-1 ring-border">
          <AvatarImage src={conv.otherUser.avatarUrl ?? ""} alt={conv.otherUser.displayName} />
          <AvatarFallback className="bg-primary/15 text-sm font-semibold">
            {conv.otherUser.displayName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        {isRequest && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-background">
            <Clock className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm font-semibold", isActive && "text-primary")}>
            {conv.otherUser.displayName}
          </span>
          {conv.lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(conv.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isOwnLast && <CheckCheck className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <p className="truncate text-xs text-muted-foreground">{snippet}</p>
        </div>
      </div>

      {conv.unreadCount > 0 && (
        <span className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
        </span>
      )}
    </button>
  );
}

// ── Chat view ─────────────────────────────────────────────────────────────────

function ChatView({
  conv,
  currentUserId,
  onBack,
}: {
  conv: ConversationItem;
  currentUserId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const messagesQueryKey = `/api/conversations/${conv.id}/messages`;

  const { data: msgs = [] } = useQuery<MessageItem[]>({
    queryKey: [messagesQueryKey],
    queryFn: async () => {
      const res = await apiRequest("GET", messagesQueryKey);
      return res.json();
    },
    refetchInterval: false,
  });

  // Live message subscription
  useEffect(() => {
    return subscribe("new_message", (payload) => {
      if (payload.conversationId === conv.id) {
        queryClient.invalidateQueries({ queryKey: [messagesQueryKey] });
      }
    });
  }, [subscribe, conv.id, queryClient, messagesQueryKey]);

  // Mark read when chat opens or new messages arrive
  useEffect(() => {
    if (msgs.length === 0) return;
    const hasUnread = msgs.some((m) => m.senderId !== currentUserId && !m.readAt);
    if (!hasUnread) return;
    apiRequest("PATCH", `/api/conversations/${conv.id}/read`).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
  }, [msgs, conv.id, currentUserId, queryClient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest("POST", `/api/conversations/${conv.id}/messages`, { body });
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: [messagesQueryKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/conversations/${conv.id}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/conversations/${conv.id}/decline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onBack();
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [draft, sendMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const isRecipientOfRequest =
    conv.status === "request" && conv.requestedById !== currentUserId;
  const isSenderOfRequest =
    conv.status === "request" && conv.requestedById === currentUserId;

  const sentRequestMessages = isSenderOfRequest
    ? msgs.filter((m) => m.senderId === currentUserId).length
    : 0;
  const remainingRequestMessages = Math.max(0, 3 - sentRequestMessages);

  // Group messages by date
  const groups: { date: string; items: MessageItem[] }[] = [];
  for (const msg of msgs) {
    const label = timeLabel(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.date === label) {
      last.items.push(msg);
    } else {
      groups.push({ date: label, items: [msg] });
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — matches Watchlist / platform header style */}
      <div className="flex items-center gap-3 border-b bg-background/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden rounded-md"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Link href={`/u/${conv.otherUser.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
            <AvatarImage src={conv.otherUser.avatarUrl ?? ""} alt={conv.otherUser.displayName} />
            <AvatarFallback className="bg-primary/15 text-xs font-semibold">
              {conv.otherUser.displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-none">{conv.otherUser.displayName}</div>
            <div className="truncate text-xs text-muted-foreground">@{conv.otherUser.username}</div>
          </div>
        </Link>
      </div>

      {/* Request banner (recipient) — platform amber accent */}
      {isRecipientOfRequest && (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            {conv.otherUser.displayName} wants to send you a message
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 rounded-md px-3 text-xs"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-md border-amber-500/30 px-3 text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending}
            >
              <X className="mr-1 h-3 w-3" />
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full border border-border bg-card/60 p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-serif text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Send one below to start the conversation.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            <div className="my-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">{group.date}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-1">
              {group.items.map((msg, idx) => {
                const isOwn = msg.senderId === currentUserId;
                const prevMsg = group.items[idx - 1];
                const nextMsg = group.items[idx + 1];
                const showAvatar = !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId);
                const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId;
                const isLast = !nextMsg || nextMsg.senderId !== msg.senderId;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "flex items-end gap-2",
                      isOwn ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {!isOwn && (
                      <div className="w-7 shrink-0">
                        {showAvatar && (
                          <Avatar className="h-7 w-7 ring-1 ring-border">
                            <AvatarImage src={conv.otherUser.avatarUrl ?? ""} />
                            <AvatarFallback className="bg-primary/15 text-[10px]">
                              {conv.otherUser.displayName.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[72%] px-3 py-2 text-sm leading-relaxed",
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                        isFirst && isOwn ? "rounded-tl-2xl rounded-tr-2xl" : "",
                        isFirst && !isOwn ? "rounded-tl-2xl rounded-tr-2xl" : "",
                        isLast && isOwn ? "rounded-bl-2xl rounded-br-md" : "",
                        isLast && !isOwn ? "rounded-br-2xl rounded-bl-md" : "",
                        !isFirst && !isLast ? "rounded-2xl" : "",
                        isFirst && isLast ? "rounded-2xl" : "",
                      )}
                    >
                      {msg.body}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Request limit notice (sender) — matches platform amber style */}
      {isSenderOfRequest && remainingRequestMessages > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-center">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            You can send {remainingRequestMessages} more message{remainingRequestMessages !== 1 ? "s" : ""} before they accept your request.
          </p>
        </div>
      )}
      {isSenderOfRequest && remainingRequestMessages === 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3 shrink-0" />
            Waiting for {conv.otherUser.displayName} to accept your request.
          </p>
        </div>
      )}

      {/* Input — platform card-like border */}
      {(conv.status === "active" || isSenderOfRequest) && (
        <div className="border-t bg-background/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isSenderOfRequest && remainingRequestMessages === 0
                  ? "Waiting for reply…"
                  : `Message ${conv.otherUser.displayName}…`
              }
              disabled={sendMutation.isPending || (isSenderOfRequest && remainingRequestMessages === 0)}
              className="flex-1 rounded-md border border-border bg-card/60 px-4 text-sm"
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-md"
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending || (isSenderOfRequest && remainingRequestMessages === 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full border border-border bg-card/60 p-5">
        <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-serif text-lg font-semibold text-foreground">Your messages</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Send private messages to other users. Visit a profile and press Message to start.
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Messages() {
  const { currentUser } = useAuth();
  const params = useParams<{ conversationId?: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  const [activeTab, setActiveTab] = useState<"active" | "request">("active");
  const [selectedId, setSelectedId] = useState<string | null>(params.conversationId ?? null);
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    params.conversationId ? "chat" : "list",
  );

  const { data: activeConvs = [], isLoading: loadingActive } = useQuery<ConversationItem[]>({
    queryKey: ["/api/conversations", "active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations?status=active");
      return res.json();
    },
    enabled: !!currentUser,
    refetchInterval: false,
  });

  const { data: requestConvs = [], isLoading: loadingRequests } = useQuery<ConversationItem[]>({
    queryKey: ["/api/conversations", "request"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations?status=request");
      return res.json();
    },
    enabled: !!currentUser,
    refetchInterval: false,
  });

  // Listen for new_message to refresh conversation lists
  useEffect(() => {
    return subscribe("new_message", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    });
  }, [subscribe, queryClient]);

  // Listen for conversation_updated (accept/decline)
  useEffect(() => {
    return subscribe("conversation_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    });
  }, [subscribe, queryClient]);

  const displayedConvs = activeTab === "active" ? activeConvs : requestConvs;
  const isLoading = activeTab === "active" ? loadingActive : loadingRequests;

  const selectedConv =
    selectedId != null
      ? [...activeConvs, ...requestConvs].find((c) => c.id === selectedId)
      : undefined;

  const handleSelectConv = (conv: ConversationItem) => {
    setSelectedId(conv.id);
    navigate(`/messages/${conv.id}`, { replace: true });
    setMobileView("chat");
  };

  const handleBack = () => {
    setMobileView("list");
    navigate("/messages", { replace: true });
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to view your messages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Top bar — matches Watchlist / platform header */}
      <header className="sticky top-0 z-30 shrink-0 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md shrink-0" data-testid="button-back" asChild>
            <Link href="/" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-lg font-semibold" data-testid="text-messages-page-title">
              Messages
            </h1>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-messages-page-subtitle">
              Private conversations with other members.
            </p>
          </div>
          {requestConvs.length > 0 && (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
              {requestConvs.length}
            </span>
          )}
        </div>
      </header>

      <motion.div
        className="flex flex-1 min-w-0 overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Sidebar / list */}
        <aside
          className={cn(
            "flex w-full flex-col border-r border-border bg-background md:w-80 md:max-w-[320px] shrink-0",
            mobileView === "chat" ? "hidden" : "flex",
          )}
        >
          {/* Tabs — platform TabsList style */}
          <div className="border-b border-border px-4 py-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "request")}>
              <TabsList className="w-full rounded-md border border-border bg-muted/50 p-1">
                <TabsTrigger value="active" className="flex-1 rounded-md text-xs">
                  Messages
                </TabsTrigger>
                <TabsTrigger value="request" className="relative flex-1 rounded-md text-xs">
                  Requests
                  {requestConvs.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                      {requestConvs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* List — only grows when there are conversations */}
          <div
            className={cn(
              "overflow-y-auto p-3 space-y-2",
              displayedConvs.length > 0 && "flex-1 min-h-0",
            )}
          >
            {isLoading ? (
              <div className="flex h-24 items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : displayedConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <div className="rounded-full border border-border bg-card/60 p-3">
                  <Inbox className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "active" ? "No conversations yet" : "No pending requests"}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {displayedConvs.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ConversationRow
                      conv={conv}
                      isActive={conv.id === selectedId}
                      currentUserId={currentUser.id}
                      onClick={() => handleSelectConv(conv)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <main
          className={cn(
            "flex-1 overflow-hidden",
            mobileView === "list" ? "hidden md:flex md:flex-col" : "flex flex-col",
          )}
        >
          {selectedConv ? (
            <ChatView
              conv={selectedConv}
              currentUserId={currentUser.id}
              onBack={handleBack}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </motion.div>
    </div>
  );
}
