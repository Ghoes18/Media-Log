import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { authMiddleware } from "./auth";
import { insertReviewSchema } from "@shared/schema";
import { searchSpotifyAlbums, getSpotifyAlbum } from "./spotify";
import { searchOpenLibraryBooks, getOpenLibraryBook, getTrendingBooks } from "./openlibrary";
import {
  getTrendingMovies, getTrendingTv, getTrendingAnime,
  searchTmdbMovies, searchTmdbTv, searchTmdbAnime,
} from "./tmdb";
import { searchRawgGames, getTrendingGames } from "./rawg";

type RequestWithAuth = Request & { authUserId?: string; authPayload?: { name?: string; email?: string } };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const uid = (req as RequestWithAuth).authUserId;
  if (!uid) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use("/api", authMiddleware(false));

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {
      name: authReq.authPayload?.name,
      email: authReq.authPayload?.email,
    });
    const stats = await storage.getProfileStats(appUser.id);
    res.json({ ...appUser, ...stats });
  });

  app.get("/api/trending/:type", async (req, res) => {
    const type = req.params.type;
    const limit = parseInt(req.query.limit as string) || 10;
    try {
      let results: any[] = [];
      switch (type) {
        case "movie":
          results = await getTrendingMovies(limit);
          break;
        case "tv":
          results = await getTrendingTv(limit);
          break;
        case "anime":
          results = await getTrendingAnime(limit);
          break;
        case "book":
          results = await getTrendingBooks(limit);
          break;
        case "music":
          results = await searchSpotifyAlbums("top hits 2024", limit);
          break;
        case "game":
          results = await getTrendingGames(limit);
          break;
        case "all": {
          const [movies, tv, anime, books, music, games] = await Promise.all([
            getTrendingMovies(4),
            getTrendingTv(4),
            getTrendingAnime(4),
            getTrendingBooks(4),
            searchSpotifyAlbums("top hits 2024", 4).catch(() => []),
            getTrendingGames(4).catch(() => []),
          ]);
          results = [...movies, ...tv, ...anime, ...books, ...music, ...games];
          break;
        }
        default:
          return res.status(400).json({ message: "Invalid type. Use movie, tv, anime, book, music, game, or all" });
      }
      res.json(results);
    } catch (err: any) {
      console.error(`Trending ${type} error:`, err.message);
      res.status(500).json({ message: "Failed to fetch trending content" });
    }
  });

  app.get("/api/search/all", async (req, res) => {
    const q = req.query.q as string;
    const type = req.query.type as string || "all";
    const limit = parseInt(req.query.limit as string) || 8;
    if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });

    try {
      if (type !== "all") {
        let results: any[] = [];
        switch (type) {
          case "movie":
            results = await searchTmdbMovies(q, limit);
            break;
          case "tv":
            results = await searchTmdbTv(q, limit);
            break;
          case "anime":
            results = await searchTmdbAnime(q, limit);
            break;
          case "book":
            results = await searchOpenLibraryBooks(q, limit);
            break;
          case "music":
            results = await searchSpotifyAlbums(q, limit);
            break;
          case "game":
            results = await searchRawgGames(q, limit);
            break;
        }
        return res.json(results);
      }

      const [movies, tv, anime, books, music, games] = await Promise.all([
        searchTmdbMovies(q, 4).catch(() => []),
        searchTmdbTv(q, 4).catch(() => []),
        searchTmdbAnime(q, 4).catch(() => []),
        searchOpenLibraryBooks(q, 4).catch(() => []),
        searchSpotifyAlbums(q, 4).catch(() => []),
        searchRawgGames(q, 4).catch(() => []),
      ]);
      res.json([...movies, ...tv, ...anime, ...books, ...music, ...games]);
    } catch (err: any) {
      console.error("Unified search error:", err.message);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/users/top-reviewers", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await storage.getTopReviewers(limit);
    res.json(result);
  });

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

  app.get("/api/reviews/popular", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await storage.getPopularReviews(limit);
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

  app.post("/api/reviews", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const parsed = insertReviewSchema.safeParse({
      ...req.body,
      userId: authReq.authUserId,
    });
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

  app.post("/api/users/:userId/watchlist/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.userId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.addToWatchlist(String(req.params.userId), String(req.params.mediaId));
    res.json({ ok: true });
  });

  app.delete("/api/users/:userId/watchlist/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.userId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.removeFromWatchlist(String(req.params.userId), String(req.params.mediaId));
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

  app.put("/api/users/:id/favorites", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.id !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { mediaIds } = req.body;
    if (!Array.isArray(mediaIds)) {
      return res.status(400).json({ message: "mediaIds must be an array" });
    }
    await storage.setFavorites(String(req.params.id), mediaIds);
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
    requireAuth,
    async (req, res) => {
      const authReq = req as RequestWithAuth;
      if (req.params.followerId !== authReq.authUserId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.follow(String(req.params.followerId), String(req.params.followingId));
      res.json({ ok: true });
    },
  );

  app.delete(
    "/api/users/:followerId/follow/:followingId",
    requireAuth,
    async (req, res) => {
      const authReq = req as RequestWithAuth;
      if (req.params.followerId !== authReq.authUserId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.unfollow(String(req.params.followerId), String(req.params.followingId));
      res.json({ ok: true });
    },
  );

  app.post("/api/reviews/:reviewId/like", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    await storage.likeReview(authReq.authUserId!, String(req.params.reviewId));
    res.json({ ok: true });
  });

  app.delete("/api/reviews/:reviewId/like", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    await storage.unlikeReview(authReq.authUserId!, String(req.params.reviewId));
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

  app.get("/api/search/music", async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });
    try {
      const results = await searchSpotifyAlbums(q, 10);
      res.json(results);
    } catch (err: any) {
      console.error("Spotify search error:", err.message);
      res.status(500).json({ message: "Failed to search music" });
    }
  });

  app.get("/api/search/music/:albumId", async (req, res) => {
    try {
      const album = await getSpotifyAlbum(req.params.albumId);
      res.json(album);
    } catch (err: any) {
      console.error("Spotify album error:", err.message);
      res.status(500).json({ message: "Failed to get album details" });
    }
  });

  app.get("/api/search/books", async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });
    try {
      const results = await searchOpenLibraryBooks(q, 10);
      res.json(results);
    } catch (err: any) {
      console.error("Open Library search error:", err.message);
      res.status(500).json({ message: "Failed to search books" });
    }
  });

  app.get("/api/search/books/work/:workId", async (req, res) => {
    try {
      const workKey = `/works/${req.params.workId}`;
      const book = await getOpenLibraryBook(workKey);
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.json(book);
    } catch (err: any) {
      console.error("Open Library book error:", err.message);
      res.status(500).json({ message: "Failed to get book details" });
    }
  });

  return httpServer;
}
