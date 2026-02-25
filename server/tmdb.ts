const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_IMG_BACKDROP = "https://image.tmdb.org/t/p/original";

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

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TmdbAlternativeTitle {
  iso3166_1: string;
  title: string;
  type: string;
}

export interface TmdbRelease {
  iso3166_1: string;
  releaseDate: string;
  certification: string;
}

export interface TmdbSimilarItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  name?: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
}

export interface TmdbDetailResult {
  externalId: string;
  type: "movie" | "tv" | "anime";
  title: string;
  originalTitle: string;
  tagline: string;
  overview: string;
  backdropUrl: string | null;
  posterUrl: string | null;
  runtime: number | null;
  status: string;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  budget: number;
  revenue: number;
  homepage: string | null;
  imdbId: string | null;
  genres: { id: number; name: string }[];
  productionCompanies: { id: number; name: string }[];
  productionCountries: { iso3166_1: string; name: string }[];
  spokenLanguages: { iso639_1: string; name: string }[];
  originalLanguage: string;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
  videos: TmdbVideo[];
  alternativeTitles: TmdbAlternativeTitle[];
  releases: TmdbRelease[];
  similar: TmdbSimilarItem[];
  keywords: string[];
}

function mapTmdbDetails(data: any, type: "movie" | "tv"): TmdbDetailResult {
  const isMovie = type === "movie";
  const releaseDate = isMovie ? data.release_date : data.first_air_date;
  const credits = data.credits || {};
  const cast = (credits.cast || []).slice(0, 30).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character || "",
    profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    order: c.order ?? 0,
  }));
  const crew = (credits.crew || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    job: c.job || "",
    department: c.department || "",
    profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
  }));
  const videos = (data.videos?.results || [])
    .filter((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .map((v: any) => ({
      id: v.id,
      key: v.key,
      name: v.name,
      site: v.site,
      type: v.type,
      official: v.official ?? false,
    }));
  const altTitles = (data.alternative_titles?.titles || []).map((t: any) => ({
    iso3166_1: t.iso_3166_1 || "",
    title: t.title || "",
    type: t.type || "",
  }));
  const releases: TmdbRelease[] = [];
  if (data.release_dates?.results) {
    for (const r of data.release_dates.results) {
      const country = r.iso_3166_1 || "";
      for (const d of r.release_dates || []) {
        releases.push({
          iso3166_1: country,
          releaseDate: d.release_date || "",
          certification: d.certification || d.rating || "",
        });
      }
    }
  } else if (data.content_ratings?.results) {
    for (const r of data.content_ratings.results) {
      releases.push({
        iso3166_1: r.iso_3166_1 || "",
        releaseDate: "",
        certification: r.rating || "",
      });
    }
  }
  const similar = (data.similar?.results || []).slice(0, 12).map((s: any) => ({
    id: s.id,
    type,
    title: s.title || s.name || "",
    name: s.name,
    posterPath: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : null,
    backdropPath: s.backdrop_path ? `${TMDB_IMG_BACKDROP}${s.backdrop_path}` : null,
    overview: s.overview || "",
    releaseDate: s.release_date,
    firstAirDate: s.first_air_date,
    voteAverage: s.vote_average ?? 0,
  }));
  const rawKeywords = data.keywords?.keywords ?? data.keywords;
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.map((k: any) => (typeof k === "string" ? k : k?.name ?? ""))
    : [];
  return {
    externalId: String(data.id),
    type: type === "tv" ? "tv" : "movie",
    title: data.title || data.name || "",
    originalTitle: data.original_title || data.original_name || "",
    tagline: data.tagline || "",
    overview: data.overview || "",
    backdropUrl: data.backdrop_path ? `${TMDB_IMG_BACKDROP}${data.backdrop_path}` : null,
    posterUrl: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
    runtime: data.runtime ?? data.episode_run_time?.[0] ?? null,
    status: data.status || "",
    releaseDate: releaseDate || "",
    voteAverage: data.vote_average ?? 0,
    voteCount: data.vote_count ?? 0,
    budget: data.budget ?? 0,
    revenue: data.revenue ?? 0,
    homepage: data.homepage || null,
    imdbId: data.imdb_id || null,
    genres: (data.genres || []).map((g: any) => ({ id: g.id, name: g.name })),
    productionCompanies: (data.production_companies || []).map((c: any) => ({
      id: c.id,
      name: c.name,
    })),
    productionCountries: (data.production_countries || []).map((c: any) => ({
      iso3166_1: c.iso_3166_1,
      name: c.name,
    })),
    spokenLanguages: (data.spoken_languages || []).map((l: any) => ({
      iso639_1: l.iso_639_1,
      name: l.english_name || l.name,
    })),
    originalLanguage: data.original_language || "",
    cast,
    crew,
    videos,
    alternativeTitles: altTitles,
    releases,
    similar,
    keywords,
  };
}

export async function getTmdbPersonCredits(
  personId: string,
  type: "movie" | "tv" | "anime",
  limit = 24
): Promise<TmdbResult[]> {
  if (!TMDB_API_KEY || !personId) return [];
  const tmdbType = type === "anime" ? "tv" : type;
  const cacheKey = `person-credits-${personId}-${tmdbType}`;
  const cached = getCached<TmdbResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);
  try {
    const endpoint = tmdbType === "movie" ? `/person/${personId}/movie_credits` : `/person/${personId}/tv_credits`;
    const data = await tmdbFetch(endpoint);
    const items = data.cast || [];
    const genres = tmdbType === "movie" ? await getMovieGenres() : await getTvGenres();
    let results = items.map((item: any) =>
      tmdbType === "movie"
        ? mapMovieResult(item, genres)
        : mapTvResult(item, genres, type === "anime" ? "anime" : "tv")
    );
    if (type === "anime") {
      results = results.filter((r: any) => (r.tags || []).includes("Animation"));
    }
    setCache(cacheKey, results);
    return results.slice(0, limit);
  } catch (e) {
    console.error("getTmdbPersonCredits error:", e);
    return [];
  }
}

