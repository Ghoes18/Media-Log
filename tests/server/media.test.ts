import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createMedia } from "../helpers/fixtures";

describe("Media API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  describe("GET /api/media", () => {
    it("returns all media when no query", async () => {
      const media = [createMedia({ id: "m1", title: "Film 1" })];
      mockStorage.getAllMedia.mockResolvedValue(media);

      const res = await request.get("/api/media");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].title).toBe("Film 1");
    });

    it("returns media by type", async () => {
      const media = [createMedia({ type: "movie" })];
      mockStorage.getMediaByType.mockResolvedValue(media);

      const res = await request.get("/api/media?type=movie");

      expect(res.status).toBe(200);
      expect(mockStorage.getMediaByType).toHaveBeenCalledWith("movie");
    });

    it("returns search results", async () => {
      const media = [createMedia({ title: "Inception" })];
      mockStorage.searchMedia.mockResolvedValue(media);

      const res = await request.get("/api/media?search=inception");

      expect(res.status).toBe(200);
      expect(mockStorage.searchMedia).toHaveBeenCalledWith("inception");
    });
  });

  describe("POST /api/media/ensure", () => {
    it("creates or returns media", async () => {
      const media = createMedia({ id: "m1", type: "movie", title: "Inception" });
      mockStorage.ensureMedia.mockResolvedValue(media);

      const res = await request
        .post("/api/media/ensure")
        .send({ type: "movie", title: "Inception" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "m1", title: "Inception", type: "movie" });
    });

    it("returns 400 when type and title missing", async () => {
      const res = await request.post("/api/media/ensure").send({});

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: "type and title are required" });
    });
  });

  describe("GET /api/media/:id", () => {
    it("returns media when found", async () => {
      const media = createMedia({ id: "m1", title: "Test" });
      mockStorage.getMediaById.mockResolvedValue(media);

      const res = await request.get("/api/media/m1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "m1", title: "Test" });
    });

    it("returns 404 when not found", async () => {
      mockStorage.getMediaById.mockResolvedValue(undefined);

      const res = await request.get("/api/media/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: "Media not found" });
    });
  });

  describe("GET /api/media/:id/stats", () => {
    it("returns media stats", async () => {
      mockStorage.getMediaStats.mockResolvedValue({
        watched: 10,
        likes: 5,
        listed: 3,
        averageRating: 4.5,
        reviewCount: 2,
      });

      const res = await request.get("/api/media/m1/stats");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        watched: 10,
        likes: 5,
        listed: 3,
        averageRating: 4.5,
        reviewCount: 2,
      });
    });
  });
});
