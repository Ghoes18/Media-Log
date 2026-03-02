/**
 * Preset curated lists: registry, fetchers, and in-memory cache.
 * Items are fetched from external APIs; social data (likes, comments, progress) is in DB.
 */

import {
  getTopRatedMovies,
  getTopRatedTvShows,
  getTopRatedAnime,
  getTmdbDetailsByImdbId,
  getTmdbDetails,
  getTrendingMovies,
  getTrendingTv,
  getTrendingAnime,
} from "./tmdb";
import { getDiscoverGames, getTrendingGames } from "./rawg";
import { getSpotifyAlbum } from "./spotify";
import { getOpenLibrarySubjectWorks, getTrendingBooks } from "./openlibrary";
import {
  OSCAR_BEST_PICTURE_IMDB_IDS,
  EMMY_DRAMA_TMDB_IDS,
  GREATEST_ALBUMS_SPOTIFY_IDS,
} from "./preset-list-data";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const itemCache = new Map<
  string,
  { items: PresetNormalizedMedia[]; timestamp: number }
>();

export interface PresetNormalizedMedia {
  externalId: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  synopsis: string;
  tags: string[];
  type: string;
  rating: string;
}

export interface PresetListDef {
  id: string;
  name: string;
  description: string;
  mediaType: string;
  icon: string;
  expectedCount: number;
  ranked?: boolean;
  fetchItems: () => Promise<PresetNormalizedMedia[]>;
}

function getCachedItems(id: string): PresetNormalizedMedia[] | null {
  const entry = itemCache.get(id);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.items;
  return null;
}

function setCachedItems(id: string, items: PresetNormalizedMedia[]) {
  itemCache.set(id, { items, timestamp: Date.now() });
}

async function fetchTop250Movies(): Promise<PresetNormalizedMedia[]> {
  const pages = await Promise.all(
    Array.from({ length: 13 }, (_, i) => getTopRatedMovies(20, i))
  );
  return pages.flat().slice(0, 250);
}

async function fetchTopRatedMovies(): Promise<PresetNormalizedMedia[]> {
  const pages = await Promise.all([
    getTopRatedMovies(20, 0),
    getTopRatedMovies(20, 1),
    getTopRatedMovies(20, 2),
    getTopRatedMovies(20, 3),
    getTopRatedMovies(20, 4),
  ]);
  return pages.flat();
}

async function fetchTopRatedTv(): Promise<PresetNormalizedMedia[]> {
  const pages = await Promise.all([
    getTopRatedTvShows(25, 0),
    getTopRatedTvShows(25, 1),
  ]);
  return pages.flat();
}

async function fetchTopRatedAnime(): Promise<PresetNormalizedMedia[]> {
  const pages = await Promise.all([
    getTopRatedAnime(25, 0),
    getTopRatedAnime(25, 1),
  ]);
  return pages.flat();
}

async function fetchOscarWinners(): Promise<PresetNormalizedMedia[]> {
  const results: PresetNormalizedMedia[] = [];
  for (const imdbId of OSCAR_BEST_PICTURE_IMDB_IDS) {
    try {
      const details = await getTmdbDetailsByImdbId(imdbId);
      if (!details) continue;
      const director = details.crew?.find(
        (c) => c.job === "Director" || c.department === "Directing"
      );
      results.push({
        externalId: details.imdbId || details.externalId,
        title: details.title,
        creator: director?.name ?? "",
        year: details.releaseDate?.slice(0, 4) ?? "",
        coverUrl: details.posterUrl ?? "",
        synopsis: details.overview ?? "",
        tags: (details.genres || []).map((g) => g.name),
        type: "movie",
        rating: details.voteAverage != null ? String(details.voteAverage) : "",
      });
    } catch {
      // skip failed
    }
  }
  return results;
}

async function fetchGreatestAlbums(): Promise<PresetNormalizedMedia[]> {
  const results: PresetNormalizedMedia[] = [];
  const seen = new Set<string>();
  for (const albumId of GREATEST_ALBUMS_SPOTIFY_IDS) {
    if (seen.has(albumId)) continue;
    seen.add(albumId);
    try {
      const album = await getSpotifyAlbum(albumId);
      if (album)
        results.push({
          externalId: album.externalId,
          title: album.title,
          creator: album.creator,
          year: album.year,
          coverUrl: album.coverUrl,
          synopsis: album.synopsis ?? "",
          tags: album.tags ?? [],
          type: "music",
          rating: "",
        });
    } catch {
      // skip
    }
  }
  return results;
}

async function fetchTopRatedGames(): Promise<PresetNormalizedMedia[]> {
  const page1 = await getDiscoverGames(40, 0);
  const page2 = await getDiscoverGames(10, 1);
  return [...page1, ...page2];
}

async function fetchClassicLiterature(): Promise<PresetNormalizedMedia[]> {
  return getOpenLibrarySubjectWorks("classics", 50);
}

