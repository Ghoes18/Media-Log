import { Link } from "wouter";
import { Plus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopNavProps {
  query?: string;
  setQuery?: (v: string) => void;
  currentUser: any;
  showSearch?: boolean;
}

export function TopNav({
  query = "",
  setQuery,
  currentUser,
  showSearch = true,
}: TopNavProps) {
  return (
    <div className="sticky top-0 z-40 w-full pt-3 pb-2 sm:pt-4 sm:pb-3 px-4 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-4 bg-background/80 backdrop-blur-xl pointer-events-none" />
      <div className="relative mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 transition-all">
        <Link href="/" data-testid="link-home" className="group flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/5 ring-1 ring-border/50 transition-colors group-hover:bg-foreground/10">
            <span className="font-brand text-lg font-semibold text-primary">T</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-brand text-[15px] font-semibold leading-tight text-foreground">Tastelog</div>
            <div className="text-xs font-medium text-muted-foreground">Your taste, across mediums</div>
          </div>
        </Link>

        {showSearch && (
          <div className="ml-auto hidden w-[420px] max-w-full items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 shadow-inner transition-colors focus-within:bg-background/80 sm:flex">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery?.(e.target.value)}
              placeholder="Search films, animation, books, TV, music, games…"
              className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
              data-testid="input-search"
            />
            <Badge variant="secondary" className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-muted/80 text-muted-foreground">
              ⌘K
            </Badge>
          </div>
        )}

        <div className={`flex items-center gap-3 ${showSearch ? "pl-2" : "ml-auto"}`}>
          <ThemeToggle />

          <Button skeuo size="sm" className="rounded-xl shadow-sm font-semibold tracking-wide" data-testid="button-log" asChild>
            <Link href="/review/new" data-testid="link-new-review">
              <Plus className="mr-1.5 size-4" />
              Log
            </Link>
          </Button>

          {showSearch && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-xl shadow-sm sm:hidden"
                  data-testid="button-open-search"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="p-0 rounded-b-2xl border-b border-border/50 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="px-4 pt-6">
                  <SheetTitle className="font-serif text-xl">Search</SheetTitle>
                  <SheetDescription>
                    Find something to review, save, or browse.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6 mt-4">
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 shadow-inner">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery?.(e.target.value)}
                      placeholder="Search films, animation, books…"
                      className="h-10 border-0 bg-transparent text-base focus-visible:ring-0 shadow-none px-1"
                      data-testid="input-search-mobile"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {currentUser ? (
            <Link href={`/u/${currentUser.username}`} data-testid="link-profile" className="grid place-items-center ml-1">
              <Avatar className="h-9 w-9 ring-2 ring-background transition-transform hover:scale-105" data-testid="avatar-you">
                <AvatarImage alt={currentUser.displayName} src={currentUser.avatarUrl ?? ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                  {currentUser.displayName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" className="rounded-xl ml-1 font-semibold" asChild>
              <Link href="/signin" data-testid="link-signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
