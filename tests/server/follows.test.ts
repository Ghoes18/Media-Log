import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";

describe("Follows API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  describe("GET /api/users/:followerId/following/:followingId", () => {
    it("returns follow status", async () => {
      mockStorage.isFollowing.mockResolvedValue(true);

      const res = await request.get("/api/users/user-1/following/user-2");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ following: true });
    });
  });

  describe("POST /api/users/:followerId/follow/:followingId", () => {
    it("follows when authenticated", async () => {
      const res = await request
        .post("/api/users/user-1/follow/user-2")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(mockStorage.follow).toHaveBeenCalledWith("user-1", "user-2");
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request.post("/api/users/user-1/follow/user-2");

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/users/:followerId/follow/:followingId", () => {
    it("unfollows when authenticated", async () => {
      const res = await request
        .delete("/api/users/user-1/follow/user-2")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(mockStorage.unfollow).toHaveBeenCalledWith("user-1", "user-2");
    });
  });
});
