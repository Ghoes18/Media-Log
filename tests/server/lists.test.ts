import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createList, createUser, createListItem } from "../helpers/fixtures";

describe("Lists API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  const appUser = createUser({ id: "user-1", username: "alice" });

  describe("POST /api/lists", () => {
    it("creates list when authenticated", async () => {
      const list = createList({ id: "list-1", ownerId: "user-1", name: "My List" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.createList.mockResolvedValue(list);

      const res = await request
        .post("/api/lists")
        .set("Authorization", "Bearer user-1")
        .send({ name: "My List" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: "list-1", name: "My List" });
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request.post("/api/lists").send({ name: "My List" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/lists", () => {
    it("returns user lists when authenticated", async () => {
      const lists = [createList({ id: "list-1", name: "My List" })];
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getUserLists.mockResolvedValue(lists);

      const res = await request.get("/api/lists").set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/lists/:id", () => {
    it("returns list detail for public list", async () => {
      const list = createList({ id: "list-1", visibility: "public", ownerId: "user-1" });
      const owner = createUser({ id: "user-1" });
      mockStorage.getList.mockResolvedValue(list);
      mockStorage.getUser.mockResolvedValue(owner);
      mockStorage.getListItems.mockResolvedValue([]);
      mockStorage.getListCollaborators.mockResolvedValue([]);
      mockStorage.getListLikeCount.mockResolvedValue(0);
      mockStorage.getListCommentCount.mockResolvedValue(0);

      const res = await request.get("/api/lists/list-1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "list-1", name: expect.any(String) });
    });

    it("returns 404 when list not found", async () => {
      mockStorage.getList.mockResolvedValue(undefined);

      const res = await request.get("/api/lists/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/lists/:id", () => {
    it("updates list when owner", async () => {
      const list = createList({ id: "list-1", ownerId: "user-1" });
      const updated = createList({ id: "list-1", name: "Updated Name" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getList.mockResolvedValue(list);
      mockStorage.updateList.mockResolvedValue(updated);

      const res = await request
        .patch("/api/lists/list-1")
        .set("Authorization", "Bearer user-1")
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
    });

    it("returns 403 when not owner", async () => {
      const list = createList({ id: "list-1", ownerId: "other-user" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getList.mockResolvedValue(list);

      const res = await request
        .patch("/api/lists/list-1")
        .set("Authorization", "Bearer user-1")
        .send({ name: "Hacked" });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/lists/:id", () => {
    it("deletes list when owner", async () => {
      const list = createList({ id: "list-1", ownerId: "user-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getList.mockResolvedValue(list);

      const res = await request
        .delete("/api/lists/list-1")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/lists/:id/items", () => {
    it("adds item when owner", async () => {
      const list = createList({ id: "list-1", ownerId: "user-1" });
      const item = createListItem({ listId: "list-1", mediaId: "media-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getList.mockResolvedValue(list);
      mockStorage.addListItem.mockResolvedValue(item);

      const res = await request
        .post("/api/lists/list-1/items")
        .set("Authorization", "Bearer user-1")
        .send({ mediaId: "media-1" });

      expect(res.status).toBe(201);
    });
  });

  describe("PUT /api/lists/:id/reorder", () => {
    it("reorders items when owner", async () => {
      const list = createList({ id: "list-1", ownerId: "user-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getList.mockResolvedValue(list);

      const res = await request
        .put("/api/lists/list-1/reorder")
        .set("Authorization", "Bearer user-1")
        .send({ itemIds: ["item-1", "item-2"] });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/lists/:id/fork", () => {
    it.skip("forks list when authenticated", async () => {
      const forked = createList({ id: "list-2", sourceListId: "list-1" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.forkList.mockResolvedValue(forked);

      const res = await request
        .post("/api/lists/list-1/fork")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/lists/:id/like", () => {
    it("likes list when authenticated", async () => {
      const list = createList({ id: "list-1", visibility: "public" });
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getList.mockResolvedValue(list);

      const res = await request
        .post("/api/lists/list-1/like")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/lists/:id/like", () => {
    it("unlikes list when authenticated", async () => {
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);

      const res = await request
        .delete("/api/lists/list-1/like")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });
});
