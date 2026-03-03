import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/home";

vi.mock("wouter", () => ({
  useLocation: () => ["/"] as [string],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ currentUser: null }),
}));

vi.mock("@/lib/use-ensure-media", () => ({
  useEnsureMedia: () => ({ ensureAndNavigate: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(["/api/trending", "all"], []);
  queryClient.setQueryData(["/api/reviews/popular"], []);
  queryClient.setQueryData(["/api/users/top-reviewers"], []);
  queryClient.setQueryData(["/api/search/all", "", "all"], []);
  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
}

describe("Home", () => {
  it("renders page structure", () => {
    renderHome();
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
  });

  it("renders discover link", () => {
    renderHome();
    const discoverLink = screen.getByRole("link", { name: /discover/i });
    expect(discoverLink).toBeInTheDocument();
  });
});
