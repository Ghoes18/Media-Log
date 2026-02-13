import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertReviewSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const stats = await storage.getProfileStats(req.params.id);
    res.json({ ...user, ...stats });
  });

  app.get("/api/users/username/:username", async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "User not found" });
    const stats = await storage.getProfileStats(user.id);
    res.json({ ...user, ...stats });
  });

  app.get("/api/media", async (req, res) => {
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    if (search) {
      const results = await storage.searchMedia(search);
      return res.json(results);
    }
    if (type) {
      const results = await storage.getMediaByType(type);
      return res.json(results);
    }
    const all = await storage.getAllMedia();
    res.json(all);
  });

  app.get("/api/media/:id", async (req, res) => {
    const m = await storage.getMediaById(req.params.id);
    if (!m) return res.status(404).json({ message: "Media not found" });
    res.json(m);
  });

  app.get("/api/media/:id/reviews", async (req, res) => {
    const result = await storage.getReviewsForMedia(req.params.id);
    res.json(result);
  });

  app.get("/api/reviews/recent", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await storage.getRecentReviews(limit);
    res.json(result);
  });

  app.get("/api/users/:id/reviews", async (req, res) => {
    const result = await storage.getReviewsByUser(req.params.id);
    res.json(result);
  });

  app.post("/api/reviews", async (req, res) => {
    const parsed = insertReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const review = await storage.createReview(parsed.data);
    res.status(201).json(review);
  });

  app.get("/api/users/:id/watchlist", async (req, res) => {
    const result = await storage.getWatchlist(req.params.id);
    res.json(result);
  });

  app.post("/api/users/:userId/watchlist/:mediaId", async (req, res) => {
    await storage.addToWatchlist(req.params.userId, req.params.mediaId);
    res.json({ ok: true });
  });

  app.delete("/api/users/:userId/watchlist/:mediaId", async (req, res) => {
    await storage.removeFromWatchlist(req.params.userId, req.params.mediaId);
    res.json({ ok: true });
  });

  app.get(
    "/api/users/:userId/watchlist/check/:mediaId",
    async (req, res) => {
      const result = await storage.isOnWatchlist(
        req.params.userId,
        req.params.mediaId,
      );
      res.json({ onWatchlist: result });
    },
  );

  app.get("/api/users/:id/favorites", async (req, res) => {
    const result = await storage.getFavorites(req.params.id);
    res.json(result);
  });

  app.put("/api/users/:id/favorites", async (req, res) => {
    const { mediaIds } = req.body;
    if (!Array.isArray(mediaIds)) {
      return res.status(400).json({ message: "mediaIds must be an array" });
    }
    await storage.setFavorites(req.params.id, mediaIds);
    res.json({ ok: true });
  });

  app.get(
    "/api/users/:followerId/following/:followingId",
    async (req, res) => {
      const result = await storage.isFollowing(
        req.params.followerId,
        req.params.followingId,
      );
      res.json({ following: result });
    },
  );

  app.post(
    "/api/users/:followerId/follow/:followingId",
    async (req, res) => {
      await storage.follow(req.params.followerId, req.params.followingId);
      res.json({ ok: true });
    },
  );

  app.delete(
    "/api/users/:followerId/follow/:followingId",
    async (req, res) => {
      await storage.unfollow(req.params.followerId, req.params.followingId);
      res.json({ ok: true });
    },
  );

  app.post("/api/reviews/:reviewId/like", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });
    await storage.likeReview(userId, req.params.reviewId);
    res.json({ ok: true });
  });

  app.delete("/api/reviews/:reviewId/like", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });
    await storage.unlikeReview(userId, req.params.reviewId);
    res.json({ ok: true });
  });

  app.get(
    "/api/reviews/:reviewId/liked/:userId",
    async (req, res) => {
      const result = await storage.hasLikedReview(
        req.params.userId,
        req.params.reviewId,
      );
      res.json({ liked: result });
    },
  );

  return httpServer;
}
