const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

let movieGenres: Map<number, string> | null = null;
let tvGenres: Map<number, string> | null = null;

interface TmdbResult {
  externalId: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  synopsis: string;
  tags: string[];
  type: "movie" | "tv" | "anime";
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

async function tmdbFetch(endpoint: string): Promise<any> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE}${endpoint}${separator}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  return res.json();
}

async function getMovieGenres(): Promise<Map<number, string>> {
  if (movieGenres) return movieGenres;
  try {
    const data = await tmdbFetch("/genre/movie/list");
    movieGenres = new Map((data.genres || []).map((g: any) => [g.id, g.name]));
  } catch (e) {
    console.error("Failed to fetch movie genres:", e);
    movieGenres = new Map();
  }
  return movieGenres;
}

async function getTvGenres(): Promise<Map<number, string>> {
  if (tvGenres) return tvGenres;
  try {
    const data = await tmdbFetch("/genre/tv/list");
    tvGenres = new Map((data.genres || []).map((g: any) => [g.id, g.name]));
  } catch (e) {
    console.error("Failed to fetch TV genres:", e);
    tvGenres = new Map();
  }
  return tvGenres;
}

function mapGenreIds(genreIds: number[], genreMap: Map<number, string>): string[] {
  return (genreIds || [])
    .map((id) => genreMap.get(id))
    .filter((name): name is string => !!name);
}

function mapMovieResult(item: any, genreMap: Map<number, string>): TmdbResult {
  return {
    externalId: String(item.id),
    title: item.title || "",
    creator: "",
    year: item.release_date?.slice(0, 4) || "",
    coverUrl: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : "",
    synopsis: item.overview || "",
    tags: mapGenreIds(item.genre_ids || [], genreMap),
    type: "movie",
    rating: item.vote_average != null ? String(item.vote_average) : "",
  };
}

function mapTvResult(item: any, genreMap: Map<number, string>, type: "tv" | "anime" = "tv"): TmdbResult {
  return {
    externalId: String(item.id),
    title: item.name || "",
    creator: "",
    year: item.first_air_date?.slice(0, 4) || "",
    coverUrl: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : "",
    synopsis: item.overview || "",
    tags: mapGenreIds(item.genre_ids || [], genreMap),
    type,
    rating: item.vote_average != null ? String(item.vote_average) : "",
  };
}

export async function getTrendingMovies(limit = 10): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY) return [];
  const cacheKey = "trending-movie";
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const [data, genres] = await Promise.all([
      tmdbFetch("/trending/movie/week"),
      getMovieGenres(),
    ]);
    const results = (data.results || []).map((item: any) => mapMovieResult(item, genres));
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("getTrendingMovies error:", e);
    return [];
  }
}

export async function getTrendingTv(limit = 10): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY) return [];
  const cacheKey = "trending-tv";
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const [data, genres] = await Promise.all([
      tmdbFetch("/trending/tv/week"),
      getTvGenres(),
    ]);
    const results = (data.results || []).map((item: any) => mapTvResult(item, genres));
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("getTrendingTv error:", e);
    return [];
  }
}

export async function getTrendingAnime(limit = 10): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY) return [];
  const cacheKey = "trending-anime";
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const [data, genres] = await Promise.all([
      tmdbFetch("/discover/tv?with_genres=16&sort_by=popularity.desc"),
      getTvGenres(),
    ]);
    const results = (data.results || []).map((item: any) => mapTvResult(item, genres, "anime"));
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("getTrendingAnime error:", e);
    return [];
  }
}

export async function searchTmdbMovies(query: string, limit = 10): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY || !query) return [];
  const cacheKey = `search-movie-${query.toLowerCase().trim()}`;
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const [data, genres] = await Promise.all([
      tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}`),
      getMovieGenres(),
    ]);
    const results = (data.results || []).map((item: any) => mapMovieResult(item, genres));
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("searchTmdbMovies error:", e);
    return [];
  }
}

export async function searchTmdbTv(query: string, limit = 10): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY || !query) return [];
  const cacheKey = `search-tv-${query.toLowerCase().trim()}`;
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const [data, genres] = await Promise.all([
      tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}`),
      getTvGenres(),
    ]);
    const results = (data.results || []).map((item: any) => mapTvResult(item, genres));
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("searchTmdbTv error:", e);
    return [];
  }
}

export async function searchTmdbAnime(query: string, limit = 10): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY || !query) return [];
  const cacheKey = `search-anime-${query.toLowerCase().trim()}`;
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const [data, genres] = await Promise.all([
      tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}`),
      getTvGenres(),
    ]);
    const ANIMATION_GENRE_ID = 16;
    const filtered = (data.results || []).filter(
      (item: any) => (item.genre_ids || []).includes(ANIMATION_GENRE_ID)
    );
    const results = filtered.map((item: any) => mapTvResult(item, genres, "anime"));
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("searchTmdbAnime error:", e);
    return [];
  }
}
