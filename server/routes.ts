import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Server } from "node:http";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import multer from "multer";
import { storage } from "./storage";
import { authMiddleware } from "./auth";
import { pushToUser } from "./ws";
import { insertReviewSchema, MEDIA_TYPES } from "@shared/schema";
import { z } from "zod";
import { searchSpotifyAlbums, getSpotifyAlbum, getSpotifyAlbumDetails, getSpotifyArtistAlbums } from "./spotify";
import { searchOpenLibraryBooks, getOpenLibraryBook, getTrendingBooks, getOpenLibraryDetails, getOpenLibraryAuthorWorks } from "./openlibrary";
import {
  getTrendingMovies, getTrendingTv, getTrendingAnime,
  getDiscoverMovies, getDiscoverTv, getDiscoverAnime,
  searchTmdbMovies, searchTmdbTv, searchTmdbAnime,
  getTmdbDetails, getTmdbDetailsByImdbId, getTmdbPersonCredits, getTmdbSeasonDetails,
} from "./tmdb";
import { searchRawgGames, getTrendingGames, getDiscoverGames, getRawgGameDetails, getRawgGamesByDeveloper } from "./rawg";
import { getImdbRatingByImdbId, getImdbTop250List, pickRandomFromImdbTop250 } from "./imdb";
import {
  PRESET_LISTS,
  getPresetListById,
  getPresetListItems,
} from "./preset-lists";

type RequestWithAuth = Request & { authUserId?: string; authPayload?: { name?: string; email?: string } };

