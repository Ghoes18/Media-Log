import type { User, Media, Review, List, TierList, ListItem, TierListTier, TierListItem, ProfileSettings, Badge } from "@shared/schema";

let idCounter = 0;
function nextId(prefix = "id"): string {
  return `${prefix}-${++idCounter}`;
}

export function createUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? nextId("user");
  return {
    id,
    username: `user_${idCounter}`,
    displayName: `User ${idCounter}`,
    bio: "",
    avatarUrl: "",
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMedia(overrides: Partial<Media> = {}): Media {
  const id = overrides.id ?? nextId("media");
  return {
    id,
    type: "movie",
    title: `Media ${idCounter}`,
    creator: "",
    year: "",
    coverGradient: "from-slate-700 to-slate-900",
    coverUrl: "",
    synopsis: "",
    tags: [],
    rating: "",
    externalId: "",
    ...overrides,
  };
}

export function createReview(overrides: Partial<Review> = {}): Review {
  return {
    id: overrides.id ?? nextId("review"),
    userId: overrides.userId ?? "user-1",
    mediaId: overrides.mediaId ?? "media-1",
    seasonNumber: null,
    episodeNumber: null,
    rating: 5,
    body: "Great!",
    createdAt: new Date(),
    ...overrides,
  };
}

export function createList(overrides: Partial<List> = {}): List {
  return {
    id: overrides.id ?? nextId("list"),
    ownerId: overrides.ownerId ?? "user-1",
    name: `List ${idCounter}`,
    description: "",
    visibility: "public",
    isRanked: false,
    tags: [],
    sourceListId: null,
    shareToken: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createListItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: overrides.id ?? nextId("item"),
    listId: overrides.listId ?? "list-1",
    mediaId: overrides.mediaId ?? "media-1",
    addedByUserId: overrides.addedByUserId ?? "user-1",
    addedAt: new Date(),
    position: 0,
    note: null,
    ...overrides,
  };
}

export function createTierList(overrides: Partial<TierList> = {}): TierList {
  return {
    id: overrides.id ?? nextId("tier"),
    ownerId: overrides.ownerId ?? "user-1",
    name: `Tier List ${idCounter}`,
    description: "",
    visibility: "public",
    tags: [],
    isTemplate: false,
    sourceTierListId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTierListTier(overrides: Partial<TierListTier> = {}): TierListTier {
  return {
    id: overrides.id ?? nextId("tier-row"),
    tierListId: overrides.tierListId ?? "tier-1",
    label: `Tier ${idCounter}`,
    color: "#888",
    position: 0,
    ...overrides,
  };
}

export function createTierListItem(overrides: Partial<TierListItem> = {}): TierListItem {
  return {
    id: overrides.id ?? nextId("tier-item"),
    tierListId: overrides.tierListId ?? "tier-1",
    mediaId: overrides.mediaId ?? "media-1",
    tierId: overrides.tierId ?? "tier-row-1",
    addedByUserId: overrides.addedByUserId ?? "user-1",
    position: 0,
    note: null,
    addedAt: new Date(),
    ...overrides,
  };
}

export function createProfileSettings(overrides: Partial<ProfileSettings> = {}): ProfileSettings {
  return {
    userId: overrides.userId ?? "user-1",
    bannerUrl: null,
    bannerPosition: "center",
    themeAccent: "amber",
    themeCustomColor: null,
    layoutOrder: ["favorites", "watchlist", "activity"],
    avatarFrameId: null,
    pronouns: null,
    aboutMe: null,
    showBadges: true,
    profileCustomHtml: null,
    profileCustomCss: null,
    ...overrides,
  };
}

export function createBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: overrides.id ?? nextId("badge"),
    slug: `badge-${idCounter}`,
    name: `Badge ${idCounter}`,
    description: "",
    iconUrl: null,
    rarity: "common",
    category: "engagement",
    ...overrides,
  };
}
