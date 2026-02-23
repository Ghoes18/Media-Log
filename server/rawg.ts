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
