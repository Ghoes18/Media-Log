import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("queryClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation((input: string | URL | Request, opts?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes("/api/test-ok") || url.endsWith("/api/test-ok")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      if (url.includes("/api/test-401") || url.endsWith("/api/test-401")) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      if (url.includes("/api/test-post")) {
        return Promise.resolve(
          new Response(JSON.stringify({ created: true }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getQueryFn builds URL from queryKey and returns JSON", async () => {
    const { getQueryFn } = await import("@/lib/queryClient");

    const queryFn = getQueryFn<{ data: string }>({ on401: "throw" });
    const result = await queryFn({
      queryKey: ["/api/test-ok"],
      meta: undefined,
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ data: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("/api/test-ok", expect.any(Object));
  });

  it("getQueryFn with on401 returnNull returns null on 401", async () => {
    const { getQueryFn } = await import("@/lib/queryClient");

    const queryFn = getQueryFn<unknown>({ on401: "returnNull" });
    const result = await queryFn({
      queryKey: ["/api/test-401"],
      meta: undefined,
      signal: new AbortController().signal,
    });

    expect(result).toBeNull();
  });

  it("getQueryFn with on401 throw throws on 401", async () => {
    const { getQueryFn } = await import("@/lib/queryClient");

    const queryFn = getQueryFn<unknown>({ on401: "throw" });

    await expect(
      queryFn({
        queryKey: ["/api/test-401"],
        meta: undefined,
        signal: new AbortController().signal,
      })
    ).rejects.toThrow();
  });
});
