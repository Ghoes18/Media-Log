import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createUser, createProfileSettings } from "../helpers/fixtures";

describe("Users API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  describe("GET /api/users/:id", () => {
    it("returns user when found", async () => {
      const user = createUser({ id: "user-1", username: "alice", displayName: "Alice" });
      mockStorage.getUser.mockResolvedValue(user);

      const res = await request.get("/api/users/user-1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "user-1", username: "alice", displayName: "Alice" });
    });

    it("returns 404 when user not found", async () => {
      mockStorage.getUser.mockResolvedValue(undefined);

      const res = await request.get("/api/users/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: "User not found" });
    });
  });

  describe("GET /api/users/search", () => {
    it("returns search results", async () => {
      const appUser = createUser({ id: "u1", username: "appuser" });
      const users = [createUser({ id: "u2", username: "alice" })];
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.searchUsers.mockResolvedValue(users);

      const res = await request.get("/api/users/search?q=alice").set("Authorization", "Bearer u1");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("updates user when self", async () => {
      const user = createUser({ id: "user-1", displayName: "Old" });
      const updated = createUser({ id: "user-1", displayName: "New Name" });
      mockStorage.updateUser.mockResolvedValue(updated);

      const res = await request
        .patch("/api/users/user-1")
        .set("Authorization", "Bearer user-1")
        .send({ displayName: "New Name" });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe("New Name");
    });

    it("returns 403 when updating other user", async () => {
      const res = await request
        .patch("/api/users/other-user")
        .set("Authorization", "Bearer user-1")
        .send({ displayName: "Hacked" });

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ message: "Forbidden" });
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request.patch("/api/users/user-1").send({ displayName: "New" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/users/:id/profile-settings", () => {
    it("returns settings when user exists", async () => {
      const user = createUser({ id: "user-1" });
      const settings = createProfileSettings({ userId: "user-1" });
      mockStorage.getUser.mockResolvedValue(user);
      mockStorage.getProfileSettings.mockResolvedValue(settings);

      const res = await request.get("/api/users/user-1/profile-settings");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ userId: "user-1" });
    });

    it("returns 404 when user not found", async () => {
      mockStorage.getUser.mockResolvedValue(undefined);

      const res = await request.get("/api/users/nonexistent/profile-settings");

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/users/:id/profile-settings", () => {
    it("filters pro fields for free users", async () => {
      const settings = createProfileSettings({ userId: "user-1", themeAccent: "amber" });
      mockStorage.getUserSubscription.mockResolvedValue({ status: "free" });
      mockStorage.updateProfileSettings.mockResolvedValue(settings);

      const res = await request
        .patch("/api/users/user-1/profile-settings")
        .set("Authorization", "Bearer user-1")
        .send({ themeAccent: "blue", bannerUrl: "https://example.com/banner.jpg" });

      expect(res.status).toBe(200);
      expect(mockStorage.updateProfileSettings).toHaveBeenCalled();
    });
  });
});
