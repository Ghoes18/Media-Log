import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createTierList, createTierListTier, createTierListItem, createUser } from "../helpers/fixtures";

describe("Tier Lists API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  const appUser = createUser({ id: "user-1", username: "alice" });

  describe("POST /api/tier-lists", () => {
    it("creates tier list when authenticated", async () => {
      const tierList = createTierList({ id: "tl-1", ownerId: "user-1", name: "My Tier List" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.createTierList.mockResolvedValue(tierList);

      const res = await request
        .post("/api/tier-lists")
        .set("Authorization", "Bearer user-1")
        .send({ name: "My Tier List" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: "tl-1", name: "My Tier List" });
    });
  });

  describe("GET /api/tier-lists/:id", () => {
    it("returns tier list detail for public list", async () => {
      const tierList = createTierList({ id: "tl-1", visibility: "public", ownerId: "user-1" });
      const owner = createUser({ id: "user-1" });
      const tiers = [
        {
          ...createTierListTier({ id: "tier-1", tierListId: "tl-1", label: "S" }),
          items: [] as any[],
        },
      ];
      const detail = {
        ...tierList,
        owner: { id: owner.id, username: owner.username, displayName: owner.displayName, avatarUrl: owner.avatarUrl ?? "" },
        tiers,
        unassignedItems: [],
        collaborators: [],
        invitations: [],
        isOwner: false,
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
      };
      mockStorage.getTierList.mockResolvedValue(tierList);
      mockStorage.getTierListDetail.mockResolvedValue(detail);

      const res = await request.get("/api/tier-lists/tl-1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "tl-1" });
    });

    it("returns 404 when tier list not found", async () => {
      mockStorage.getTierList.mockResolvedValue(undefined);
      mockStorage.getTierListDetail.mockResolvedValue(undefined);

      const res = await request.get("/api/tier-lists/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/tier-lists/:id", () => {
    it("updates tier list when owner", async () => {
      const tierList = createTierList({ id: "tl-1", ownerId: "user-1" });
      const updated = createTierList({ id: "tl-1", name: "Updated" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getTierList.mockResolvedValue(tierList);
      mockStorage.updateTierList.mockResolvedValue(updated);

      const res = await request
        .patch("/api/tier-lists/tl-1")
        .set("Authorization", "Bearer user-1")
        .send({ name: "Updated" });

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/tier-lists/:id", () => {
    it("deletes tier list when owner", async () => {
      const tierList = createTierList({ id: "tl-1", ownerId: "user-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getTierList.mockResolvedValue(tierList);

      const res = await request
        .delete("/api/tier-lists/tl-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/tier-lists/:id/tiers", () => {
    it("creates tier when owner", async () => {
      const tierList = createTierList({ id: "tl-1", ownerId: "user-1" });
      const tier = createTierListTier({ id: "tier-1", tierListId: "tl-1", label: "S" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getTierList.mockResolvedValue(tierList);
      mockStorage.createTier.mockResolvedValue(tier);

      const res = await request
        .post("/api/tier-lists/tl-1/tiers")
        .set("Authorization", "Bearer user-1")
        .send({ label: "S", color: "#ff0000" });

      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/tier-lists/:id/items", () => {
    it("adds item when owner", async () => {
      const tierList = createTierList({ id: "tl-1", ownerId: "user-1" });
      const item = createTierListItem({ tierListId: "tl-1", mediaId: "media-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getTierList.mockResolvedValue(tierList);
      mockStorage.addTierListItem.mockResolvedValue(item);

      const res = await request
        .post("/api/tier-lists/tl-1/items")
        .set("Authorization", "Bearer user-1")
        .send({ mediaId: "media-1" });

      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/tier-lists/:id/fork", () => {
    it.skip("forks tier list when authenticated", async () => {
      const forked = createTierList({ id: "tl-2", sourceTierListId: "tl-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.forkTierList.mockResolvedValue(forked);

      const res = await request
        .post("/api/tier-lists/tl-1/fork")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/tier-lists/:id/like", () => {
    it("likes tier list when authenticated", async () => {
      const tierList = createTierList({ id: "tl-1", visibility: "public" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getTierList.mockResolvedValue(tierList);

      const res = await request
        .post("/api/tier-lists/tl-1/like")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });
});
