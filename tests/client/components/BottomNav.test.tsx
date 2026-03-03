import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ currentUser: null }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/"] as [string],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({ json: () => Promise.resolve({ count: 0 }) }),
}));

function renderBottomNav() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BottomNav />
    </QueryClientProvider>
  );
}

describe("BottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation links", () => {
    renderBottomNav();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByText("Lists")).toBeInTheDocument();
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("has data-testid for home link", () => {
    renderBottomNav();
    expect(screen.getByTestId("nav-home")).toBeInTheDocument();
  });
});
