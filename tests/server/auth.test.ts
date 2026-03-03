import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createUser, createProfileSettings, createBadge } from "../helpers/fixtures";

describe("Auth API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  describe("GET /api/auth/me", () => {
    it("returns user with stats, settings, badges when authenticated", async () => {
      const user = createUser({ id: "auth-user-1", username: "testuser", displayName: "Test User" });
      const profileSettings = createProfileSettings({ userId: user.id });
      const badge = createBadge();

      mockStorage.getOrCreateAppUser.mockResolvedValue(user);
      mockStorage.getProfileStats.mockResolvedValue({ reviews: 0, followers: 0, following: 0 });
      mockStorage.getProfileSettings.mockResolvedValue(profileSettings);
      mockStorage.getUserSubscription.mockResolvedValue({ status: "free" });
      mockStorage.getUserBadges.mockResolvedValue([{ ...badge, earnedAt: new Date() }]);

      const res = await request
        .get("/api/auth/me")
        .set("Authorization", "Bearer auth-user-1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: "auth-user-1",
        username: "testuser",
        displayName: "Test User",
        profileSettings: expect.objectContaining({ userId: "auth-user-1" }),
        subscription: { status: "free" },
      });
      expect(Array.isArray(res.body.badges)).toBe(true);
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request.get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ message: "Unauthorized" });
    });
  });
});
