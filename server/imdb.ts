/**
 * IMDb Top 250 integration.
 * Fetches from a public Cinemeta-style / curated source and normalizes to app media shape.
 */

const TOP250_URL =
  process.env.IMDB_TOP250_URL ||
  "https://raw.githubusercontent.com/movie-monk-b0t/top250/main/top250.json";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let cache: { items: NormalizedMedia[]; timestamp: number } | null = null;

export interface NormalizedMedia {
  externalId: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  synopsis: string;
  tags: string[];
  type: "movie";
  rating: string;
}

interface Top250RawItem {
  name?: string;
  url?: string;
  image?: string;
  description?: string;
  director?: { name?: string }[];
  creator?: { name?: string }[];
  genre?: string[];
  aggregateRating?: { ratingValue?: string | number };
  datePublished?: string;
}

function extractImdbId(url: string | undefined): string {
  if (!url || typeof url !== "string") return "";
  const match = url.match(/\/title\/(tt\d+)/);
  return match ? match[1] : "";
}

function mapRawToNormalized(raw: Top250RawItem): NormalizedMedia | null {
  const imdbId = extractImdbId(raw.url);
  if (!imdbId) return null;

  const director = raw.director?.[0];
  const creatorPerson = (raw.creator as { name?: string; "@type"?: string }[] | undefined)?.find(
    (c) => c?.name && c["@type"] === "Person"
  );
  const creator = (director?.name ?? creatorPerson?.name ?? "") || "Unknown";

  const year =
    typeof raw.datePublished === "string"
      ? raw.datePublished.slice(0, 4)
      : "";

  const rating =
    raw.aggregateRating?.ratingValue != null
      ? String(raw.aggregateRating.ratingValue)
      : "";

  return {
    externalId: imdbId,
    title: raw.name || "Unknown",
    creator,
    year,
    coverUrl: raw.image || "",
    synopsis: raw.description || "",
    tags: Array.isArray(raw.genre) ? raw.genre : [],
    type: "movie",
    rating,
  };
}

export async function getImdbTop250List(): Promise<NormalizedMedia[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.items;
  }

  try {
    const res = await fetch(TOP250_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`IMDb Top 250 fetch failed: ${res.status}`);
    }

    const data = (await res.json()) as Top250RawItem[] | unknown;
    const arr = Array.isArray(data) ? data : [];

    const items = arr
      .map((item) => mapRawToNormalized(item as Top250RawItem))
      .filter((m): m is NormalizedMedia => m != null && !!m.externalId);

    cache = { items, timestamp: Date.now() };
    return items;
  } catch (e) {
    console.error("getImdbTop250List error:", e);
    if (cache) return cache.items;
    return [];
  }
}

export function pickRandomFromImdbTop250(
  items: NormalizedMedia[]
): NormalizedMedia | null {
  if (items.length === 0) return null;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx] ?? null;
}

/** Returns IMDb rating (e.g. "8.5") for the given IMDb ID if it's in the Top 250 list. */
export async function getImdbRatingByImdbId(imdbId: string): Promise<string | null> {
  if (!imdbId || !/^tt\d+$/.test(imdbId)) return null;
  const items = await getImdbTop250List();
  const item = items.find((m) => m.externalId === imdbId);
  return item?.rating ?? null;
}
