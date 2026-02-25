import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [path] = useLocation();
  const { currentUser } = useAuth();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/conversations/unread-count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations/unread-count");
      return res.json();
    },
    enabled: !!currentUser,
    refetchInterval: false,
  });
  const unreadCount = unreadData?.count ?? 0;

  const linkClass = (href: string) =>
    cn(
      "text-sm font-medium transition-colors hover:text-foreground",
      path === href || (href !== "/" && path.startsWith(href))
        ? "text-foreground"
        : "text-muted-foreground"
    );
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(href));
  const profileActive =
    path === "/signin" || (!!currentUser && path === `/u/${currentUser.username}`);
  const profileLinkClass = cn(
    "text-sm font-medium transition-colors hover:text-foreground",
    profileActive ? "text-foreground" : "text-muted-foreground"
  );

  return (
    <div className="font-brand fixed inset-x-0 bottom-0 z-40 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
      <nav
        className="mx-auto grid max-w-6xl grid-cols-6 items-center gap-1 px-2 py-3 sm:px-4"
        style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
        aria-label="Main navigation"
      >
        <Link href="/" data-testid="nav-home" className={cn("flex min-w-0 justify-center", linkClass("/"))}>
          Home
        </Link>
        <Link href="/discover" data-testid="nav-discover" className={cn("flex min-w-0 justify-center", linkClass("/discover"))}>
          Discover
        </Link>
        <Link href="/pick" data-testid="nav-pick" className={cn("flex min-w-0 justify-center", linkClass("/pick"))}>
          Pick
        </Link>
        <Link href="/watchlist" data-testid="nav-watchlist" className={cn("flex min-w-0 justify-center", linkClass("/watchlist"))}>
          Watchlist
        </Link>
        <Link
          href="/messages"
          data-testid="nav-messages"
          data-nav-item="chat"
          className={cn(
            "relative flex min-w-0 items-center justify-center gap-1 overflow-visible text-sm font-medium transition-colors hover:text-foreground",
            active("/messages") ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="truncate">Chat</span>
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <Link
          href={currentUser ? `/u/${currentUser.username}` : "/signin"}
          data-testid="nav-profile"
          className={cn("flex min-w-0 justify-center", profileLinkClass)}
        >
          Profile
        </Link>
      </nav>
    </div>
  );
}
