const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE = "https://api.rawg.io/api";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

interface RawgResult {
  externalId: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  synopsis: string;
  tags: string[];
  type: "game";
  rating: string;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function rawgFetch(endpoint: string): Promise<any> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${RAWG_BASE}${endpoint}${separator}key=${RAWG_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG ${res.status}: ${res.statusText}`);
  return res.json();
}

function mapGameResult(item: any): RawgResult {
  return {
    externalId: `rawg-${item.id}`,
    title: item.name || "",
    creator: "",
    year: item.released?.slice(0, 4) || "",
    coverUrl: item.background_image || "",
    synopsis: "",
    tags: (item.genres || []).map((g: any) => g.name),
    type: "game",
    rating: item.esrb_rating?.name || "",
  };
}

export async function getTrendingGames(limit = 10): Promise<RawgResult[]> {
  if (!RAWG_API_KEY) return [];
  const cacheKey = "trending-game";
  const cached = getCached<RawgResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().slice(0, 10);
    const data = await rawgFetch(
      `/games?ordering=-added&dates=${yearStart},${today}&page_size=20`,
    );
    const results = (data.results || []).map(mapGameResult);
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("getTrendingGames error:", e);
    return [];
  }
}

export async function getRawgGamesByDeveloper(developerId: string, limit = 24): Promise<RawgResult[]> {
  if (!RAWG_API_KEY || !developerId) return [];
  const cacheKey = `games-developer-${developerId}`;
  const cached = getCached<RawgResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const data = await rawgFetch(
      `/games?developers=${developerId}&page_size=${Math.min(limit, 40)}`
    );
    const results = (data.results || []).map(mapGameResult);
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("getRawgGamesByDeveloper error:", e);
    return [];
  }
}

export async function searchRawgGames(
  query: string,
  limit = 10,
): Promise<RawgResult[]> {
  if (!RAWG_API_KEY || !query) return [];
  const cacheKey = `search-game-${query.toLowerCase().trim()}`;
  const cached = getCached<RawgResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const data = await rawgFetch(
      `/games?search=${encodeURIComponent(query)}&page_size=20`,
    );
    const results = (data.results || []).map(mapGameResult);
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("searchRawgGames error:", e);
    return [];
  }
}

export interface RawgGameDetails {
  externalId: string;
  type: "game";
  title: string;
  year: string;
  coverUrl: string;
  backdropUrl: string | null;
  description: string;
  metacritic: number | null;
  metacriticUrl: string | null;
  platforms: { name: string; releasedAt: string }[];
  developers: { id: number; name: string }[];
  publishers: { id: number; name: string }[];
  genres: string[];
  tags: string[];
  esrbRating: string;
  website: string | null;
  screenshots: string[];
  trailers: { name: string; preview: string; videoUrl: string }[];
  alternativeNames: string[];
  stores: { name: string; url: string }[];
}

export async function getRawgGameDetails(externalId: string): Promise<RawgGameDetails | null> {
  if (!RAWG_API_KEY) return null;
  const rawgId = externalId.startsWith("rawg-") ? externalId.replace(/^rawg-/, "") : externalId;
  const cacheKey = `details-game-${rawgId}`;
  const cached = getCached<RawgGameDetails>(cacheKey);
  if (cached) return cached;
  try {
    const gameRes = await rawgFetch(`/games/${rawgId}`);
    const [screenshotsRes, moviesRes] = await Promise.all([
      rawgFetch(`/games/${rawgId}/screenshots?page_size=8`).catch(() => ({ results: [] })),
      rawgFetch(`/games/${rawgId}/movies?page_size=4`).catch(() => ({ results: [] })),
    ]);

    const platforms = (gameRes.platforms || []).map((p: any) => ({
      name: p.platform?.name || "",
      releasedAt: p.released_at || "",
    }));
    const developers = (gameRes.developers || []).map((d: any) => ({
      id: d.id || 0,
      name: d.name || "",
    }));
    const publishers = (gameRes.publishers || []).map((p: any) => ({
      id: p.id || 0,
      name: p.name || "",
    }));
    const genres = (gameRes.genres || []).map((g: any) => g.name);
    const tags = (gameRes.tags || []).slice(0, 12).map((t: any) => t.name);
    const screenshots = (screenshotsRes.results || []).map((s: any) => s.image);
    const trailers = (moviesRes.results || []).map((m: any) => ({
      name: m.name || "",
      preview: m.preview || "",
      videoUrl: m.data?.max || m.data?.["480"] || m.data?.max || "",
    }));
    const stores = (gameRes.stores || []).map((s: any) => ({
      name: s.store?.name || "",
      url: s.url || "",
    }));

    const result: RawgGameDetails = {
      externalId: `rawg-${gameRes.id}`,
      type: "game",
      title: gameRes.name || "",
      year: gameRes.released?.slice(0, 4) || "",
      coverUrl: gameRes.background_image || "",
      backdropUrl: gameRes.background_image || gameRes.background_image_additional || null,
      description: gameRes.description_raw || gameRes.description || "",
      metacritic: gameRes.metacritic ?? null,
      metacriticUrl: gameRes.metacritic_url || null,
      platforms,
      developers,
      publishers,
      genres,
      tags,
      esrbRating: gameRes.esrb_rating?.name || "",
      website: gameRes.website || null,
      screenshots,
      trailers,
      alternativeNames: gameRes.alternative_names || [],
      stores,
    };
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    console.error("getRawgGameDetails error:", e);
    return null;
  }
}
