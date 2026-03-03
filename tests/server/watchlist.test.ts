import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createMedia } from "../helpers/fixtures";

describe("Watchlist API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  describe("GET /api/users/:id/watchlist", () => {
    it("returns watchlist", async () => {
      const media = [createMedia({ id: "m1", title: "Film" })];
      mockStorage.getWatchlist.mockResolvedValue(media);

      const res = await request.get("/api/users/user-1/watchlist");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/users/:userId/watchlist/:mediaId", () => {
    it("adds to watchlist when self", async () => {
      const res = await request
        .post("/api/users/user-1/watchlist/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(mockStorage.addToWatchlist).toHaveBeenCalledWith("user-1", "media-1");
    });

    it("returns 403 when adding for other user", async () => {
      const res = await request
        .post("/api/users/other-user/watchlist/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/users/:userId/watchlist/:mediaId", () => {
    it("removes from watchlist when self", async () => {
      const res = await request
        .delete("/api/users/user-1/watchlist/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(mockStorage.removeFromWatchlist).toHaveBeenCalledWith("user-1", "media-1");
    });
  });

  describe("GET /api/users/:userId/watchlist/check/:mediaId", () => {
    it("returns onWatchlist", async () => {
      mockStorage.isOnWatchlist.mockResolvedValue(true);

      const res = await request.get("/api/users/user-1/watchlist/check/media-1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ onWatchlist: true });
    });
  });

  describe("POST /api/users/:userId/watched/:mediaId", () => {
    it("marks watched when self", async () => {
      const res = await request
        .post("/api/users/user-1/watched/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/users/:userId/watched/:mediaId", () => {
    it("unmarks watched when self", async () => {
      const res = await request
        .delete("/api/users/user-1/watched/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/users/:userId/like-media/:mediaId", () => {
    it("likes media when self", async () => {
      const res = await request
        .post("/api/users/user-1/like-media/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/users/:userId/like-media/:mediaId", () => {
    it("unlikes media when self", async () => {
      const res = await request
        .delete("/api/users/user-1/like-media/media-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });
});
