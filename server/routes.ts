import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { authMiddleware } from "./auth";
import { pushToUser } from "./ws";
import { insertReviewSchema } from "@shared/schema";
import { searchSpotifyAlbums, getSpotifyAlbum, getSpotifyAlbumDetails, getSpotifyArtistAlbums } from "./spotify";
import { searchOpenLibraryBooks, getOpenLibraryBook, getTrendingBooks, getOpenLibraryDetails, getOpenLibraryAuthorWorks } from "./openlibrary";
import {
  getTrendingMovies, getTrendingTv, getTrendingAnime,
  searchTmdbMovies, searchTmdbTv, searchTmdbAnime,
  getTmdbDetails, getTmdbDetailsByImdbId, getTmdbPersonCredits,
} from "./tmdb";
import { searchRawgGames, getTrendingGames, getRawgGameDetails, getRawgGamesByDeveloper } from "./rawg";
import { getImdbRatingByImdbId, getImdbTop250List, pickRandomFromImdbTop250 } from "./imdb";

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
    const [stats, profileSettings, subscription, badges] = await Promise.all([
      storage.getProfileStats(appUser.id),
      storage.getProfileSettings(appUser.id),
      storage.getUserSubscription(appUser.id),
      storage.getUserBadges(appUser.id),
    ]);
    res.json({
      ...appUser,
      ...stats,
      profileSettings: profileSettings ?? null,
      subscription: { status: subscription.status },
      badges,
    });
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

  app.get("/api/discover/by-person", async (req, res) => {
    const personId = req.query.personId as string;
    const personName = (req.query.person as string) || (req.query.personName as string) || "";
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 24;
    if (!personId || !type) {
      return res.status(400).json({ message: "personId and type are required" });
    }
    const validTypes = ["movie", "tv", "anime", "book", "music", "game"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "type must be movie, tv, anime, book, music, or game" });
    }
    try {
      let results: any[] = [];
      switch (type) {
        case "movie":
        case "tv":
        case "anime":
          results = await getTmdbPersonCredits(personId, type, limit);
          break;
        case "music":
          results = await getSpotifyArtistAlbums(personId, limit);
          if (results.length === 0 && personName) {
            results = await searchSpotifyAlbums(personName, limit);
          }
          break;
        case "book":
          results = await getOpenLibraryAuthorWorks(personId, limit);
          if (results.length === 0 && personName) {
            results = await searchOpenLibraryBooks(personName, limit);
          }
          break;
        case "game":
          results = await getRawgGamesByDeveloper(personId, limit);
          break;
      }
      res.json(results);
    } catch (err: any) {
      console.error("Discover by person error:", err.message);
      res.status(500).json({ message: "Failed to fetch media by person" });
    }
  });

  const VALID_CATEGORIES = ["movie", "tv", "anime", "book", "music", "game"] as const;

  app.get("/api/picker/random", async (req, res) => {
    const mode = (req.query.mode as string) || "categories";
    const categoriesParam = (req.query.categories as string) || "";

    if (mode === "imdbTop250") {
      if (categoriesParam.trim()) {
        return res.status(400).json({
          message: "When mode is imdbTop250, do not pass categories",
        });
      }
      try {
        const items = await getImdbTop250List();
        const picked = pickRandomFromImdbTop250(items);
        if (!picked) {
          return res.status(503).json({ message: "IMDb Top 250 list unavailable" });
        }
        return res.json(picked);
      } catch (err: any) {
        console.error("Picker IMDb Top 250 error:", err.message);
        return res.status(500).json({ message: "Failed to pick from IMDb Top 250" });
      }
    }

    if (mode !== "categories") {
      return res.status(400).json({ message: "mode must be 'categories' or 'imdbTop250'" });
    }

    const categories = categoriesParam
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter((c) => VALID_CATEGORIES.includes(c as (typeof VALID_CATEGORIES)[number]));

    if (categories.length === 0) {
      return res.status(400).json({
        message: "At least one category required. Use: movie, tv, anime, book, music, game",
      });
    }

    try {
      const fetchers: (() => Promise<any[]>)[] = [];
      if (categories.includes("movie")) fetchers.push(() => getTrendingMovies(50));
      if (categories.includes("tv")) fetchers.push(() => getTrendingTv(50));
      if (categories.includes("anime")) fetchers.push(() => getTrendingAnime(50));
      if (categories.includes("book")) fetchers.push(() => getTrendingBooks(50));
      if (categories.includes("music")) fetchers.push(() => searchSpotifyAlbums("top hits 2024", 50));
      if (categories.includes("game")) fetchers.push(() => getTrendingGames(50));

      const results = await Promise.all(fetchers.map((fn) => fn().catch(() => [])));
      const pooled = results.flat().filter((m) => m && (m.title || m.name));

      if (pooled.length === 0) {
        return res.status(503).json({ message: "No media available for selected categories" });
      }

      const idx = Math.floor(Math.random() * pooled.length);
      const picked = pooled[idx];
      res.json(picked);
    } catch (err: any) {
      console.error("Picker random error:", err.message);
      res.status(500).json({ message: "Failed to pick random media" });
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
    const [stats, profileSettings, subscription, badges] = await Promise.all([
      storage.getProfileStats(req.params.id),
      storage.getProfileSettings(req.params.id),
      storage.getUserSubscription(req.params.id),
      storage.getUserBadges(req.params.id),
    ]);
    res.json({
      ...user,
      ...stats,
      profileSettings: profileSettings ?? null,
      subscription: { status: subscription.status },
      badges,
    });
  });

  app.get("/api/users/username/:username", async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "User not found" });
    const [stats, profileSettings, subscription, badges] = await Promise.all([
      storage.getProfileStats(user.id),
      storage.getProfileSettings(user.id),
      storage.getUserSubscription(user.id),
      storage.getUserBadges(user.id),
    ]);
    res.json({
      ...user,
      ...stats,
      profileSettings: profileSettings ?? null,
      subscription: { status: subscription.status },
      badges,
    });
  });

  app.get("/api/users/:id/profile-settings", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const settings = await storage.getProfileSettings(req.params.id);
    res.json(settings ?? null);
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const targetId = req.params.id;
    if (targetId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const body = req.body as { displayName?: string; bio?: string; avatarUrl?: string };
    const updates: { displayName?: string; bio?: string; avatarUrl?: string } = {};
    if (typeof body.displayName === "string") updates.displayName = body.displayName.slice(0, 100);
    if (typeof body.bio === "string") updates.bio = body.bio.slice(0, 500);
    if (typeof body.avatarUrl === "string") updates.avatarUrl = body.avatarUrl.slice(0, 1_000_000);
    if (Object.keys(updates).length === 0) {
      const user = await storage.getUser(targetId);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json(user);
    }
    const user = await storage.updateUser(targetId, updates);
    res.json(user);
  });

  app.patch("/api/users/:id/profile-settings", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const targetId = req.params.id;
    if (targetId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const sub = await storage.getUserSubscription(targetId);
    const body = req.body as Record<string, unknown>;
    const proFields = ["bannerUrl", "bannerPosition", "themeAccent", "themeCustomColor", "layoutOrder", "avatarFrameId"];
    const data: Record<string, unknown> = { ...body };
    if (sub.status !== "pro") {
      for (const f of proFields) {
        delete data[f];
      }
    }
    const settings = await storage.updateProfileSettings(targetId, data as any);
    res.json(settings);
  });

  app.get("/api/users/:id/badges", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const userBadges = await storage.getUserBadges(req.params.id);
    res.json(userBadges);
  });

  app.get("/api/badges", async (_req, res) => {
    const list = await storage.getBadges();
    res.json(list);
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

  app.post("/api/media/ensure", async (req, res) => {
    const body = req.body as {
      type: string;
      title: string;
      creator?: string;
      year?: string;
      coverUrl?: string;
      coverGradient?: string;
      synopsis?: string;
      tags?: string[];
      rating?: string;
      externalId?: string;
    };
    if (!body.type || !body.title) {
      return res.status(400).json({ message: "type and title are required" });
    }
    const mediaType = body.type as "movie" | "tv" | "anime" | "book" | "music" | "game";
    const m = await storage.ensureMedia({
      type: mediaType,
      title: body.title,
      creator: body.creator ?? "",
      year: body.year ?? "",
      coverGradient: body.coverGradient ?? "from-slate-700 to-slate-900",
      coverUrl: body.coverUrl ?? "",
      synopsis: body.synopsis ?? "",
      tags: body.tags ?? [],
      rating: body.rating ?? "",
      externalId: body.externalId ?? "",
    });
    res.json(m);
  });

  app.get("/api/details/:type/:externalId", async (req, res) => {
    const type = req.params.type;
    const externalId = decodeURIComponent(req.params.externalId);
    try {
      let details: any = null;
      if (type === "movie" && /^tt\d+$/.test(externalId)) {
        details = await getTmdbDetailsByImdbId(externalId);
      } else {
        switch (type) {
          case "movie":
          case "tv":
            details = await getTmdbDetails(externalId, type);
            break;
          case "anime":
            details = await getTmdbDetails(externalId, "tv");
            break;
          case "music":
            details = await getSpotifyAlbumDetails(externalId);
            break;
          case "book":
            details = await getOpenLibraryDetails(externalId);
            break;
          case "game":
            details = await getRawgGameDetails(externalId);
            break;
          default:
            return res.status(400).json({ message: "Invalid type. Use movie, tv, anime, book, music, or game" });
        }
      }
      if (!details) return res.status(404).json({ message: "Details not found" });
      if (details.imdbId && (type === "movie" || type === "tv" || type === "anime")) {
        const imdbRating = await getImdbRatingByImdbId(details.imdbId);
        if (imdbRating) (details as any).imdbRating = imdbRating;
      }
      res.json(details);
    } catch (err: any) {
      console.error("Details fetch error:", err.message);
      res.status(500).json({ message: "Failed to fetch details" });
    }
  });

  app.get("/api/tmdb/:type/:tmdbId/details", async (req, res) => {
    const { type, tmdbId } = req.params;
    if (type !== "movie" && type !== "tv") {
      return res.status(400).json({ message: "type must be movie or tv" });
    }
    try {
      const details = await getTmdbDetails(tmdbId, type);
      if (!details) return res.status(404).json({ message: "TMDB details not found" });
      res.json(details);
    } catch (err: any) {
      console.error("TMDB details error:", err.message);
      res.status(500).json({ message: "Failed to fetch TMDB details" });
    }
  });

  app.get("/api/media/:id/stats", async (req, res) => {
    const stats = await storage.getMediaStats(req.params.id);
    res.json(stats);
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

  app.post("/api/users/:userId/watched/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.userId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.addWatched(String(req.params.userId), String(req.params.mediaId));
    res.json({ ok: true });
  });

  app.delete("/api/users/:userId/watched/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.userId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.removeWatched(String(req.params.userId), String(req.params.mediaId));
    res.json({ ok: true });
  });

  app.get(
    "/api/users/:userId/watched/check/:mediaId",
    async (req, res) => {
      const result = await storage.isWatched(
        req.params.userId,
        req.params.mediaId,
      );
      res.json({ watched: result });
    },
  );

  app.post("/api/users/:userId/like-media/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.userId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.likeMedia(String(req.params.userId), String(req.params.mediaId));
    res.json({ ok: true });
  });

  app.delete("/api/users/:userId/like-media/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    if (req.params.userId !== authReq.authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.unlikeMedia(String(req.params.userId), String(req.params.mediaId));
    res.json({ ok: true });
  });

  app.get(
    "/api/users/:userId/like-media/check/:mediaId",
    async (req, res) => {
      const result = await storage.hasLikedMedia(
        req.params.userId,
        req.params.mediaId,
      );
      res.json({ liked: result });
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

  // ── Direct Messaging ───────────────────────────────────────────────────────

  // GET /api/conversations?status=active|request
  app.get("/api/conversations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const status = req.query.status as string | undefined;
    const convs = await storage.getConversationsForUser(appUser.id, status);
    res.json(convs);
  });

  // GET /api/conversations/unread-count
  app.get("/api/conversations/unread-count", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const count = await storage.getUnreadCount(appUser.id);
    res.json({ count });
  });

  // POST /api/conversations  { recipientId }
  app.post("/api/conversations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { recipientId } = req.body as { recipientId?: string };
    if (!recipientId) return res.status(400).json({ message: "recipientId required" });
    if (recipientId === appUser.id) return res.status(400).json({ message: "Cannot message yourself" });
    const conv = await storage.getOrCreateConversation(appUser.id, recipientId);
    res.status(201).json(conv);
  });

  // GET /api/conversations/:id/messages?before=<timestamp>&limit=50
  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const conv = await storage.getConversationById(req.params.id as string);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (conv.participant1Id !== appUser.id && conv.participant2Id !== appUser.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const before = req.query.before ? new Date(req.query.before as string) : undefined;
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string) : 50;
    const msgs = await storage.getMessages(conv.id, before, limit);
    res.json(msgs);
  });

  // POST /api/conversations/:id/messages  { body }
  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const conv = await storage.getConversationById(req.params.id as string);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (conv.participant1Id !== appUser.id && conv.participant2Id !== appUser.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (conv.status === "declined") {
      return res.status(403).json({ message: "This conversation was declined" });
    }
    const { body } = req.body as { body?: string };
    if (!body?.trim()) return res.status(400).json({ message: "Message body required" });

    try {
      const msg = await storage.createMessage(conv.id, appUser.id, body.trim());
      const recipientId = conv.participant1Id === appUser.id ? conv.participant2Id : conv.participant1Id;

      const requestCount = conv.status === "request"
        ? await storage.getRequestMessageCount(conv.id, appUser.id)
        : null;

      pushToUser(recipientId, {
        type: "new_message",
        payload: {
          message: msg,
          conversationId: conv.id,
          senderId: appUser.id,
        },
      });

      res.status(201).json({ message: msg, requestCount });
    } catch (err: any) {
      if (err.message === "MESSAGE_LIMIT_REACHED") {
        return res.status(403).json({ message: "You have reached the 3-message limit for pending requests" });
      }
      throw err;
    }
  });

  // PATCH /api/conversations/:id/accept
  app.patch("/api/conversations/:id/accept", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      const conv = await storage.acceptConversation(req.params.id as string, appUser.id);
      const requesterId = conv.requestedById;
      if (requesterId) {
        pushToUser(requesterId, {
          type: "conversation_updated",
          payload: { conversationId: conv.id, status: "active" },
        });
      }
      res.json(conv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // PATCH /api/conversations/:id/decline
  app.patch("/api/conversations/:id/decline", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      const conv = await storage.declineConversation(req.params.id as string, appUser.id);
      res.json(conv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // PATCH /api/conversations/:id/read
  app.patch("/api/conversations/:id/read", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const conv = await storage.getConversationById(req.params.id as string);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (conv.participant1Id !== appUser.id && conv.participant2Id !== appUser.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const readAt = new Date();
    await storage.markMessagesAsRead(conv.id, appUser.id);

    const otherUserId = conv.participant1Id === appUser.id ? conv.participant2Id : conv.participant1Id;
    pushToUser(otherUserId, {
      type: "messages_read",
      payload: { conversationId: conv.id, readAt: readAt.toISOString() },
    });

    res.json({ ok: true });
  });

  return httpServer;
}