export async function getTmdbDetails(tmdbId: string, type: "movie" | "tv"): Promise<TmdbDetailResult | null> {
  if (!TMDB_API_KEY || !tmdbId) return null;
  const cacheKey = `details-${type}-${tmdbId}`;
  const cached = getCached<TmdbDetailResult>(cacheKey);
  if (cached) return cached;
  try {
    const endpoint =
      type === "movie"
        ? `/movie/${tmdbId}?append_to_response=credits,videos,alternative_titles,release_dates,similar,keywords`
        : `/tv/${tmdbId}?append_to_response=credits,videos,alternative_titles,content_ratings,similar,keywords`;
    const data = await tmdbFetch(endpoint);
    const result = mapTmdbDetails(data, type);
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    console.error("getTmdbDetails error:", e);
    return null;
  }
}

/** Resolve IMDb ID (tt...) to TMDB details for movies. */
export async function getTmdbDetailsByImdbId(imdbId: string): Promise<TmdbDetailResult | null> {
  if (!TMDB_API_KEY || !imdbId || !/^tt\d+$/.test(imdbId)) return null;
  const cacheKey = `details-imdb-${imdbId}`;
  const cached = getCached<TmdbDetailResult>(cacheKey);
  if (cached) return cached;
  try {
    const data = await tmdbFetch(`/find/${imdbId}?external_source=imdb_id`);
    const movie = data.movie_results?.[0];
    if (!movie) return null;
    const full = await tmdbFetch(
      `/movie/${movie.id}?append_to_response=credits,videos,alternative_titles,release_dates,similar,keywords`
    );
    const result = mapTmdbDetails(full, "movie");
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    console.error("getTmdbDetailsByImdbId error:", e);
    return null;
  }
}
