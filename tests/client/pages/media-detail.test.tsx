import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MediaDetail from "@/pages/media-detail";

vi.mock("wouter", () => ({
  useParams: () => ({ id: "media-1" }),
  useLocation: () => ["/m/media-1"] as [string],
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

vi.mock("@/lib/use-subscription", () => ({
  useSubscription: () => ({ status: "free" }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

function renderMediaDetail() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(["/api/media", "media-1"], {
    id: "media-1",
    title: "Test Movie",
    type: "movie",
    creator: "",
    year: "2024",
    coverUrl: "",
    coverGradient: "from-slate-700 to-slate-900",
    synopsis: "A test movie",
    tags: [],
    rating: "",
    externalId: "",
  });
  queryClient.setQueryData(["/api/media/media-1/reviews"], []);
  queryClient.setQueryData([`/api/media/media-1/stats`], {
    watched: 0,
    likes: 0,
    listed: 0,
    averageRating: null,
    reviewCount: 0,
  });
  queryClient.setQueryData(["/api/media/media-1/reviews"], []);
  return render(
    <QueryClientProvider client={queryClient}>
      <MediaDetail />
    </QueryClientProvider>
  );
}

describe("MediaDetail", () => {
  it("renders media title when loaded", async () => {
    renderMediaDetail();
    expect(await screen.findByTestId("text-media-title")).toHaveTextContent("Test Movie");
  });
});