function searchRelevanceScore(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  const t = (title || "").toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (q.startsWith(t)) return 70;
  if (t.includes(q)) return 60;
  if (q.includes(t)) return 50;
  return 0;
}

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

      const [movies, tv, games, anime, music, books] = await Promise.all([
        searchTmdbMovies(q, 4).catch(() => []),
        searchTmdbTv(q, 4).catch(() => []),
        searchRawgGames(q, 4).catch(() => []),
        searchTmdbAnime(q, 4).catch(() => []),
        searchSpotifyAlbums(q, 4).catch(() => []),
        searchOpenLibraryBooks(q, 4).catch(() => []),
      ]);
      const allResults = [...movies, ...tv, ...games, ...anime, ...music, ...books];
      allResults.sort((a, b) => searchRelevanceScore(q, b.title) - searchRelevanceScore(q, a.title));
      res.json(allResults);
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
    if (!(MEDIA_TYPES as readonly string[]).includes(type)) {
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

  const DISCOVER_CATEGORY_TYPES = MEDIA_TYPES;

  app.get("/api/discover/category/:type", async (req, res) => {
    const type = (req.params.type as string)?.toLowerCase();
    const q = (req.query.q as string)?.trim() ?? "";
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const limit = Math.min(40, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    if (!DISCOVER_CATEGORY_TYPES.includes(type as (typeof DISCOVER_CATEGORY_TYPES)[number])) {
      return res.status(400).json({ message: "Invalid type. Use movie, tv, anime, book, music, or game." });
    }

    // TMDB always returns exactly 20 per page regardless of what we ask.
    // Use the provider's natural page size to determine hasMore accurately.
    const PROVIDER_PAGE_SIZES: Record<string, number> = {
      movie: 20, tv: 20, anime: 20, book: limit, music: limit, game: limit,
    };
    const providerPageSize = PROVIDER_PAGE_SIZES[type] ?? limit;

    try {
      let items: any[] = [];
      if (q) {
        switch (type) {
          case "movie":
            items = await searchTmdbMovies(q, limit, page);
            break;
          case "tv":
            items = await searchTmdbTv(q, limit, page);
            break;
          case "anime":
            items = await searchTmdbAnime(q, limit, page);
            break;
          case "book":
            items = await searchOpenLibraryBooks(q, limit, page * limit);
            break;
          case "music":
            items = await searchSpotifyAlbums(q, limit, page * limit);
            break;
          case "game":
            items = await searchRawgGames(q, limit, page);
            break;
        }
      } else {
        switch (type) {
          case "movie":
            items = await getDiscoverMovies(limit, page);
            break;
          case "tv":
            items = await getDiscoverTv(limit, page);
            break;
          case "anime":
            items = await getDiscoverAnime(limit, page);
            break;
          case "book":
            items = await getTrendingBooks(limit, page);
            break;
          case "music":
            items = await searchSpotifyAlbums("top hits 2024", limit, page * limit);
            break;
          case "game":
            items = await getDiscoverGames(limit, page);
            break;
        }
      }
      const hasMore = items.length >= providerPageSize;
      res.json({ items, page, hasMore });
    } catch (err: any) {
      console.error("Discover category error:", err.message);
      res.status(500).json({ message: "Failed to fetch category results" });
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

  // GET /api/users/search?q= — must be above /api/users/:id
  app.get("/api/users/search", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.json([]);
    const results = await storage.searchUsers(q, appUser.id);
    res.json(results);
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
    const proFields = ["bannerUrl", "bannerPosition", "themeAccent", "themeCustomColor", "layoutOrder", "avatarFrameId", "profileCustomHtml", "profileCustomCss"];
    const data: Record<string, unknown> = { ...body };
    if (sub.status !== "pro") {
      for (const f of proFields) {
        delete data[f];
      }
    }
    const MAX_HTML_BYTES = 50 * 1024;
    const MAX_CSS_BYTES = 20 * 1024;
    if (typeof data.profileCustomHtml === "string" && Buffer.byteLength(data.profileCustomHtml, "utf8") > MAX_HTML_BYTES) {
      return res.status(400).json({ message: "Profile HTML exceeds 50 KB limit." });
    }
    if (typeof data.profileCustomCss === "string" && Buffer.byteLength(data.profileCustomCss, "utf8") > MAX_CSS_BYTES) {
      return res.status(400).json({ message: "Profile CSS exceeds 20 KB limit." });
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

  app.get("/api/tmdb/tv/:tmdbId/season/:seasonNumber", async (req, res) => {
    const seasonNumber = Number.parseInt(req.params.seasonNumber, 10);
    if (!Number.isInteger(seasonNumber) || seasonNumber < 0) {
      return res.status(400).json({ message: "seasonNumber must be a non-negative integer" });
    }
    try {
      const details = await getTmdbSeasonDetails(req.params.tmdbId, seasonNumber);
      if (!details) return res.status(404).json({ message: "Season not found" });
      res.json(details);
    } catch (err: any) {
      console.error("TMDB season details error:", err.message);
      res.status(500).json({ message: "Failed to fetch TMDB season details" });
    }
  });

  app.get("/api/tmdb/tv/:tmdbId/all-seasons", async (req, res) => {
    try {
      const details = await getTmdbDetails(req.params.tmdbId, "tv");
      if (!details) return res.status(404).json({ message: "Show not found" });
      const seasons = (details.seasons ?? []).filter((s: any) => s.seasonNumber > 0);
      const allSeasons = await Promise.all(
        seasons.map((s: any) => getTmdbSeasonDetails(req.params.tmdbId, s.seasonNumber))
      );
      res.json(allSeasons.filter(Boolean));
    } catch (err: any) {
      console.error("TMDB all-seasons error:", err.message);
      res.status(500).json({ message: "Failed to fetch all seasons" });
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
    const season = req.query.season as string | undefined;
    const episode = req.query.episode as string | undefined;
    const seasonNumber = season != null ? Number.parseInt(season, 10) : undefined;
    const episodeNumber = episode != null ? Number.parseInt(episode, 10) : undefined;

    if (season != null && !Number.isInteger(seasonNumber)) {
      return res.status(400).json({ message: "season must be an integer" });
    }
    if (episode != null && !Number.isInteger(episodeNumber)) {
      return res.status(400).json({ message: "episode must be an integer" });
    }
    if (episodeNumber != null && seasonNumber == null) {
      return res.status(400).json({ message: "season is required when episode is provided" });
    }

    const result = await storage.getReviewsForMedia(req.params.id, {
      seasonNumber,
      episodeNumber,
    });
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
    const reviewSchema = insertReviewSchema.extend({
      seasonNumber: z.number().int().positive().optional().nullable(),
      episodeNumber: z.number().int().positive().optional().nullable(),
    });
    const parsed = reviewSchema.safeParse({
      ...req.body,
      userId: authReq.authUserId,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const seasonNumber = parsed.data.seasonNumber ?? undefined;
    const episodeNumber = parsed.data.episodeNumber ?? undefined;
    if (episodeNumber != null && seasonNumber == null) {
      return res.status(400).json({ message: "seasonNumber is required when episodeNumber is provided" });
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

  // ── Collaborative Lists ─────────────────────────────────────────────────────

  // GET /api/lists/public (must be before /api/lists/:id)
  app.get("/api/lists/public", async (req, res) => {
    const sort = (req.query.sort as string) || "recent";
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 24;
    const validSort = sort === "popular" ? "popular" : "recent";
    const lists = await storage.getPublicLists({ sort: validSort, page, limit });
    res.json(lists);
  });

  // GET /api/lists
  app.get("/api/lists", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const userLists = await storage.getUserLists(appUser.id);
    res.json(userLists);
  });

  // POST /api/lists
  app.post("/api/lists", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { name, description, visibility, isRanked, tags } = req.body as {
      name?: string; description?: string; visibility?: string; isRanked?: boolean; tags?: string[];
    };
    if (!name?.trim()) return res.status(400).json({ message: "name is required" });
    const list = await storage.createList(appUser.id, {
      name: name.trim().slice(0, 100),
      description: description?.trim().slice(0, 500) ?? "",
      visibility: visibility === "public" ? "public" : "private",
      isRanked: !!isRanked,
      tags: Array.isArray(tags) ? tags.slice(0, 10).filter((t): t is string => typeof t === "string").slice(0, 100) : undefined,
    });
    res.status(201).json(list);
  });

  // GET /api/lists/:id (optional auth for viewing public lists)
  app.get("/api/lists/:id", async (req, res) => {
    const authReq = req as RequestWithAuth;
    const authUserId = authReq.authUserId;
    let appUser: { id: string } | null = null;
    if (authUserId) {
      appUser = await storage.getOrCreateAppUser(authUserId, {});
    }

    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });

    const isOwner = appUser ? list.ownerId === appUser.id : false;
    if (!isOwner) {
      if (list.visibility !== "public") {
        if (!appUser) return res.status(401).json({ message: "Sign in to view this list" });
        const collabs = await storage.getListCollaborators(list.id);
        const isCollab = collabs.some((c) => c.userId === appUser!.id);
        if (!isCollab) return res.status(403).json({ message: "Forbidden" });
      }
    }

    const [ownerUser, items, collaborators, invitations, likeCount, commentCount, isLiked] = await Promise.all([
      storage.getUser(list.ownerId),
      storage.getListItems(list.id),
      storage.getListCollaborators(list.id),
      isOwner ? storage.getListInvitations(list.id) : Promise.resolve([]),
      storage.getListLikeCount(list.id),
      storage.getListCommentCount(list.id),
      appUser ? storage.hasLikedList(appUser.id, list.id) : Promise.resolve(false),
    ]);

    const owner = ownerUser
      ? { id: ownerUser.id, username: ownerUser.username, displayName: ownerUser.displayName, avatarUrl: ownerUser.avatarUrl ?? "" }
      : null;

    res.json({ ...list, owner, items, collaborators, invitations, isOwner, likeCount, commentCount, isLiked });
  });

  // PATCH /api/lists/:id
  app.patch("/api/lists/:id", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });

    const { name, description, visibility, isRanked, tags } = req.body as Partial<{
      name: string; description: string; visibility: string; isRanked: boolean; tags: string[];
    }>;
    const data: Partial<{ name: string; description: string; visibility: string; isRanked: boolean; tags: string[] }> = {};
    if (typeof name === "string") data.name = name.trim().slice(0, 100);
    if (typeof description === "string") data.description = description.trim().slice(0, 500);
    if (visibility === "public" || visibility === "private") data.visibility = visibility;
    if (typeof isRanked === "boolean") data.isRanked = isRanked;
    if (Array.isArray(tags)) data.tags = tags.slice(0, 10).filter((t): t is string => typeof t === "string").slice(0, 100);

    const updated = await storage.updateList(list.id, data);
    res.json(updated);
  });

  // DELETE /api/lists/:id
  app.delete("/api/lists/:id", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteList(list.id);
    res.json({ ok: true });
  });

  // POST /api/lists/:id/items
  app.post("/api/lists/:id/items", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });

    const isOwner = list.ownerId === appUser.id;
    if (!isOwner) {
      const collabs = await storage.getListCollaborators(list.id);
      if (!collabs.some((c) => c.userId === appUser.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const { mediaId, note } = req.body as { mediaId?: string; note?: string };
    if (!mediaId) return res.status(400).json({ message: "mediaId is required" });

    const item = await storage.addListItem(list.id, mediaId, appUser.id, note?.trim() || undefined);
    res.status(201).json(item);
  });

  // PATCH /api/lists/:id/items/:mediaId
  app.patch("/api/lists/:id/items/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });

    const isOwner = list.ownerId === appUser.id;
    if (!isOwner) {
      const collabs = await storage.getListCollaborators(list.id);
      if (!collabs.some((c) => c.userId === appUser.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const { note } = req.body as { note?: string | null };
    await storage.updateListItemNote(list.id, req.params.mediaId as string, note ?? null);
    res.json({ ok: true });
  });

  // PUT /api/lists/:id/reorder
  app.put("/api/lists/:id/reorder", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });

    const isOwner = list.ownerId === appUser.id;
    if (!isOwner) {
      const collabs = await storage.getListCollaborators(list.id);
      if (!collabs.some((c) => c.userId === appUser.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const { itemIds } = req.body as { itemIds?: string[] };
    if (!Array.isArray(itemIds) || itemIds.length === 0) return res.status(400).json({ message: "itemIds array required" });
    await storage.reorderListItems(list.id, itemIds);
    res.json({ ok: true });
  });

  // POST /api/lists/:id/like
  app.post("/api/lists/:id/like", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.visibility !== "public") return res.status(403).json({ message: "Cannot like private list" });
    await storage.likeList(appUser.id, list.id);
    res.json({ ok: true });
  });

  // DELETE /api/lists/:id/like
  app.delete("/api/lists/:id/like", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.unlikeList(appUser.id, req.params.id as string);
    res.json({ ok: true });
  });

  // GET /api/lists/:id/liked/:userId
  app.get("/api/lists/:id/liked/:userId", async (req, res) => {
    const liked = await storage.hasLikedList(req.params.userId as string, req.params.id as string);
    res.json({ liked });
  });

  // GET /api/lists/:id/comments
  app.get("/api/lists/:id/comments", async (req, res) => {
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.visibility !== "public") return res.status(403).json({ message: "Forbidden" });
    const comments = await storage.getListComments(list.id);
    res.json(comments);
  });

  // POST /api/lists/:id/comments
  app.post("/api/lists/:id/comments", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.visibility !== "public") return res.status(403).json({ message: "Forbidden" });
    const { body } = req.body as { body?: string };
    if (!body?.trim()) return res.status(400).json({ message: "body required" });
    const comment = await storage.createListComment(list.id, appUser.id, body.trim().slice(0, 1000));
    res.status(201).json(comment);
  });

  // DELETE /api/lists/:id/comments/:commentId
  app.delete("/api/lists/:id/comments/:commentId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      await storage.deleteListComment(req.params.commentId as string, appUser.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.message === "Forbidden" ? 403 : 404).json({ message: err.message });
    }
  });

  // POST /api/lists/:id/fork
  app.post("/api/lists/:id/fork", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const listId = req.params.id as string;
    const { name } = req.body as { name?: string };
    try {
      const forked = await storage.forkList(appUser.id, listId, name?.trim() || undefined);
      res.status(201).json(forked);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fork list";
      const status = message === "Source list not found" ? 404 : message === "Cannot fork a private list" ? 403 : 400;
      res.status(status).json({ message });
    }
  });

  // DELETE /api/lists/:id/items/:mediaId
  app.delete("/api/lists/:id/items/:mediaId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });

    const isOwner = list.ownerId === appUser.id;
    if (!isOwner) {
      const collabs = await storage.getListCollaborators(list.id);
      if (!collabs.some((c) => c.userId === appUser.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    await storage.removeListItem(list.id, req.params.mediaId as string);
    res.json({ ok: true });
  });

  // POST /api/lists/:id/invitations
  app.post("/api/lists/:id/invitations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });

    const { invitedUserId } = req.body as { invitedUserId?: string };
    if (!invitedUserId) return res.status(400).json({ message: "invitedUserId is required" });
    if (invitedUserId === appUser.id) return res.status(400).json({ message: "Cannot invite yourself" });

    const inv = await storage.createInvitation(list.id, invitedUserId, appUser.id);

    pushToUser(invitedUserId, {
      type: "list_invitation",
      payload: {
        invitationId: inv.id,
        listId: list.id,
        listName: list.name,
        invitedByDisplayName: appUser.displayName,
      },
    });

    res.status(201).json(inv);
  });

  // GET /api/lists/:id/invitations
  app.get("/api/lists/:id/invitations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });
    const invitations = await storage.getListInvitations(list.id);
    res.json(invitations);
  });

  // DELETE /api/lists/:id/collaborators/:userId
  app.delete("/api/lists/:id/collaborators/:userId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const list = await storage.getList(req.params.id as string);
    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });
    await storage.removeListCollaborator(list.id, req.params.userId as string);
    res.json({ ok: true });
  });

  // GET /api/invitations
  app.get("/api/invitations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const invitations = await storage.getInvitationsForUser(appUser.id);
    res.json(invitations);
  });

  // GET /api/invitations/count
  app.get("/api/invitations/count", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const count = await storage.getPendingInvitationCount(appUser.id);
    res.json({ count });
  });

  // PATCH /api/invitations/:id/accept
  app.patch("/api/invitations/:id/accept", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      const inv = await storage.respondToInvitation(req.params.id as string, appUser.id, "accepted");
      res.json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // PATCH /api/invitations/:id/decline
  app.patch("/api/invitations/:id/decline", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      const inv = await storage.respondToInvitation(req.params.id as string, appUser.id, "declined");
      res.json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Image upload (for tier list custom images) ─────────────────────────────────
  const UPLOAD_DIR = path.join(process.cwd(), "uploads");
  const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : file.mimetype === "image/gif" ? "gif" : "jpg";
        cb(null, `${randomUUID()}.${ext}`);
      },
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Invalid file type. Use JPEG, PNG, WebP, or GIF."));
    },
  });

  app.use("/uploads", express.static(UPLOAD_DIR));

  app.post("/api/upload/image", requireAuth, upload.single("file"), async (req, res) => {
    const file = (req as Request & { file?: { path: string; filename: string } }).file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    const coverUrl = `/uploads/${file.filename}`;
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const media = await storage.ensureMedia({
      type: "custom",
      title: `Uploaded image ${file.filename}`,
      creator: "",
      year: "",
      coverUrl,
      coverGradient: "from-slate-700 to-slate-900",
      synopsis: "",
      tags: [],
      rating: "",
      externalId: `upload:${file.filename}`,
    });
    res.status(201).json(media);
  });

  // ── Tier Lists ───────────────────────────────────────────────────────────────

  async function requireTierListAccess(
    tierListId: string,
    appUser: { id: string },
    options: { allowPublic?: boolean } = {},
  ): Promise<{ tierList: NonNullable<Awaited<ReturnType<typeof storage.getTierList>>>; canEdit: boolean }> {
    const tierList = await storage.getTierList(tierListId);
    if (!tierList) throw new Error("Tier list not found");
    const isOwner = tierList.ownerId === appUser.id;
    if (isOwner) return { tierList, canEdit: true };
    if (options.allowPublic && tierList.visibility === "public") return { tierList, canEdit: false };
    const collabs = await storage.getTierListCollaborators(tierListId);
    const isCollab = collabs.some((c) => c.userId === appUser.id);
    if (!isCollab) throw new Error("Forbidden");
    return { tierList, canEdit: true };
  }

  app.get("/api/tier-lists/public", async (req, res) => {
    const sort = (req.query.sort as string) || "recent";
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 24;
    const validSort = sort === "popular" ? "popular" : "recent";
    const lists = await storage.getPublicTierLists({ sort: validSort, page, limit });
    res.json(lists);
  });

  app.get("/api/tier-lists", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const lists = await storage.getUserTierLists(appUser.id);
    res.json(lists);
  });

  app.post("/api/tier-lists", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { name, description, visibility, tags } = req.body as {
      name?: string; description?: string; visibility?: string; tags?: string[];
    };
    if (!name?.trim()) return res.status(400).json({ message: "name is required" });
    const list = await storage.createTierList(appUser.id, {
      name: name.trim().slice(0, 100),
      description: description?.trim().slice(0, 500) ?? "",
      visibility: visibility === "public" ? "public" : "private",
      tags: Array.isArray(tags) ? tags.slice(0, 10).filter((t): t is string => typeof t === "string") : undefined,
    });
    res.status(201).json(list);
  });

  app.post("/api/tier-lists/:id/fork", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const tierListId = req.params.id as string;
    const { name } = req.body as { name?: string };
    try {
      const forked = await storage.forkTierList(appUser.id, tierListId, name);
      res.status(201).json(forked);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fork tier list";
      const status = message === "Tier list not found" ? 404 : message === "Cannot fork a private tier list" ? 403 : 400;
      res.status(status).json({ message });
    }
  });

  app.get("/api/tier-lists/compare", async (req, res) => {
    const idA = req.query.a as string;
    const idB = req.query.b as string;
    if (!idA || !idB) return res.status(400).json({ message: "Both 'a' and 'b' tier list IDs are required" });

    const [listA, listB] = await Promise.all([
      storage.getTierList(idA),
      storage.getTierList(idB),
    ]);
    if (!listA || !listB) return res.status(404).json({ message: "One or both tier lists not found" });
    if (listA.visibility !== "public" || listB.visibility !== "public") {
      return res.status(403).json({ message: "Both tier lists must be public" });
    }

    const data = await storage.getTierListCompareData(idA, idB);
    if (!data) return res.status(404).json({ message: "Compare data not available" });
    res.json(data);
  });

  app.get("/api/tier-lists/:id/forks", async (req, res) => {
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    if (tierList.visibility !== "public") return res.status(403).json({ message: "Tier list is not public" });
    const forks = await storage.getPublicTierLists({ sort: "recent", page: 0, limit: 50 });
    const filtered = forks.filter((f) => f.sourceTierListId === tierList.id || f.sourceTierListId === tierList.sourceTierListId);
    res.json(filtered);
  });

  app.post("/api/tier-lists/from-template", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { sourceTierListId, name } = req.body as { sourceTierListId?: string; name?: string };
    if (!sourceTierListId || typeof sourceTierListId !== "string") {
      return res.status(400).json({ message: "sourceTierListId is required" });
    }
    try {
      const list = await storage.createTierListFromTemplate(appUser.id, sourceTierListId, name);
      res.status(201).json(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create from template";
      const status = message === "Tier list not found" ? 404 : message === "Template is not public" || message === "This list is not published as a template" ? 403 : 400;
      res.status(status).json({ message });
    }
  });

  app.get("/api/tier-lists/:id", async (req, res) => {
    const authReq = req as RequestWithAuth;
    const authUserId = authReq.authUserId;
    let appUser: { id: string } | null = null;
    if (authUserId) appUser = await storage.getOrCreateAppUser(authUserId, {});

    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });

    const isOwner = appUser ? tierList.ownerId === appUser.id : false;
    if (!isOwner) {
      if (tierList.visibility !== "public") {
        if (!appUser) return res.status(401).json({ message: "Sign in to view this list" });
        const collabs = await storage.getTierListCollaborators(tierList.id);
        if (!collabs.some((c) => c.userId === appUser!.id)) return res.status(403).json({ message: "Forbidden" });
      }
    }

    const detail = await storage.getTierListDetail(tierList.id, appUser?.id);
    if (!detail) return res.status(404).json({ message: "Tier list not found" });
    res.json(detail);
  });

  app.get("/api/tier-lists/:id/community-aggregate", async (req, res) => {
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    let templateId: string | null = null;
    if (tierList.isTemplate && tierList.visibility === "public") {
      templateId = tierList.id;
    } else if (tierList.sourceTierListId) {
      const source = await storage.getTierList(tierList.sourceTierListId);
      if (source && source.isTemplate && source.visibility === "public") templateId = source.id;
    }
    if (!templateId) return res.status(404).json({ message: "Not a template or fork of a public template" });
    const aggregate = await storage.getTierListCommunityAggregate(templateId);
    if (!aggregate) return res.status(404).json({ message: "Community aggregate not available" });
    res.json(aggregate);
  });

  app.patch("/api/tier-lists/:id", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { tierList } = await requireTierListAccess(req.params.id as string, appUser);
    if (tierList.ownerId !== appUser.id) return res.status(403).json({ message: "Only owner can update list metadata" });

    const { name, description, visibility, tags, isTemplate } = req.body as Partial<{
      name: string; description: string; visibility: string; tags: string[]; isTemplate: boolean;
    }>;
    const data: Record<string, unknown> = {};
    if (typeof name === "string") data.name = name.trim().slice(0, 100);
    if (typeof description === "string") data.description = description.trim().slice(0, 500);
    if (visibility === "public" || visibility === "private") data.visibility = visibility;
    if (Array.isArray(tags)) data.tags = tags.slice(0, 10).filter((t): t is string => typeof t === "string");
    if (typeof isTemplate === "boolean") {
      data.isTemplate = isTemplate;
      if (isTemplate && tierList.visibility !== "public") data.visibility = "public";
    }

    const updated = await storage.updateTierList(tierList.id, data as any);
    res.json(updated);
  });

  app.delete("/api/tier-lists/:id", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { tierList } = await requireTierListAccess(req.params.id as string, appUser);
    if (tierList.ownerId !== appUser.id) return res.status(403).json({ message: "Only owner can delete" });
    await storage.deleteTierList(tierList.id);
    res.json({ ok: true });
  });

  app.post("/api/tier-lists/:id/tiers", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    const { label, color, position } = req.body as { label?: string; color?: string; position?: number };
    if (!label?.trim()) return res.status(400).json({ message: "label is required" });
    const tier = await storage.createTier(req.params.id as string, {
      label: label.trim().slice(0, 20),
      color: color?.trim().slice(0, 20) || "#94a3b8",
      position,
    });
    res.status(201).json(tier);
  });

  app.patch("/api/tier-lists/:id/tiers/:tierId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    const { label, color, position } = req.body as { label?: string; color?: string; position?: number };
    const data: Record<string, unknown> = {};
    if (typeof label === "string") data.label = label.trim().slice(0, 20);
    if (typeof color === "string") data.color = color.trim().slice(0, 20);
    if (typeof position === "number") data.position = position;
    if (Object.keys(data).length === 0) return res.status(400).json({ message: "No updates provided" });
    const updated = await storage.updateTier(req.params.tierId as string, data as any);
    res.json(updated);
  });

  app.put("/api/tier-lists/:id/tiers/reorder", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    const { tierIds } = req.body as { tierIds?: string[] };
    if (!Array.isArray(tierIds) || tierIds.length === 0) return res.status(400).json({ message: "tierIds array required" });
    await storage.reorderTiers(req.params.id as string, tierIds);
    res.json({ ok: true });
  });

  app.delete("/api/tier-lists/:id/tiers/:tierId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    await storage.deleteTier(req.params.tierId as string);
    res.json({ ok: true });
  });

  app.post("/api/tier-lists/:id/items", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    const { mediaId, tierId, position, note } = req.body as { mediaId?: string; tierId?: string | null; position?: number; note?: string };
    if (!mediaId) return res.status(400).json({ message: "mediaId is required" });
    const item = await storage.addTierListItem(
      req.params.id as string,
      mediaId,
      appUser.id,
      tierId ?? null,
      position,
      note?.trim(),
    );
    res.status(201).json(item);
  });

  app.post("/api/tier-lists/:id/items/quick-fill", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const tierListId = req.params.id as string;
    await requireTierListAccess(tierListId, appUser);
    const body = req.body as { source?: string; type?: string; limit?: number };
    const source = body.source === "watchlist" ? "watchlist" : body.source === "trending" ? "trending" : null;
    if (!source) return res.status(400).json({ message: "source must be 'trending' or 'watchlist'" });

    const beforeItems = await storage.getTierListItems(tierListId);
    const previousTotal = beforeItems.length;

    if (source === "watchlist") {
      const limit = Math.min(Math.max(1, body.limit ?? 100), 100);
      const watchlistItems = await storage.getWatchlist(appUser.id);
      const mediaIds = watchlistItems.slice(0, limit).map((m) => m.id);
      for (const mediaId of mediaIds) {
        try {
          await storage.addTierListItem(tierListId, mediaId, appUser.id);
        } catch {
          // skip on error
        }
      }
      const afterItems = await storage.getTierListItems(tierListId);
      const added = afterItems.length - previousTotal;
      const skipped = mediaIds.length - added;
      return res.json({ added, skipped });
    }

    // source === "trending"
    const type = body.type;
    const validTypes = ["movie", "tv", "anime", "book", "music", "game"];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ message: "type must be one of: movie, tv, anime, book, music, game" });
    }
    const limit = Math.min(Math.max(1, body.limit ?? 20), 50);
    let results: any[] = [];
    try {
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
          results = await searchSpotifyAlbums("top hits 2024", limit).catch(() => []);
          break;
        case "game":
          results = await getTrendingGames(limit).catch(() => []);
          break;
        default:
          return res.status(400).json({ message: "Invalid type" });
      }
    } catch (err: any) {
      console.error("Quick-fill trending error:", err.message);
      return res.status(500).json({ message: "Failed to fetch trending content" });
    }

    for (const item of results) {
      try {
        const media = await storage.ensureMedia({
          type: item.type,
          title: item.title ?? "",
          creator: item.creator ?? "",
          year: item.year ?? "",
          coverUrl: item.coverUrl ?? "",
          coverGradient: item.coverGradient ?? "from-slate-700 to-slate-900",
          synopsis: item.synopsis ?? "",
          tags: Array.isArray(item.tags) ? item.tags : [],
          rating: item.rating ?? "",
          externalId: item.externalId ?? "",
        });
        await storage.addTierListItem(tierListId, media.id, appUser.id);
      } catch {
        // skip items that fail to ensure or add
      }
    }

    const afterItems = await storage.getTierListItems(tierListId);
    const added = afterItems.length - previousTotal;
    const skipped = results.length - added;
    res.json({ added, skipped });
  });

  app.patch("/api/tier-lists/:id/items/:itemId/move", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    const { tierId, position } = req.body as { tierId?: string | null; position: number };
    if (typeof position !== "number" || position < 0) return res.status(400).json({ message: "position is required and must be >= 0" });
    await storage.moveTierListItem(req.params.itemId as string, tierId ?? null, position);
    res.json({ ok: true });
  });

  app.patch("/api/tier-lists/:id/items/:itemId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    const { note } = req.body as { note?: string | null };
    await storage.updateTierListItemNote(req.params.id as string, req.params.itemId as string, note ?? null);
    res.json({ ok: true });
  });

  app.delete("/api/tier-lists/:id/items/:itemId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await requireTierListAccess(req.params.id as string, appUser);
    await storage.removeTierListItem(req.params.id as string, req.params.itemId as string);
    res.json({ ok: true });
  });

  app.post("/api/tier-lists/:id/like", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    if (tierList.visibility !== "public") return res.status(403).json({ message: "Cannot like private list" });
    await storage.likeTierList(appUser.id, req.params.id as string);
    res.json({ ok: true });
  });

  app.delete("/api/tier-lists/:id/like", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.unlikeTierList(appUser.id, req.params.id as string);
    res.json({ ok: true });
  });

  app.get("/api/tier-lists/:id/comments", async (req, res) => {
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    if (tierList.visibility !== "public") return res.status(403).json({ message: "Forbidden" });
    const comments = await storage.getTierListComments(req.params.id as string);
    res.json(comments);
  });

  app.post("/api/tier-lists/:id/comments", requireAuth, async (req, res) => {
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    if (tierList.visibility !== "public") return res.status(403).json({ message: "Forbidden" });
    const { body } = req.body as { body?: string };
    if (!body?.trim()) return res.status(400).json({ message: "body required" });
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const comment = await storage.createTierListComment(req.params.id as string, appUser.id, body.trim().slice(0, 1000));
    res.status(201).json(comment);
  });

  app.delete("/api/tier-lists/:id/comments/:commentId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      await storage.deleteTierListComment(req.params.commentId as string, appUser.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.message === "Forbidden" ? 403 : 404).json({ message: err.message });
    }
  });

  app.get("/api/tier-lists/:id/reactions", async (req, res) => {
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    if (tierList.visibility !== "public") return res.status(403).json({ message: "Forbidden" });
    const authReq = req as RequestWithAuth;
    let appUserId: string | null = null;
    if (authReq.authUserId) {
      const appUser = await storage.getOrCreateAppUser(authReq.authUserId, {});
      appUserId = appUser.id;
    }
    const reactions = await storage.getTierListItemReactions(req.params.id as string, appUserId);
    res.json(reactions);
  });

  app.post("/api/tier-lists/:id/items/:itemId/react", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const tierList = await storage.getTierList(req.params.id as string);
    if (!tierList) return res.status(404).json({ message: "Tier list not found" });
    if (tierList.visibility !== "public") return res.status(403).json({ message: "Forbidden" });
    const { reaction } = req.body as { reaction?: string };
    if (reaction !== "agree" && reaction !== "disagree") {
      return res.status(400).json({ message: "reaction must be 'agree' or 'disagree'" });
    }
    await storage.reactToTierListItem(appUser.id, req.params.itemId as string, reaction);
    res.json({ ok: true });
  });

  app.delete("/api/tier-lists/:id/items/:itemId/react", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.unreactToTierListItem(appUser.id, req.params.itemId as string);
    res.json({ ok: true });
  });

  app.post("/api/tier-lists/:id/invitations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { tierList } = await requireTierListAccess(req.params.id as string, appUser);
    if (tierList.ownerId !== appUser.id) return res.status(403).json({ message: "Only owner can invite" });
    const { invitedUserId } = req.body as { invitedUserId?: string };
    if (!invitedUserId) return res.status(400).json({ message: "invitedUserId is required" });
    if (invitedUserId === appUser.id) return res.status(400).json({ message: "Cannot invite yourself" });
    const inv = await storage.createTierListInvitation(tierList.id, invitedUserId, appUser.id);
    pushToUser(invitedUserId, {
      type: "list_invitation",
      payload: {
        invitationId: inv.id,
        listId: tierList.id,
        listName: tierList.name,
        invitedByDisplayName: appUser.displayName,
      },
    });
    res.status(201).json(inv);
  });

  app.get("/api/tier-lists/:id/invitations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { tierList } = await requireTierListAccess(req.params.id as string, appUser);
    if (tierList.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });
    const invitations = await storage.getTierListInvitations(tierList.id);
    res.json(invitations);
  });

  app.delete("/api/tier-lists/:id/collaborators/:userId", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const { tierList } = await requireTierListAccess(req.params.id as string, appUser);
    if (tierList.ownerId !== appUser.id) return res.status(403).json({ message: "Forbidden" });
    await storage.removeTierListCollaborator(tierList.id, req.params.userId as string);
    res.json({ ok: true });
  });

  app.get("/api/tier-list-invitations", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const invitations = await storage.getTierListInvitationsForUser(appUser.id);
    res.json(invitations);
  });

  app.patch("/api/tier-list-invitations/:id/accept", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      const inv = await storage.respondToTierListInvitation(req.params.id as string, appUser.id, "accepted");
      res.json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/tier-list-invitations/:id/decline", requireAuth, async (req, res) => {
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      const inv = await storage.respondToTierListInvitation(req.params.id as string, appUser.id, "declined");
      res.json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // --- Preset lists (curated) ---
  app.get("/api/preset-lists", async (_req, res) => {
    const withCounts = await Promise.all(
      PRESET_LISTS.map(async (def) => {
        const [likeCount, items] = await Promise.all([
          storage.getPresetListLikeCount(def.id),
          getPresetListItems(def.id),
        ]);
        const coverUrls = items
          .slice(0, 5)
          .map((m) => m.coverUrl)
          .filter(Boolean);
        return {
          id: def.id,
          name: def.name,
          description: def.description,
          mediaType: def.mediaType,
          icon: def.icon,
          expectedCount: def.expectedCount,
          likeCount,
          coverUrls,
        };
      })
    );
    res.json(withCounts);
  });

  app.get("/api/preset-lists/:id", async (req, res) => {
    const id = req.params.id as string;
    const def = getPresetListById(id);
    if (!def) return res.status(404).json({ message: "Preset list not found" });
    const authReq = req as RequestWithAuth;
    const appUserId = authReq.authUserId
      ? (await storage.getOrCreateAppUser(authReq.authUserId, {})).id
      : null;
    const [items, likeCount, commentCount, hasLiked, progress] = await Promise.all([
      getPresetListItems(id),
      storage.getPresetListLikeCount(id),
      storage.getPresetListCommentCount(id),
      appUserId ? storage.hasLikedPresetList(appUserId, id) : Promise.resolve(false),
      appUserId ? storage.getUserPresetProgress(appUserId, id) : Promise.resolve(new Set<string>()),
    ]);
    res.json({
      ...def,
      items,
      likeCount,
      commentCount,
      hasLiked: hasLiked ?? false,
      progress: Array.from(progress),
    });
  });

  app.post("/api/preset-lists/:id/like", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    if (!getPresetListById(id)) return res.status(404).json({ message: "Preset list not found" });
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.likePresetList(appUser.id, id);
    res.status(204).end();
  });

  app.delete("/api/preset-lists/:id/like", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.unlikePresetList(appUser.id, id);
    res.status(204).end();
  });

  app.get("/api/preset-lists/:id/comments", async (req, res) => {
    const id = req.params.id as string;
    if (!getPresetListById(id)) return res.status(404).json({ message: "Preset list not found" });
    const comments = await storage.getPresetListComments(id);
    res.json(comments);
  });

  app.post("/api/preset-lists/:id/comments", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    if (!getPresetListById(id)) return res.status(404).json({ message: "Preset list not found" });
    const body = (req.body as { body?: string })?.body;
    if (typeof body !== "string" || !body.trim()) return res.status(400).json({ message: "body required" });
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const comment = await storage.createPresetListComment(id, appUser.id, body.trim());
    res.status(201).json(comment);
  });

  app.delete("/api/preset-lists/:id/comments/:commentId", requireAuth, async (req, res) => {
    const { id, commentId } = req.params as { id: string; commentId: string };
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    try {
      await storage.deletePresetListComment(commentId, appUser.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(err.message === "Forbidden" ? 403 : 404).json({ message: err.message });
    }
  });

  app.post("/api/preset-lists/:id/progress/:externalId", requireAuth, async (req, res) => {
    const { id, externalId } = req.params as { id: string; externalId: string };
    if (!getPresetListById(id)) return res.status(404).json({ message: "Preset list not found" });
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.markPresetProgress(appUser.id, id, decodeURIComponent(externalId));
    res.status(204).end();
  });

  app.delete("/api/preset-lists/:id/progress/:externalId", requireAuth, async (req, res) => {
    const { id, externalId } = req.params as { id: string; externalId: string };
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    await storage.unmarkPresetProgress(appUser.id, id, decodeURIComponent(externalId));
    res.status(204).end();
  });

  app.post("/api/preset-lists/:id/fork", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const def = getPresetListById(id);
    if (!def) return res.status(404).json({ message: "Preset list not found" });
    const authReq = req as RequestWithAuth;
    const appUser = await storage.getOrCreateAppUser(authReq.authUserId!, {});
    const items = await getPresetListItems(id);
    const list = await storage.createList(appUser.id, {
      name: `${def.name} (copy)`,
      description: def.description || "",
      visibility: "private",
      isRanked: false,
      tags: [],
    });
    for (const item of items) {
      try {
        const media = await storage.ensureMedia({
          type: item.type,
          title: item.title,
          creator: item.creator,
          year: item.year,
          coverUrl: item.coverUrl,
          coverGradient: "from-slate-700 to-slate-900",
          synopsis: item.synopsis,
          tags: item.tags,
          rating: item.rating,
          externalId: item.externalId,
        });
        await storage.addListItem(list.id, media.id, appUser.id, undefined);
      } catch {
        // skip items that fail to ensure
      }
    }
    res.status(201).json(list);
  });

  return httpServer;
}
