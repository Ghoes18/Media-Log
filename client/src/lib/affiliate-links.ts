/**
 * Builds affiliate / partner links for a media item.
 * Uses VITE_AFFIL_* env vars for partner IDs.
 */

export type MediaForAffiliate = {
  type: string;
  title: string;
  creator?: string;
  /** OpenLibrary work key or author key */
  externalId?: string;
  /** From richDetails: ISBN, Spotify URL, etc. */
  isbn?: string;
  /** Spotify / external listen link (no affiliate) */
  externalUrl?: string;
};

export type AffiliateLink = {
  label: string;
  url: string;
  /** If true, open in new tab (default true for external) */
  external?: boolean;
};

const amazonTag = import.meta.env.VITE_AFFIL_AMAZON_TAG ?? "";
const bookshopId = import.meta.env.VITE_AFFIL_BOOKSHOP_ID ?? "";

export function buildAffiliateLinks(media: MediaForAffiliate): AffiliateLink[] {
  const links: AffiliateLink[] = [];
  const title = media.title || "";
  const creator = media.creator || "";
  const query = [title, creator].filter(Boolean).join(" ");

  switch (media.type) {
    case "book": {
      if (bookshopId && query) {
        links.push({
          label: "Bookshop.org",
          url: `https://bookshop.org/books?keywords=${encodeURIComponent(query)}&affiliateId=${encodeURIComponent(bookshopId)}`,
          external: true,
        });
      }
      if (amazonTag && query) {
        links.push({
          label: "Amazon",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`,
          external: true,
        });
      }
      if (media.isbn && amazonTag) {
        links.push({
          label: "Amazon (by ISBN)",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(media.isbn)}&tag=${encodeURIComponent(amazonTag)}`,
          external: true,
        });
      }
      break;
    }
    case "movie":
    case "tv":
    case "anime": {
      if (amazonTag && query) {
        links.push({
          label: "Amazon",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`,
          external: true,
        });
      }
      break;
    }
    case "music": {
      if (media.externalUrl) {
        links.push({
          label: "Listen on Spotify",
          url: media.externalUrl,
          external: true,
        });
      }
      if (amazonTag && query) {
        links.push({
          label: "Amazon Music",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`,
          external: true,
        });
      }
      break;
    }
    case "game": {
      if (amazonTag && query) {
        links.push({
          label: "Amazon",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`,
          external: true,
        });
      }
      break;
    }
    default:
      if (amazonTag && query) {
        links.push({
          label: "Amazon",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`,
          external: true,
        });
      }
  }

  return links;
}
