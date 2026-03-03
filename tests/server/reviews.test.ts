import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createReview, createUser, createMedia } from "../helpers/fixtures";

describe("Reviews API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  describe("POST /api/reviews", () => {
    it("creates review when authenticated", async () => {
      const review = createReview({
        id: "r1",
        userId: "user-1",
        mediaId: "media-1",
        rating: 5,
        body: "Great!",
      });
      mockStorage.createReview.mockResolvedValue(review);

      const res = await request
        .post("/api/reviews")
        .set("Authorization", "Bearer user-1")
        .send({
          mediaId: "media-1",
          rating: 5,
          body: "Great!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: "r1",
        mediaId: "media-1",
        rating: 5,
        body: "Great!",
      });
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request
        .post("/api/reviews")
        .send({ mediaId: "media-1", rating: 5, body: "Great!" });

      expect(res.status).toBe(401);
    });

    it("returns 400 on validation error", async () => {
      const res = await request
        .post("/api/reviews")
        .set("Authorization", "Bearer user-1")
        .send({ mediaId: "media-1" }); // missing rating and body

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/reviews/popular", () => {
    it("returns popular reviews", async () => {
      const user = createUser();
      const media = createMedia();
      const reviews = [
        {
          ...createReview(),
          user,
          media,
          likeCount: 10,
        },
      ];
      mockStorage.getPopularReviews.mockResolvedValue(reviews);

      const res = await request.get("/api/reviews/popular");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/reviews/recent", () => {
    it("returns recent reviews", async () => {
      const user = createUser();
      const media = createMedia();
      const reviews = [
        {
          ...createReview(),
          user,
          media,
          likeCount: 0,
        },
      ];
      mockStorage.getRecentReviews.mockResolvedValue(reviews);

      const res = await request.get("/api/reviews/recent");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/reviews/:reviewId/like", () => {
    it("likes review when authenticated", async () => {
      const res = await request
        .post("/api/reviews/r1/like")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(mockStorage.likeReview).toHaveBeenCalledWith("user-1", "r1");
    });
  });

  describe("DELETE /api/reviews/:reviewId/like", () => {
    it("unlikes review when authenticated", async () => {
      const res = await request
        .delete("/api/reviews/r1/like")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(mockStorage.unlikeReview).toHaveBeenCalledWith("user-1", "r1");
    });
  });

  describe("GET /api/users/:id/reviews", () => {
    it("returns user reviews", async () => {
      const media = createMedia();
      const reviews = [
        {
          ...createReview(),
          media,
          likeCount: 0,
        },
      ];
      mockStorage.getReviewsByUser.mockResolvedValue(reviews);

      const res = await request.get("/api/users/user-1/reviews");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