async function fetchEmmyDramaWinners(): Promise<PresetNormalizedMedia[]> {
  const results: PresetNormalizedMedia[] = [];
  const seen = new Set<string>();
  for (const tmdbId of EMMY_DRAMA_TMDB_IDS) {
    if (seen.has(tmdbId)) continue;
    seen.add(tmdbId);
    try {
      const details = await getTmdbDetails(tmdbId, "tv");
      if (!details) continue;
      results.push({
        externalId: details.externalId,
        title: details.title,
        creator:
          details.crew?.find(
            (c) => c.job === "Executive Producer" || c.department === "Production"
          )?.name ?? "",
        year: details.releaseDate?.slice(0, 4) ?? "",
        coverUrl: details.posterUrl ?? "",
        synopsis: details.overview ?? "",
        tags: (details.genres || []).map((g) => g.name),
        type: "tv",
        rating:
          details.voteAverage != null ? String(details.voteAverage) : "",
      });
    } catch {
      // skip
    }
  }
  return results;
}

async function fetchTrendingThisWeek(): Promise<PresetNormalizedMedia[]> {
  const [movies, tv, anime, books, games] = await Promise.all([
    getTrendingMovies(6, 0),
    getTrendingTv(6, 0),
    getTrendingAnime(6, 0),
    getTrendingBooks(6, 0),
    getTrendingGames(6, 0),
  ]);
  const mixed: PresetNormalizedMedia[] = [
    ...movies.map((m: PresetNormalizedMedia) => ({ ...m, type: m.type || "movie" })),
    ...tv.map((m: PresetNormalizedMedia) => ({ ...m, type: m.type || "tv" })),
    ...anime.map((m: PresetNormalizedMedia) => ({ ...m, type: m.type || "anime" })),
    ...books.map((m: PresetNormalizedMedia) => ({ ...m, type: "book" })),
    ...games.map((m: PresetNormalizedMedia) => ({ ...m, type: "game" })),
  ];
  return mixed.slice(0, 30);
}

export const PRESET_LISTS: PresetListDef[] = [
  {
    id: "imdb-top-250",
    name: "Top 250 Movies",
    description: "The 250 highest rated movies on TMDB.",
    mediaType: "movie",
    icon: "Film",
    expectedCount: 250,
    ranked: true,
    fetchItems: fetchTop250Movies,
  },
  {
    id: "top-rated-movies",
    name: "Top Rated Movies",
    description: "Highest rated movies by TMDB vote average.",
    mediaType: "movie",
    icon: "Film",
    expectedCount: 100,
    ranked: true,
    fetchItems: fetchTopRatedMovies,
  },
  {
    id: "top-rated-tv",
    name: "Top Rated TV Shows",
    description: "Highest rated TV series by TMDB.",
    mediaType: "tv",
    icon: "Tv2",
    expectedCount: 50,
    ranked: true,
    fetchItems: fetchTopRatedTv,
  },
  {
    id: "top-rated-anime",
    name: "Top Rated Anime",
    description: "Top rated animation (TMDB, min vote count).",
    mediaType: "anime",
    icon: "Clapperboard",
    expectedCount: 50,
    ranked: true,
    fetchItems: fetchTopRatedAnime,
  },
  {
    id: "oscar-best-picture",
    name: "Oscar Best Picture Winners",
    description: "Academy Award winners for Best Picture.",
    mediaType: "movie",
    icon: "Award",
    expectedCount: OSCAR_BEST_PICTURE_IMDB_IDS.length,
    fetchItems: fetchOscarWinners,
  },
  {
    id: "greatest-albums",
    name: "Greatest Albums of All Time",
    description: "Critically acclaimed albums (Spotify).",
    mediaType: "music",
    icon: "Music",
    expectedCount: GREATEST_ALBUMS_SPOTIFY_IDS.length,
    fetchItems: fetchGreatestAlbums,
  },
  {
    id: "top-rated-games",
    name: "Top Rated Games (Metacritic)",
    description: "Highest rated games by Metacritic (RAWG).",
    mediaType: "game",
    icon: "Gamepad2",
    expectedCount: 50,
    ranked: true,
    fetchItems: fetchTopRatedGames,
  },
  {
    id: "classic-literature",
    name: "Classic Literature",
    description: "Classic works from Open Library.",
    mediaType: "book",
    icon: "BookOpen",
    expectedCount: 50,
    fetchItems: fetchClassicLiterature,
  },
  {
    id: "emmy-drama-winners",
    name: "Emmy Best Drama Winners",
    description: "Emmy Award winners for Outstanding Drama Series.",
    mediaType: "tv",
    icon: "Award",
    expectedCount: EMMY_DRAMA_TMDB_IDS.length,
    fetchItems: fetchEmmyDramaWinners,
  },
  {
    id: "trending-this-week",
    name: "Trending This Week",
    description: "Trending movies, TV, anime, books, and games.",
    mediaType: "mixed",
    icon: "TrendingUp",
    expectedCount: 30,
    fetchItems: fetchTrendingThisWeek,
  },
];

export function getPresetListIds(): string[] {
  return PRESET_LISTS.map((l) => l.id);
}

export function getPresetListById(id: string): PresetListDef | undefined {
  return PRESET_LISTS.find((l) => l.id === id);
}

export async function getPresetListItems(
  id: string
): Promise<PresetNormalizedMedia[]> {
  const cached = getCachedItems(id);
  if (cached) return cached;
  const def = getPresetListById(id);
  if (!def) return [];
  try {
    const items = await def.fetchItems();
    setCachedItems(id, items);
    return items;
  } catch (e) {
    console.error("getPresetListItems error:", id, e);
    return [];
  }
}
