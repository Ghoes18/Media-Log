import { db } from "./db";
import { media } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { searchTmdbMovies, searchTmdbTv, searchTmdbAnime } from "./tmdb";
import { searchSpotifyAlbums } from "./spotify";
import { searchOpenLibraryBooks } from "./openlibrary";

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

type SearchFn = (query: string, limit: number) => Promise<{ title: string; coverUrl: string; year?: string }[]>;

const SEARCH_BY_TYPE: Record<string, SearchFn[]> = {
  movie: [searchTmdbMovies],
  tv: [searchTmdbTv],
  anime: [searchTmdbAnime, searchTmdbTv],
  book: [searchOpenLibraryBooks],
  music: [searchSpotifyAlbums],
};

async function findCoverUrl(
  title: string,
  year: string,
  type: string,
): Promise<string> {
  const searchers = SEARCH_BY_TYPE[type];
  if (!searchers) return "";

  for (const searchFn of searchers) {
    try {
      const results = await searchFn(title, 5);
      if (!results?.length) continue;

      const normalTitle = normalize(title);
      const match =
        results.find(
          (r) => normalize(r.title) === normalTitle && r.coverUrl,
        ) ??
        results.find(
          (r) =>
            normalize(r.title) === normalTitle &&
            r.year === year &&
            r.coverUrl,
        ) ??
        results.find((r) => r.coverUrl);

      if (match?.coverUrl) return match.coverUrl;
    } catch {
      continue;
    }
  }

  return "";
}

export async function backfillMissingCovers(): Promise<void> {
  const missing = await db
    .select()
    .from(media)
    .where(
      sql`${media.coverUrl} IS NULL OR ${media.coverUrl} = ''`,
    );

  if (!missing.length) return;

  console.log(`[backfill] ${missing.length} media items missing cover images, attempting to fill…`);

  let filled = 0;

  for (const item of missing) {
    const coverUrl = await findCoverUrl(item.title, item.year ?? "", item.type);
    if (coverUrl) {
      await db
        .update(media)
        .set({ coverUrl })
        .where(eq(media.id, item.id));
      filled++;
    }
  }

  if (filled > 0) {
    console.log(`[backfill] Filled ${filled}/${missing.length} missing covers.`);
  } else {
    console.log(`[backfill] Could not resolve any missing covers (API keys may not be set).`);
  }
}
