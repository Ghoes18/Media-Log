import { eq, and, desc, asc, sql, count, lt, or, ne, isNull, ilike, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  media,
  reviews,
  watchlist,
  favorites,
  follows,
  reviewLikes,
  mediaLikes,
  watched,
  profileSettings,
  badges,
  userBadges,
  subscriptions,
  conversations,
  messages,
  lists,
  listItems,
  listCollaborators,
  listInvitations,
  listLikes,
  listComments,
  presetListLikes,
  presetListComments,
  userPresetProgress,
  tierLists,
  tierListTiers,
  tierListItems,
  tierListCollaborators,
  tierListInvitations,
  tierListLikes,
  tierListComments,
  type User,
  type InsertUser,
  type Media,
  type InsertMedia,
  type Review,
  type InsertReview,
  type ProfileSettings,
  type Badge,
  type Conversation,
  type Message,
  type List,
  type ListItem,
  type ListCollaborator,
  type ListInvitation,
  type ListComment,
  type PresetListComment,
  type TierList,
  type TierListTier,
  type TierListItem,
  type TierListCollaborator,
  type TierListInvitation,
  type TierListComment,
} from "@shared/schema";

export interface ConversationWithDetails extends Conversation {
  otherUser: User;
  lastMessage: { body: string; senderId: string; createdAt: Date } | null;
  unreadCount: number;
}

type UserStub = Pick<User, "id" | "username" | "displayName" | "avatarUrl">;

export interface ListWithMeta extends List {
  owner: UserStub;
  itemCount: number;
  collaboratorCount: number;
  isCollaborator: boolean;
  likeCount?: number;
  commentCount?: number;
  coverUrls?: string[];
}

export interface ListItemWithDetails extends ListItem {
  media: Media;
  addedBy: UserStub;
}

export interface ListInvitationWithDetails extends ListInvitation {
  list: Pick<List, "id" | "name">;
  invitedBy: UserStub;
}

export interface TierListWithMeta extends TierList {
  owner: UserStub;
  itemCount: number;
  collaboratorCount: number;
  isCollaborator: boolean;
  likeCount?: number;
  commentCount?: number;
  coverUrls?: string[];
}

export interface TierListItemWithDetails extends TierListItem {
  media: Media;
  addedBy: UserStub;
}

export interface TierListDetail extends TierList {
  owner: UserStub | null;
  tiers: (TierListTier & { items: TierListItemWithDetails[] })[];
  unassignedItems: TierListItemWithDetails[];
  collaborators: (TierListCollaborator & { user: UserStub })[];
  invitations: (TierListInvitation & { invitedUser: UserStub })[];
  isOwner: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface TierListInvitationWithDetails extends TierListInvitation {
  tierList: Pick<TierList, "id" | "name">;
  invitedBy: UserStub;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "displayName" | "bio" | "avatarUrl">>): Promise<User>;

  getAllMedia(): Promise<Media[]>;
  getMediaById(id: string): Promise<Media | undefined>;
  getMediaByType(type: string): Promise<Media[]>;
  createMedia(m: InsertMedia): Promise<Media>;
  searchMedia(query: string): Promise<Media[]>;

  getReviewsForMedia(
    mediaId: string,
    filters?: { seasonNumber?: number; episodeNumber?: number },
  ): Promise<
    (Review & { user: User; likeCount: number })[]
  >;
  getReviewsByUser(userId: string): Promise<
    (Review & { media: Media; likeCount: number })[]
  >;
  getRecentReviews(limit?: number): Promise<
    (Review & { user: User; media: Media; likeCount: number })[]
  >;
  createReview(r: InsertReview): Promise<Review>;

  getWatchlist(userId: string): Promise<Media[]>;
  addToWatchlist(userId: string, mediaId: string): Promise<void>;
  removeFromWatchlist(userId: string, mediaId: string): Promise<void>;
  isOnWatchlist(userId: string, mediaId: string): Promise<boolean>;

  getFavorites(userId: string): Promise<Media[]>;
  setFavorites(userId: string, mediaIds: string[]): Promise<void>;

  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  follow(followerId: string, followingId: string): Promise<void>;
  unfollow(followerId: string, followingId: string): Promise<void>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;

  likeReview(userId: string, reviewId: string): Promise<void>;
  unlikeReview(userId: string, reviewId: string): Promise<void>;
  hasLikedReview(userId: string, reviewId: string): Promise<boolean>;

  getProfileStats(userId: string): Promise<{
    reviews: number;
    followers: number;
    following: number;
  }>;

  getOrCreateAppUser(
    authUserId: string,
    data: { name?: string | null; email?: string | null },
  ): Promise<User>;

  getTopReviewers(limit?: number): Promise<(User & { reviewCount: number })[]>;
  getPopularReviews(limit?: number): Promise<(Review & { user: User; media: Media; likeCount: number })[]>;

  getMediaByExternalId(externalId: string, type: string): Promise<Media | undefined>;
  ensureMedia(data: InsertMedia): Promise<Media>;

  addWatched(userId: string, mediaId: string): Promise<void>;
  removeWatched(userId: string, mediaId: string): Promise<void>;
  isWatched(userId: string, mediaId: string): Promise<boolean>;

  likeMedia(userId: string, mediaId: string): Promise<void>;
  unlikeMedia(userId: string, mediaId: string): Promise<void>;
  hasLikedMedia(userId: string, mediaId: string): Promise<boolean>;

  getMediaStats(mediaId: string): Promise<{ watched: number; likes: number; listed: number; averageRating: number | null; reviewCount: number }>;

  getProfileSettings(userId: string): Promise<ProfileSettings | undefined>;
  updateProfileSettings(userId: string, data: Partial<ProfileSettings>): Promise<ProfileSettings>;
  getUserSubscription(userId: string): Promise<{ status: "free" | "pro" }>;
  getBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<(Badge & { earnedAt: Date })[]>;
  seedBadgesIfEmpty(): Promise<void>;

  // Lists
  createList(ownerId: string, data: { name: string; description?: string; visibility?: string; isRanked?: boolean; tags?: string[] }): Promise<List>;
  getList(id: string): Promise<List | undefined>;
  getUserLists(userId: string): Promise<ListWithMeta[]>;
  updateList(id: string, data: Partial<Pick<List, "name" | "description" | "visibility" | "isRanked" | "tags">>): Promise<List>;
  deleteList(id: string): Promise<void>;

  // List items
  addListItem(listId: string, mediaId: string, addedByUserId: string, note?: string): Promise<ListItem>;
  removeListItem(listId: string, mediaId: string): Promise<void>;
  reorderListItems(listId: string, itemIds: string[]): Promise<void>;
  updateListItemNote(listId: string, mediaId: string, note: string | null): Promise<void>;
  getListItems(listId: string): Promise<ListItemWithDetails[]>;

  // List likes
  likeList(userId: string, listId: string): Promise<void>;
  unlikeList(userId: string, listId: string): Promise<void>;
  hasLikedList(userId: string, listId: string): Promise<boolean>;
  getListLikeCount(listId: string): Promise<number>;

  // List comments
  getListComments(listId: string): Promise<(ListComment & { user: UserStub })[]>;
  createListComment(listId: string, userId: string, body: string): Promise<ListComment>;
  deleteListComment(commentId: string, userId: string): Promise<void>;
  getListCommentCount(listId: string): Promise<number>;

  // Public lists
  getPublicLists(options: { sort?: "popular" | "recent"; page?: number; limit?: number }): Promise<ListWithMeta[]>;

  // Collaborators
  getListCollaborators(listId: string): Promise<(ListCollaborator & { user: UserStub })[]>;
  removeListCollaborator(listId: string, userId: string): Promise<void>;

  // Invitations
  createInvitation(listId: string, invitedUserId: string, invitedByUserId: string): Promise<ListInvitation>;
  getInvitationsForUser(userId: string): Promise<ListInvitationWithDetails[]>;
  getListInvitations(listId: string): Promise<(ListInvitation & { invitedUser: UserStub })[]>;
  respondToInvitation(id: string, userId: string, status: "accepted" | "declined"): Promise<ListInvitation>;
  getPendingInvitationCount(userId: string): Promise<number>;

  // Tier lists
  createTierList(ownerId: string, data: { name: string; description?: string; visibility?: string; tags?: string[] }): Promise<TierList>;
  getTierList(id: string): Promise<TierList | undefined>;
  getUserTierLists(userId: string): Promise<TierListWithMeta[]>;
  updateTierList(id: string, data: Partial<Pick<TierList, "name" | "description" | "visibility" | "tags">>): Promise<TierList>;
  deleteTierList(id: string): Promise<void>;
  getTierListDetail(id: string, appUserId?: string | null): Promise<TierListDetail | undefined>;

  // Tier list tiers
  createTier(tierListId: string, data: { label: string; color?: string; position?: number }): Promise<TierListTier>;
  updateTier(tierId: string, data: { label?: string; color?: string; position?: number }): Promise<TierListTier>;
  deleteTier(tierId: string): Promise<void>;
  reorderTiers(tierListId: string, tierIds: string[]): Promise<void>;
  ensureDefaultTiers(tierListId: string): Promise<void>;

  // Tier list items
  addTierListItem(tierListId: string, mediaId: string, addedByUserId: string, tierId?: string | null, position?: number, note?: string): Promise<TierListItem>;
  removeTierListItem(tierListId: string, itemId: string): Promise<void>;
  moveTierListItem(itemId: string, toTierId: string | null, toPosition: number): Promise<void>;
  updateTierListItemNote(tierListId: string, itemId: string, note: string | null): Promise<void>;
  getTierListItems(tierListId: string): Promise<TierListItemWithDetails[]>;

  // Tier list likes
  likeTierList(userId: string, tierListId: string): Promise<void>;
  unlikeTierList(userId: string, tierListId: string): Promise<void>;
  hasLikedTierList(userId: string, tierListId: string): Promise<boolean>;
  getTierListLikeCount(tierListId: string): Promise<number>;

  // Tier list comments
  getTierListComments(tierListId: string): Promise<(TierListComment & { user: UserStub })[]>;
  createTierListComment(tierListId: string, userId: string, body: string): Promise<TierListComment>;
  deleteTierListComment(commentId: string, userId: string): Promise<void>;
  getTierListCommentCount(tierListId: string): Promise<number>;

  // Tier list public
  getPublicTierLists(options: { sort?: "popular" | "recent"; page?: number; limit?: number }): Promise<TierListWithMeta[]>;

  // Tier list collaborators
  getTierListCollaborators(tierListId: string): Promise<(TierListCollaborator & { user: UserStub })[]>;
  removeTierListCollaborator(tierListId: string, userId: string): Promise<void>;

  // Tier list invitations
  createTierListInvitation(tierListId: string, invitedUserId: string, invitedByUserId: string): Promise<TierListInvitation>;
  getTierListInvitationsForUser(userId: string): Promise<TierListInvitationWithDetails[]>;
  getTierListInvitations(tierListId: string): Promise<(TierListInvitation & { invitedUser: UserStub })[]>;
  respondToTierListInvitation(id: string, userId: string, status: "accepted" | "declined"): Promise<TierListInvitation>;
  getPendingTierListInvitationCount(userId: string): Promise<number>;

  // Preset list social (presetListId is slug e.g. "imdb-top-250")
  likePresetList(userId: string, presetListId: string): Promise<void>;
  unlikePresetList(userId: string, presetListId: string): Promise<void>;
  hasLikedPresetList(userId: string, presetListId: string): Promise<boolean>;
  getPresetListLikeCount(presetListId: string): Promise<number>;
  getPresetListComments(presetListId: string): Promise<(PresetListComment & { user: UserStub })[]>;
  createPresetListComment(presetListId: string, userId: string, body: string): Promise<PresetListComment>;
  deletePresetListComment(commentId: string, userId: string): Promise<void>;
  getPresetListCommentCount(presetListId: string): Promise<number>;
  markPresetProgress(userId: string, presetListId: string, externalId: string): Promise<void>;
  unmarkPresetProgress(userId: string, presetListId: string, externalId: string): Promise<void>;
  getUserPresetProgress(userId: string, presetListId: string): Promise<Set<string>>;

  // User search
  searchUsers(query: string, excludeUserId?: string): Promise<UserStub[]>;

  // DM methods
  getConversationsForUser(userId: string, status?: string): Promise<ConversationWithDetails[]>;
  getOrCreateConversation(userId: string, recipientId: string): Promise<Conversation>;
  getConversationById(id: string): Promise<Conversation | undefined>;
  getMessages(conversationId: string, before?: Date, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(conversationId: string, senderId: string, body: string): Promise<Message>;
  acceptConversation(conversationId: string, userId: string): Promise<Conversation>;
  declineConversation(conversationId: string, userId: string): Promise<Conversation>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  getRequestMessageCount(conversationId: string, senderId: string): Promise<number>;
}

function slugUsername(name: string | undefined | null, email: string | undefined | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 30) || "user";
  }
  if (email) {
    const local = email.split("@")[0]?.trim();
    return (local?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)) || "user";
  }
  return "user";
}

class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Pick<User, "displayName" | "bio" | "avatarUrl">>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getAllMedia(): Promise<Media[]> {
    return db.select().from(media);
  }

  async getMediaById(id: string): Promise<Media | undefined> {
    const [m] = await db.select().from(media).where(eq(media.id, id));
    return m;
  }

  async getMediaByType(type: string): Promise<Media[]> {
    return db.select().from(media).where(eq(media.type, type));
  }

  async createMedia(m: InsertMedia): Promise<Media> {
    const [created] = await db.insert(media).values(m).returning();
    return created;
  }

  async searchMedia(query: string): Promise<Media[]> {
    const pattern = `%${query.toLowerCase()}%`;
    return db
      .select()
      .from(media)
      .where(
        sql`lower(${media.title}) like ${pattern} or lower(${media.creator}) like ${pattern}`,
      );
  }

  async getReviewsForMedia(
    mediaId: string,
    filters?: { seasonNumber?: number; episodeNumber?: number },
  ): Promise<(Review & { user: User; likeCount: number })[]> {
    const whereClauses = [eq(reviews.mediaId, mediaId)];
    if (filters?.seasonNumber != null) {
      whereClauses.push(eq(reviews.seasonNumber, filters.seasonNumber));
    }
    if (filters?.episodeNumber != null) {
      whereClauses.push(eq(reviews.episodeNumber, filters.episodeNumber));
    }

    const rows = await db
      .select({
        review: reviews,
        user: users,
        likeCount: sql<number>`coalesce(count(${reviewLikes.reviewId}), 0)::int`,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .leftJoin(reviewLikes, eq(reviewLikes.reviewId, reviews.id))
      .where(and(...whereClauses))
      .groupBy(reviews.id, users.id)
      .orderBy(desc(reviews.createdAt));

    return rows.map((r) => ({
      ...r.review,
      user: r.user,
      likeCount: r.likeCount,
    }));
  }

  async getReviewsByUser(
    userId: string,
  ): Promise<(Review & { media: Media; likeCount: number })[]> {
    const rows = await db
      .select({
        review: reviews,
        media: media,
        likeCount: sql<number>`coalesce(count(${reviewLikes.reviewId}), 0)::int`,
      })
      .from(reviews)
      .innerJoin(media, eq(reviews.mediaId, media.id))
      .leftJoin(reviewLikes, eq(reviewLikes.reviewId, reviews.id))
      .where(eq(reviews.userId, userId))
      .groupBy(reviews.id, media.id)
      .orderBy(desc(reviews.createdAt));

    return rows.map((r) => ({
      ...r.review,
      media: r.media,
      likeCount: r.likeCount,
    }));
  }

  async getRecentReviews(
    limit = 20,
  ): Promise<(Review & { user: User; media: Media; likeCount: number })[]> {
    const rows = await db
      .select({
        review: reviews,
        user: users,
        media: media,
        likeCount: sql<number>`coalesce(count(${reviewLikes.reviewId}), 0)::int`,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(media, eq(reviews.mediaId, media.id))
      .leftJoin(reviewLikes, eq(reviewLikes.reviewId, reviews.id))
      .groupBy(reviews.id, users.id, media.id)
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r.review,
      user: r.user,
      media: r.media,
      likeCount: r.likeCount,
    }));
  }

  async createReview(r: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(r).returning();
    return created;
  }

  async getWatchlist(userId: string): Promise<Media[]> {
    const rows = await db
      .select({ media })
      .from(watchlist)
      .innerJoin(media, eq(watchlist.mediaId, media.id))
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt));
    return rows.map((r) => r.media);
  }

  async addToWatchlist(userId: string, mediaId: string): Promise<void> {
    await db
      .insert(watchlist)
      .values({ userId, mediaId })
      .onConflictDoNothing();
  }

  async removeFromWatchlist(userId: string, mediaId: string): Promise<void> {
    await db
      .delete(watchlist)
      .where(
        and(eq(watchlist.userId, userId), eq(watchlist.mediaId, mediaId)),
      );
  }

  async isOnWatchlist(userId: string, mediaId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(watchlist)
      .where(
        and(eq(watchlist.userId, userId), eq(watchlist.mediaId, mediaId)),
      );
    return !!row;
  }

  async getFavorites(userId: string): Promise<Media[]> {
    const rows = await db
      .select({ media })
      .from(favorites)
      .innerJoin(media, eq(favorites.mediaId, media.id))
      .where(eq(favorites.userId, userId))
      .orderBy(favorites.position);
    return rows.map((r) => r.media);
  }

  async setFavorites(userId: string, mediaIds: string[]): Promise<void> {
    await db.delete(favorites).where(eq(favorites.userId, userId));
    if (mediaIds.length > 0) {
      await db.insert(favorites).values(
        mediaIds.map((mediaId, i) => ({
          userId,
          mediaId,
          position: i,
        })),
      );
    }
  }

  async isFollowing(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const [row] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      );
    return !!row;
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    await db
      .insert(follows)
      .values({ followerId, followingId })
      .onConflictDoNothing();
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      );
  }

  async getFollowerCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    return row?.c ?? 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));
    return row?.c ?? 0;
  }

  async likeReview(userId: string, reviewId: string): Promise<void> {
    await db
      .insert(reviewLikes)
      .values({ userId, reviewId })
      .onConflictDoNothing();
  }

  async unlikeReview(userId: string, reviewId: string): Promise<void> {
    await db
      .delete(reviewLikes)
      .where(
        and(
          eq(reviewLikes.userId, userId),
          eq(reviewLikes.reviewId, reviewId),
        ),
      );
  }

  async hasLikedReview(userId: string, reviewId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(reviewLikes)
      .where(
        and(
          eq(reviewLikes.userId, userId),
          eq(reviewLikes.reviewId, reviewId),
        ),
      );
    return !!row;
  }

  async getProfileStats(
    userId: string,
  ): Promise<{ reviews: number; followers: number; following: number }> {
    const [reviewCount] = await db
      .select({ c: count() })
      .from(reviews)
      .where(eq(reviews.userId, userId));
    const followerCount = await this.getFollowerCount(userId);
    const followingCount = await this.getFollowingCount(userId);
    return {
      reviews: reviewCount?.c ?? 0,
      followers: followerCount,
      following: followingCount,
    };
  }

  async getOrCreateAppUser(
    authUserId: string,
    data: { name?: string | null; email?: string | null },
  ): Promise<User> {
    const existing = await this.getUser(authUserId);
    if (existing) return existing;

    let baseUsername = slugUsername(data.name, data.email);
    let username = baseUsername;
    let n = 1;
    while (await this.getUserByUsername(username)) {
      username = `${baseUsername}-${n}`;
      n += 1;
    }

    const displayName = (data.name?.trim() || data.email?.split("@")[0] || "User").slice(0, 100);
    const [user] = await db
      .insert(users)
      .values({
        id: authUserId,
        username,
        displayName,
        bio: "",
        avatarUrl: "",
      })
      .returning();
    return user;
  }

  async getTopReviewers(
    limit = 5,
  ): Promise<(User & { reviewCount: number })[]> {
    const rows = await db
      .select({
        user: users,
        reviewCount: sql<number>`count(${reviews.id})::int`,
      })
      .from(users)
      .innerJoin(reviews, eq(reviews.userId, users.id))
      .groupBy(users.id)
      .orderBy(sql`count(${reviews.id}) desc`)
      .limit(limit);

    return rows.map((r) => ({
      ...r.user,
      reviewCount: r.reviewCount,
    }));
  }

  async getPopularReviews(
    limit = 10,
  ): Promise<(Review & { user: User; media: Media; likeCount: number })[]> {
    const rows = await db
      .select({
        review: reviews,
        user: users,
        media: media,
        likeCount: sql<number>`coalesce(count(${reviewLikes.reviewId}), 0)::int`,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(media, eq(reviews.mediaId, media.id))
      .leftJoin(reviewLikes, eq(reviewLikes.reviewId, reviews.id))
      .groupBy(reviews.id, users.id, media.id)
      .orderBy(sql`coalesce(count(${reviewLikes.reviewId}), 0) desc`, desc(reviews.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r.review,
      user: r.user,
      media: r.media,
      likeCount: r.likeCount,
    }));
  }

  async getMediaByExternalId(externalId: string, type: string): Promise<Media | undefined> {
    if (!externalId) return undefined;
    const [m] = await db
      .select()
      .from(media)
      .where(and(eq(media.externalId, externalId), eq(media.type, type)));
    return m;
  }

  async ensureMedia(data: InsertMedia): Promise<Media> {
    const extId = data.externalId ?? "";
    const type = data.type;
    if (extId && type) {
      const existing = await this.getMediaByExternalId(extId, type);
      if (existing) return existing;
    }
    const insertData = {
      ...data,
      coverGradient: data.coverGradient || "from-slate-700 to-slate-900",
    };
    return this.createMedia(insertData);
  }

  async addWatched(userId: string, mediaId: string): Promise<void> {
    await db
      .insert(watched)
      .values({ userId, mediaId })
      .onConflictDoNothing();
  }

  async removeWatched(userId: string, mediaId: string): Promise<void> {
    await db
      .delete(watched)
      .where(and(eq(watched.userId, userId), eq(watched.mediaId, mediaId)));
  }

  async isWatched(userId: string, mediaId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(watched)
      .where(and(eq(watched.userId, userId), eq(watched.mediaId, mediaId)));
    return !!row;
  }

  async likeMedia(userId: string, mediaId: string): Promise<void> {
    await db
      .insert(mediaLikes)
      .values({ userId, mediaId })
      .onConflictDoNothing();
  }

  async unlikeMedia(userId: string, mediaId: string): Promise<void> {
    await db
      .delete(mediaLikes)
      .where(and(eq(mediaLikes.userId, userId), eq(mediaLikes.mediaId, mediaId)));
  }

  async hasLikedMedia(userId: string, mediaId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(mediaLikes)
      .where(and(eq(mediaLikes.userId, userId), eq(mediaLikes.mediaId, mediaId)));
    return !!row;
  }

  async getMediaStats(mediaId: string): Promise<{ watched: number; likes: number; listed: number; averageRating: number | null; reviewCount: number }> {
    const [watchedCount] = await db
      .select({ c: count() })
      .from(watched)
      .where(eq(watched.mediaId, mediaId));
    const [likesCount] = await db
      .select({ c: count() })
      .from(mediaLikes)
      .where(eq(mediaLikes.mediaId, mediaId));
    const [listedCount] = await db
      .select({ c: count() })
      .from(watchlist)
      .where(eq(watchlist.mediaId, mediaId));
    const [reviewStats] = await db
      .select({ avg: sql<number>`avg(${reviews.rating})`, c: count() })
      .from(reviews)
      .where(eq(reviews.mediaId, mediaId));
    const avg = reviewStats?.avg != null ? Number(reviewStats.avg) : null;
    return {
      watched: watchedCount?.c ?? 0,
      likes: likesCount?.c ?? 0,
      listed: listedCount?.c ?? 0,
      averageRating: avg != null && Number.isFinite(avg) ? avg : null,
      reviewCount: reviewStats?.c ?? 0,
    };
  }

  async getProfileSettings(userId: string): Promise<ProfileSettings | undefined> {
    const [row] = await db
      .select()
      .from(profileSettings)
      .where(eq(profileSettings.userId, userId));
    return row;
  }

  async updateProfileSettings(
    userId: string,
    data: Partial<Omit<ProfileSettings, "userId">>
  ): Promise<ProfileSettings> {
    const setData: Record<string, unknown> = {};
    const keys: (keyof Omit<ProfileSettings, "userId">)[] = [
      "bannerUrl", "bannerPosition", "themeAccent", "themeCustomColor",
      "layoutOrder", "avatarFrameId", "pronouns", "aboutMe", "showBadges",
    ];
    for (const k of keys) {
      if (data[k] !== undefined) setData[k] = data[k];
    }
    const defaults = {
      bannerUrl: null,
      bannerPosition: "center",
      themeAccent: "amber",
      themeCustomColor: null,
      layoutOrder: ["favorites", "watchlist", "activity"],
      avatarFrameId: null,
      pronouns: null,
      aboutMe: null,
      showBadges: true,
    };
    if (Object.keys(setData).length === 0) {
      await db.insert(profileSettings).values({ userId, ...defaults }).onConflictDoNothing();
      const existing = await this.getProfileSettings(userId);
      return existing!;
    }
    const [updated] = await db
      .insert(profileSettings)
      .values({ userId, ...defaults, ...data })
      .onConflictDoUpdate({
        target: profileSettings.userId,
        set: setData as Record<string, unknown>,
      })
      .returning();
    return updated!;
  }

  async getUserSubscription(userId: string): Promise<{ status: "free" | "pro" }> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    const status = (row?.status === "pro" || row?.status === "monthly" || row?.status === "yearly")
      ? "pro"
      : "free";
    return { status };
  }

  async getBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(badges.slug);
  }

  async getUserBadges(userId: string): Promise<(Badge & { earnedAt: Date })[]> {
    const rows = await db
      .select({ badge: badges, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(userBadges.earnedAt);
    return rows.map((r) => ({ ...r.badge, earnedAt: r.earnedAt }));
  }

  async getConversationsForUser(userId: string, status?: string): Promise<ConversationWithDetails[]> {
    const rows = await db
      .select({
        conversation: conversations,
        participant1: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(conversations)
      .innerJoin(users, or(
        and(eq(conversations.participant1Id, userId), eq(users.id, conversations.participant2Id)),
        and(eq(conversations.participant2Id, userId), eq(users.id, conversations.participant1Id)),
      ))
      .where(
        and(
          or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)),
          status ? eq(conversations.status, status) : undefined,
          ne(conversations.status, "declined"),
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    const results: ConversationWithDetails[] = [];
    for (const row of rows) {
      const lastMsg = await db
        .select({ body: messages.body, senderId: messages.senderId, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.conversationId, row.conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const unreadResult = await db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, row.conversation.id),
            ne(messages.senderId, userId),
            isNull(messages.readAt),
          ),
        );

      results.push({
        ...row.conversation,
        otherUser: row.participant1 as unknown as User,
        lastMessage: lastMsg[0] ?? null,
        unreadCount: unreadResult[0]?.count ?? 0,
      });
    }
    return results;
  }

  async getOrCreateConversation(userId: string, recipientId: string): Promise<Conversation> {
    const p1 = userId < recipientId ? userId : recipientId;
    const p2 = userId < recipientId ? recipientId : userId;

    const existing = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.participant1Id, p1), eq(conversations.participant2Id, p2)))
      .limit(1);

    if (existing[0]) return existing[0];

    const [ab, ba] = await Promise.all([
      this.isFollowing(userId, recipientId),
      this.isFollowing(recipientId, userId),
    ]);
    const isMutual = ab && ba;
    const status = isMutual ? "active" : "request";

    const inserted = await db
      .insert(conversations)
      .values({
        participant1Id: p1,
        participant2Id: p2,
        status,
        requestedById: isMutual ? null : userId,
      })
      .returning();
    return inserted[0];
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return rows[0];
  }

  async getMessages(conversationId: string, before?: Date, limit = 50): Promise<(Message & { sender: User })[]> {
    const rows = await db
      .select({ message: messages, sender: users })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          before ? lt(messages.createdAt, before) : undefined,
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r.message, sender: r.sender })).reverse();
  }

  async createMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
    const conv = await this.getConversationById(conversationId);
    if (!conv) throw new Error("Conversation not found");

    if (conv.status === "request" && conv.requestedById === senderId) {
      const msgCount = await this.getRequestMessageCount(conversationId, senderId);
      if (msgCount >= 3) {
        throw new Error("MESSAGE_LIMIT_REACHED");
      }
    }

    const inserted = await db
      .insert(messages)
      .values({ conversationId, senderId, body })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: inserted[0].createdAt })
      .where(eq(conversations.id, conversationId));

    return inserted[0];
  }

  async acceptConversation(conversationId: string, userId: string): Promise<Conversation> {
    const conv = await this.getConversationById(conversationId);
    if (!conv) throw new Error("Conversation not found");
    if (conv.requestedById === userId) throw new Error("Cannot accept your own request");
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) throw new Error("Not a participant");

    const updated = await db
      .update(conversations)
      .set({ status: "active" })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated[0];
  }

  async declineConversation(conversationId: string, userId: string): Promise<Conversation> {
    const conv = await this.getConversationById(conversationId);
    if (!conv) throw new Error("Conversation not found");
    if (conv.requestedById === userId) throw new Error("Cannot decline your own request");
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) throw new Error("Not a participant");

    const updated = await db
      .update(conversations)
      .set({ status: "declined" })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated[0];
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
          isNull(messages.readAt),
        ),
      );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)),
          eq(conversations.status, "active"),
          ne(messages.senderId, userId),
          isNull(messages.readAt),
        ),
      );
    return result[0]?.count ?? 0;
  }

  async getRequestMessageCount(conversationId: string, senderId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.senderId, senderId)));
    return result[0]?.count ?? 0;
  }

  async createList(ownerId: string, data: { name: string; description?: string; visibility?: string; isRanked?: boolean; tags?: string[] }): Promise<List> {
    const [list] = await db.insert(lists).values({
      ownerId,
      name: data.name,
      description: data.description ?? "",
      visibility: data.visibility ?? "private",
      isRanked: data.isRanked ?? false,
      tags: data.tags ?? [],
    }).returning();
    return list;
  }

  async getList(id: string): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    return list;
  }

  async getUserLists(userId: string): Promise<ListWithMeta[]> {
    const allLists: ListWithMeta[] = [];
    const listIds: string[] = [];

    // owned lists
    const ownedRows = await db
      .select({
        list: lists,
        owner: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
        itemCount: sql<number>`(select count(*) from list_items where list_items.list_id = ${lists.id})::int`,
        collaboratorCount: sql<number>`(select count(*) from list_collaborators where list_collaborators.list_id = ${lists.id})::int`,
      })
      .from(lists)
      .innerJoin(users, eq(lists.ownerId, users.id))
      .where(eq(lists.ownerId, userId))
      .orderBy(desc(lists.createdAt));

    // collaborated lists
    const collabRows = await db
      .select({
        list: lists,
        owner: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
        itemCount: sql<number>`(select count(*) from list_items where list_items.list_id = ${lists.id})::int`,
        collaboratorCount: sql<number>`(select count(*) from list_collaborators where list_collaborators.list_id = ${lists.id})::int`,
      })
      .from(listCollaborators)
      .innerJoin(lists, eq(listCollaborators.listId, lists.id))
      .innerJoin(users, eq(lists.ownerId, users.id))
      .where(eq(listCollaborators.userId, userId))
      .orderBy(desc(lists.createdAt));

    for (const r of ownedRows) {
      allLists.push({
        ...r.list,
        owner: r.owner as UserStub,
        itemCount: r.itemCount,
        collaboratorCount: r.collaboratorCount,
        isCollaborator: false,
      });
      listIds.push(r.list.id);
    }
    for (const r of collabRows) {
      if (!listIds.includes(r.list.id)) {
        allLists.push({
          ...r.list,
          owner: r.owner as UserStub,
          itemCount: r.itemCount,
          collaboratorCount: r.collaboratorCount,
          isCollaborator: true,
        });
        listIds.push(r.list.id);
      }
    }

    if (listIds.length === 0) return allLists;

    const likeCounts = await Promise.all(listIds.map((lid) => this.getListLikeCount(lid)));
    const commentCounts = await Promise.all(listIds.map((lid) => this.getListCommentCount(lid)));
    const coverUrlsByList = await this.getListCoverUrls(listIds);

    return allLists.map((l, i) => ({
      ...l,
      likeCount: likeCounts[i],
      commentCount: commentCounts[i],
      coverUrls: coverUrlsByList[l.id] ?? [],
    }));
  }

  async updateList(id: string, data: Partial<Pick<List, "name" | "description" | "visibility" | "isRanked" | "tags">>): Promise<List> {
    const [updated] = await db.update(lists).set(data).where(eq(lists.id, id)).returning();
    if (!updated) throw new Error("List not found");
    return updated;
  }

  async deleteList(id: string): Promise<void> {
    await db.delete(lists).where(eq(lists.id, id));
  }

  async addListItem(listId: string, mediaId: string, addedByUserId: string, note?: string): Promise<ListItem> {
    const existing = await db
      .select()
      .from(listItems)
      .where(and(eq(listItems.listId, listId), eq(listItems.mediaId, mediaId)));
    if (existing[0]) return existing[0];
    const [maxPos] = await db
      .select({ max: sql<number>`coalesce(max(${listItems.position}), -1)` })
      .from(listItems)
      .where(eq(listItems.listId, listId));
    const nextPosition = (maxPos?.max ?? -1) + 1;
    const [item] = await db.insert(listItems).values({
      listId,
      mediaId,
      addedByUserId,
      position: nextPosition,
      note: note ?? null,
    }).returning();
    return item;
  }

  async removeListItem(listId: string, mediaId: string): Promise<void> {
    await db.delete(listItems).where(and(eq(listItems.listId, listId), eq(listItems.mediaId, mediaId)));
  }

  async reorderListItems(listId: string, itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      const mediaId = itemIds[i];
      await db
        .update(listItems)
        .set({ position: i })
        .where(and(eq(listItems.listId, listId), eq(listItems.mediaId, mediaId)));
    }
  }

  async updateListItemNote(listId: string, mediaId: string, note: string | null): Promise<void> {
    await db
      .update(listItems)
      .set({ note })
      .where(and(eq(listItems.listId, listId), eq(listItems.mediaId, mediaId)));
  }

  private async getListCoverUrls(listIds: string[]): Promise<Record<string, string[]>> {
    if (listIds.length === 0) return {};
    const rows = await db
      .select({
        listId: listItems.listId,
        coverUrl: media.coverUrl,
        position: listItems.position,
      })
      .from(listItems)
      .innerJoin(media, eq(listItems.mediaId, media.id))
      .where(inArray(listItems.listId, listIds))
      .orderBy(asc(listItems.position));
    const result: Record<string, string[]> = {};
    for (const r of rows) {
      if (!result[r.listId]) result[r.listId] = [];
      if (result[r.listId].length < 5 && r.coverUrl) result[r.listId].push(r.coverUrl);
    }
    return result;
  }

  async likeList(userId: string, listId: string): Promise<void> {
    await db.insert(listLikes).values({ userId, listId }).onConflictDoNothing();
  }

  async unlikeList(userId: string, listId: string): Promise<void> {
    await db.delete(listLikes).where(and(eq(listLikes.userId, userId), eq(listLikes.listId, listId)));
  }

  async hasLikedList(userId: string, listId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(listLikes)
      .where(and(eq(listLikes.userId, userId), eq(listLikes.listId, listId)));
    return !!row;
  }

  async getListLikeCount(listId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(listLikes)
      .where(eq(listLikes.listId, listId));
    return row?.count ?? 0;
  }

  async getListComments(listId: string): Promise<(ListComment & { user: UserStub })[]> {
    const rows = await db
      .select({
        comment: listComments,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(listComments)
      .innerJoin(users, eq(listComments.userId, users.id))
      .where(eq(listComments.listId, listId))
      .orderBy(asc(listComments.createdAt));
    return rows.map((r) => ({ ...r.comment, user: r.user as UserStub }));
  }

  async createListComment(listId: string, userId: string, body: string): Promise<ListComment> {
    const [comment] = await db.insert(listComments).values({ listId, userId, body }).returning();
    return comment;
  }

  async deleteListComment(commentId: string, userId: string): Promise<void> {
    const [comment] = await db.select().from(listComments).where(eq(listComments.id, commentId));
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");
    await db.delete(listComments).where(eq(listComments.id, commentId));
  }

  async getListCommentCount(listId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(listComments)
      .where(eq(listComments.listId, listId));
    return row?.count ?? 0;
  }

  async likePresetList(userId: string, presetListId: string): Promise<void> {
    await db.insert(presetListLikes).values({ userId, presetListId }).onConflictDoNothing();
  }

  async unlikePresetList(userId: string, presetListId: string): Promise<void> {
    await db
      .delete(presetListLikes)
      .where(and(eq(presetListLikes.userId, userId), eq(presetListLikes.presetListId, presetListId)));
  }

  async hasLikedPresetList(userId: string, presetListId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(presetListLikes)
      .where(and(eq(presetListLikes.userId, userId), eq(presetListLikes.presetListId, presetListId)));
    return !!row;
  }

  async getPresetListLikeCount(presetListId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(presetListLikes)
      .where(eq(presetListLikes.presetListId, presetListId));
    return row?.count ?? 0;
  }

  async getPresetListComments(presetListId: string): Promise<(PresetListComment & { user: UserStub })[]> {
    const rows = await db
      .select({
        comment: presetListComments,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(presetListComments)
      .innerJoin(users, eq(presetListComments.userId, users.id))
      .where(eq(presetListComments.presetListId, presetListId))
      .orderBy(asc(presetListComments.createdAt));
    return rows.map((r) => ({ ...r.comment, user: r.user as UserStub }));
  }

  async createPresetListComment(presetListId: string, userId: string, body: string): Promise<PresetListComment> {
    const [comment] = await db
      .insert(presetListComments)
      .values({ presetListId, userId, body })
      .returning();
    return comment;
  }

  async deletePresetListComment(commentId: string, userId: string): Promise<void> {
    const [comment] = await db.select().from(presetListComments).where(eq(presetListComments.id, commentId));
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");
    await db.delete(presetListComments).where(eq(presetListComments.id, commentId));
  }

  async getPresetListCommentCount(presetListId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(presetListComments)
      .where(eq(presetListComments.presetListId, presetListId));
    return row?.count ?? 0;
  }

  async markPresetProgress(userId: string, presetListId: string, externalId: string): Promise<void> {
    await db
      .insert(userPresetProgress)
      .values({ userId, presetListId, externalId })
      .onConflictDoNothing();
  }

  async unmarkPresetProgress(userId: string, presetListId: string, externalId: string): Promise<void> {
    await db
      .delete(userPresetProgress)
      .where(
        and(
          eq(userPresetProgress.userId, userId),
          eq(userPresetProgress.presetListId, presetListId),
          eq(userPresetProgress.externalId, externalId)
        )
      );
  }

  async getUserPresetProgress(userId: string, presetListId: string): Promise<Set<string>> {
    const rows = await db
      .select({ externalId: userPresetProgress.externalId })
      .from(userPresetProgress)
      .where(
        and(
          eq(userPresetProgress.userId, userId),
          eq(userPresetProgress.presetListId, presetListId)
        )
      );
    return new Set(rows.map((r) => r.externalId));
  }

  async getPublicLists(options: { sort?: "popular" | "recent"; page?: number; limit?: number }): Promise<ListWithMeta[]> {
    const page = options.page ?? 0;
    const limit = Math.min(options.limit ?? 24, 50);
    const offset = page * limit;
    const sortMode = options.sort ?? "recent";

    const selectFields = {
      list: lists,
      owner: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      itemCount: sql<number>`(select count(*) from list_items where list_items.list_id = ${lists.id})::int`,
      collaboratorCount: sql<number>`(select count(*) from list_collaborators where list_collaborators.list_id = ${lists.id})::int`,
      likeCount: sql<number>`(select count(*) from list_likes where list_likes.list_id = ${lists.id})::int`,
    };

    const rows = sortMode === "popular"
      ? await db
          .select(selectFields)
          .from(lists)
          .innerJoin(users, eq(lists.ownerId, users.id))
          .where(eq(lists.visibility, "public"))
          .orderBy(desc(sql`(select count(*) from list_likes where list_likes.list_id = lists.id)`), desc(lists.createdAt))
          .limit(limit)
          .offset(offset)
      : await db
          .select(selectFields)
          .from(lists)
          .innerJoin(users, eq(lists.ownerId, users.id))
          .where(eq(lists.visibility, "public"))
          .orderBy(desc(lists.createdAt))
          .limit(limit)
          .offset(offset);

    const result: ListWithMeta[] = rows.map((r) => ({
      ...r.list,
      owner: r.owner as UserStub,
      itemCount: r.itemCount,
      collaboratorCount: r.collaboratorCount,
      isCollaborator: false,
    }));

    const listIds = result.map((l) => l.id);
    if (listIds.length === 0) return result;

    const commentCounts = await Promise.all(listIds.map((lid) => this.getListCommentCount(lid)));
    const coverUrlsByList = await this.getListCoverUrls(listIds);

    return result.map((l, i) => ({
      ...l,
      likeCount: (rows[i] as { likeCount?: number }).likeCount ?? 0,
      commentCount: commentCounts[i],
      coverUrls: coverUrlsByList[l.id] ?? [],
    }));
  }

  async getListItems(listId: string): Promise<ListItemWithDetails[]> {
    const rows = await db
      .select({
        item: listItems,
        media: media,
        addedBy: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(listItems)
      .innerJoin(media, eq(listItems.mediaId, media.id))
      .innerJoin(users, eq(listItems.addedByUserId, users.id))
      .where(eq(listItems.listId, listId))
      .orderBy(listItems.position);

    return rows.map((r) => ({
      ...r.item,
      media: r.media,
      addedBy: r.addedBy as UserStub,
    }));
  }

  async getListCollaborators(listId: string): Promise<(ListCollaborator & { user: UserStub })[]> {
    const rows = await db
      .select({
        collab: listCollaborators,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(listCollaborators)
      .innerJoin(users, eq(listCollaborators.userId, users.id))
      .where(eq(listCollaborators.listId, listId));

    return rows.map((r) => ({ ...r.collab, user: r.user as UserStub }));
  }

  async removeListCollaborator(listId: string, userId: string): Promise<void> {
    await db.delete(listCollaborators).where(
      and(eq(listCollaborators.listId, listId), eq(listCollaborators.userId, userId))
    );
  }

  async createInvitation(listId: string, invitedUserId: string, invitedByUserId: string): Promise<ListInvitation> {
    // idempotent: return existing pending invitation if present
    const existing = await db
      .select()
      .from(listInvitations)
      .where(and(
        eq(listInvitations.listId, listId),
        eq(listInvitations.invitedUserId, invitedUserId),
        eq(listInvitations.status, "pending"),
      ));
    if (existing[0]) return existing[0];
    const [inv] = await db.insert(listInvitations).values({ listId, invitedUserId, invitedByUserId }).returning();
    return inv;
  }

  async getInvitationsForUser(userId: string): Promise<ListInvitationWithDetails[]> {
    const rows = await db
      .select({
        invitation: listInvitations,
        list: { id: lists.id, name: lists.name },
        invitedBy: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(listInvitations)
      .innerJoin(lists, eq(listInvitations.listId, lists.id))
      .innerJoin(users, eq(listInvitations.invitedByUserId, users.id))
      .where(and(
        eq(listInvitations.invitedUserId, userId),
        eq(listInvitations.status, "pending"),
      ))
      .orderBy(desc(listInvitations.createdAt));

    return rows.map((r) => ({
      ...r.invitation,
      list: r.list,
      invitedBy: r.invitedBy as UserStub,
    }));
  }

  async getListInvitations(listId: string): Promise<(ListInvitation & { invitedUser: UserStub })[]> {
    const rows = await db
      .select({
        invitation: listInvitations,
        invitedUser: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(listInvitations)
      .innerJoin(users, eq(listInvitations.invitedUserId, users.id))
      .where(eq(listInvitations.listId, listId))
      .orderBy(desc(listInvitations.createdAt));

    return rows.map((r) => ({ ...r.invitation, invitedUser: r.invitedUser as UserStub }));
  }

  async respondToInvitation(id: string, userId: string, status: "accepted" | "declined"): Promise<ListInvitation> {
    const [inv] = await db
      .select()
      .from(listInvitations)
      .where(and(eq(listInvitations.id, id), eq(listInvitations.invitedUserId, userId)));
    if (!inv) throw new Error("Invitation not found");

    const [updated] = await db
      .update(listInvitations)
      .set({ status })
      .where(eq(listInvitations.id, id))
      .returning();

    if (status === "accepted") {
      await db
        .insert(listCollaborators)
        .values({ listId: inv.listId, userId })
        .onConflictDoNothing();
    }

    return updated;
  }

  async getPendingInvitationCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(listInvitations)
      .where(and(
        eq(listInvitations.invitedUserId, userId),
        eq(listInvitations.status, "pending"),
      ));
    return row?.c ?? 0;
  }

  // ── Tier Lists ───────────────────────────────────────────────────────────────

  private static DEFAULT_TIERS = [
    { label: "S", color: "#ef4444" },
    { label: "A", color: "#f97316" },
    { label: "B", color: "#eab308" },
    { label: "C", color: "#22c55e" },
    { label: "D", color: "#64748b" },
  ];

  async createTierList(ownerId: string, data: { name: string; description?: string; visibility?: string; tags?: string[] }): Promise<TierList> {
    const [list] = await db.insert(tierLists).values({
      ownerId,
      name: data.name,
      description: data.description ?? "",
      visibility: data.visibility ?? "private",
      tags: data.tags ?? [],
    }).returning();
    await this.ensureDefaultTiers(list.id);
    return list;
  }

  async getTierList(id: string): Promise<TierList | undefined> {
    const [row] = await db.select().from(tierLists).where(eq(tierLists.id, id));
    return row;
  }

  async ensureDefaultTiers(tierListId: string): Promise<void> {
    const existing = await db.select().from(tierListTiers).where(eq(tierListTiers.tierListId, tierListId));
    if (existing.length > 0) return;
    for (let i = 0; i < DatabaseStorage.DEFAULT_TIERS.length; i++) {
      const t = DatabaseStorage.DEFAULT_TIERS[i];
      await db.insert(tierListTiers).values({
        tierListId,
        label: t.label,
        color: t.color,
        position: i,
      });
    }
  }

  async createTier(tierListId: string, data: { label: string; color?: string; position?: number }): Promise<TierListTier> {
    const maxPos = await db
      .select({ max: sql<number>`coalesce(max(${tierListTiers.position}), -1)` })
      .from(tierListTiers)
      .where(eq(tierListTiers.tierListId, tierListId));
    const position = data.position ?? (maxPos[0]?.max ?? -1) + 1;
    const [tier] = await db.insert(tierListTiers).values({
      tierListId,
      label: data.label,
      color: data.color ?? "#94a3b8",
      position,
    }).returning();
    return tier;
  }

  async updateTier(tierId: string, data: { label?: string; color?: string; position?: number }): Promise<TierListTier> {
    const [updated] = await db.update(tierListTiers).set(data).where(eq(tierListTiers.id, tierId)).returning();
    if (!updated) throw new Error("Tier not found");
    return updated;
  }

  async deleteTier(tierId: string): Promise<void> {
    await db.update(tierListItems).set({ tierId: null }).where(eq(tierListItems.tierId, tierId));
    await db.delete(tierListTiers).where(eq(tierListTiers.id, tierId));
  }

  async reorderTiers(tierListId: string, tierIds: string[]): Promise<void> {
    for (let i = 0; i < tierIds.length; i++) {
      await db
        .update(tierListTiers)
        .set({ position: i })
        .where(and(eq(tierListTiers.id, tierIds[i]), eq(tierListTiers.tierListId, tierListId)));
    }
  }

  async addTierListItem(tierListId: string, mediaId: string, addedByUserId: string, tierId?: string | null, position?: number, note?: string): Promise<TierListItem> {
    const existing = await db
      .select()
      .from(tierListItems)
      .where(and(eq(tierListItems.tierListId, tierListId), eq(tierListItems.mediaId, mediaId)));
    if (existing[0]) return existing[0];

    const targetTierId = tierId ?? null;
    let pos = position ?? 0;
    if (pos === undefined || pos < 0) {
      const maxPos = await db
        .select({ max: sql<number>`coalesce(max(${tierListItems.position}), -1)` })
        .from(tierListItems)
        .where(and(eq(tierListItems.tierListId, tierListId), targetTierId ? eq(tierListItems.tierId, targetTierId) : isNull(tierListItems.tierId)));
      pos = (maxPos[0]?.max ?? -1) + 1;
    }

    const [item] = await db.insert(tierListItems).values({
      tierListId,
      mediaId,
      tierId: targetTierId,
      addedByUserId,
      position: pos,
      note: note ?? null,
    }).returning();
    return item;
  }

  async removeTierListItem(tierListId: string, itemId: string): Promise<void> {
    await db.delete(tierListItems).where(and(eq(tierListItems.id, itemId), eq(tierListItems.tierListId, tierListId)));
  }

  async moveTierListItem(itemId: string, toTierId: string | null, toPosition: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(tierListItems).where(eq(tierListItems.id, itemId));
      if (!item) throw new Error("Item not found");

      const sameScope = toTierId ? eq(tierListItems.tierId, toTierId) : isNull(tierListItems.tierId);
      const allInTarget = await tx
        .select()
        .from(tierListItems)
        .where(and(
          eq(tierListItems.tierListId, item.tierListId),
          or(sameScope, eq(tierListItems.id, itemId)),
        ))
        .orderBy(asc(tierListItems.position));

      const others = allInTarget.filter((i) => i.id !== itemId);
      const newOrder = [...others];
      newOrder.splice(Math.min(toPosition, newOrder.length), 0, item);

      for (let i = 0; i < newOrder.length; i++) {
        await tx
          .update(tierListItems)
          .set({ tierId: toTierId, position: i })
          .where(eq(tierListItems.id, newOrder[i].id));
      }
    });
  }

  async updateTierListItemNote(tierListId: string, itemId: string, note: string | null): Promise<void> {
    await db
      .update(tierListItems)
      .set({ note })
      .where(and(eq(tierListItems.id, itemId), eq(tierListItems.tierListId, tierListId)));
  }

  async getTierListItems(tierListId: string): Promise<TierListItemWithDetails[]> {
    const rows = await db
      .select({
        item: tierListItems,
        media: media,
        addedBy: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(tierListItems)
      .innerJoin(media, eq(tierListItems.mediaId, media.id))
      .innerJoin(users, eq(tierListItems.addedByUserId, users.id))
      .where(eq(tierListItems.tierListId, tierListId))
      .orderBy(asc(tierListItems.position));

    return rows.map((r) => ({
      ...r.item,
      media: r.media,
      addedBy: r.addedBy as UserStub,
    }));
  }

  async getTierListDetail(id: string, appUserId?: string | null): Promise<TierListDetail | undefined> {
    const list = await this.getTierList(id);
    if (!list) return undefined;

    const [ownerUser, tiers, items, collaborators, invitations, likeCount, commentCount, isLiked] = await Promise.all([
      this.getUser(list.ownerId),
      db.select().from(tierListTiers).where(eq(tierListTiers.tierListId, id)).orderBy(asc(tierListTiers.position)),
      this.getTierListItems(id),
      this.getTierListCollaborators(id),
      db.select().from(tierListInvitations).where(eq(tierListInvitations.tierListId, id)).then(async (invs) => {
        const withUsers = await Promise.all(invs.map(async (inv) => {
          const [u] = await db.select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
            .from(users).where(eq(users.id, inv.invitedUserId));
          return { ...inv, invitedUser: u ?? { id: inv.invitedUserId, username: "", displayName: "", avatarUrl: "" } };
        }));
        return withUsers;
      }),
      this.getTierListLikeCount(id),
      this.getTierListCommentCount(id),
      appUserId ? this.hasLikedTierList(appUserId, id) : Promise.resolve(false),
    ]);

    const owner = ownerUser
      ? { id: ownerUser.id, username: ownerUser.username, displayName: ownerUser.displayName, avatarUrl: ownerUser.avatarUrl ?? "" }
      : null;

    const tiersWithItems = tiers.map((t) => ({
      ...t,
      items: items.filter((i) => i.tierId === t.id),
    }));
    const unassignedItems = items.filter((i) => !i.tierId);

    const isOwner = !!appUserId && list.ownerId === appUserId;

    return {
      ...list,
      owner,
      tiers: tiersWithItems,
      unassignedItems,
      collaborators: collaborators as (TierListCollaborator & { user: UserStub })[],
      invitations: invitations as (TierListInvitation & { invitedUser: UserStub })[],
      isOwner,
      likeCount,
      commentCount,
      isLiked: isLiked ?? false,
    };
  }

  async getUserTierLists(userId: string): Promise<TierListWithMeta[]> {
    const allLists: TierListWithMeta[] = [];
    const listIds: string[] = [];

    const ownedRows = await db
      .select({
        list: tierLists,
        owner: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
        itemCount: sql<number>`(select count(*) from tier_list_items where tier_list_items.tier_list_id = ${tierLists.id})::int`,
        collaboratorCount: sql<number>`(select count(*) from tier_list_collaborators where tier_list_collaborators.tier_list_id = ${tierLists.id})::int`,
      })
      .from(tierLists)
      .innerJoin(users, eq(tierLists.ownerId, users.id))
      .where(eq(tierLists.ownerId, userId))
      .orderBy(desc(tierLists.createdAt));

    const collabRows = await db
      .select({
        list: tierLists,
        owner: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
        itemCount: sql<number>`(select count(*) from tier_list_items where tier_list_items.tier_list_id = ${tierLists.id})::int`,
        collaboratorCount: sql<number>`(select count(*) from tier_list_collaborators where tier_list_collaborators.tier_list_id = ${tierLists.id})::int`,
      })
      .from(tierListCollaborators)
      .innerJoin(tierLists, eq(tierListCollaborators.tierListId, tierLists.id))
      .innerJoin(users, eq(tierLists.ownerId, users.id))
      .where(eq(tierListCollaborators.userId, userId))
      .orderBy(desc(tierLists.createdAt));

    for (const r of ownedRows) {
      allLists.push({ ...r.list, owner: r.owner as UserStub, itemCount: r.itemCount, collaboratorCount: r.collaboratorCount, isCollaborator: false });
      listIds.push(r.list.id);
    }
    for (const r of collabRows) {
      if (!listIds.includes(r.list.id)) {
        allLists.push({ ...r.list, owner: r.owner as UserStub, itemCount: r.itemCount, collaboratorCount: r.collaboratorCount, isCollaborator: true });
        listIds.push(r.list.id);
      }
    }

    if (listIds.length === 0) return allLists;

    const likeCounts = await Promise.all(listIds.map((lid) => this.getTierListLikeCount(lid)));
    const commentCounts = await Promise.all(listIds.map((lid) => this.getTierListCommentCount(lid)));
    const coverUrlsByList = await this.getTierListCoverUrls(listIds);

    return allLists.map((l, i) => ({
      ...l,
      likeCount: likeCounts[i],
      commentCount: commentCounts[i],
      coverUrls: coverUrlsByList[l.id] ?? [],
    }));
  }

  private async getTierListCoverUrls(listIds: string[]): Promise<Record<string, string[]>> {
    if (listIds.length === 0) return {};
    const rows = await db
      .select({ tierListId: tierListItems.tierListId, coverUrl: media.coverUrl, position: tierListItems.position })
      .from(tierListItems)
      .innerJoin(media, eq(tierListItems.mediaId, media.id))
      .where(inArray(tierListItems.tierListId, listIds))
      .orderBy(asc(tierListItems.position));
    const result: Record<string, string[]> = {};
    for (const r of rows) {
      if (!result[r.tierListId]) result[r.tierListId] = [];
      if (result[r.tierListId].length < 5 && r.coverUrl) result[r.tierListId].push(r.coverUrl);
    }
    return result;
  }

  async updateTierList(id: string, data: Partial<Pick<TierList, "name" | "description" | "visibility" | "tags">>): Promise<TierList> {
    const [updated] = await db.update(tierLists).set(data).where(eq(tierLists.id, id)).returning();
    if (!updated) throw new Error("Tier list not found");
    return updated;
  }

  async deleteTierList(id: string): Promise<void> {
    await db.delete(tierLists).where(eq(tierLists.id, id));
  }

  async likeTierList(userId: string, tierListId: string): Promise<void> {
    await db.insert(tierListLikes).values({ userId, tierListId }).onConflictDoNothing();
  }

  async unlikeTierList(userId: string, tierListId: string): Promise<void> {
    await db.delete(tierListLikes).where(and(eq(tierListLikes.userId, userId), eq(tierListLikes.tierListId, tierListId)));
  }

  async hasLikedTierList(userId: string, tierListId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(tierListLikes)
      .where(and(eq(tierListLikes.userId, userId), eq(tierListLikes.tierListId, tierListId)));
    return !!row;
  }

  async getTierListLikeCount(tierListId: string): Promise<number> {
    const [row] = await db.select({ count: count() }).from(tierListLikes).where(eq(tierListLikes.tierListId, tierListId));
    return row?.count ?? 0;
  }

  async getTierListComments(tierListId: string): Promise<(TierListComment & { user: UserStub })[]> {
    const rows = await db
      .select({
        comment: tierListComments,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(tierListComments)
      .innerJoin(users, eq(tierListComments.userId, users.id))
      .where(eq(tierListComments.tierListId, tierListId))
      .orderBy(asc(tierListComments.createdAt));
    return rows.map((r) => ({ ...r.comment, user: r.user as UserStub }));
  }

  async createTierListComment(tierListId: string, userId: string, body: string): Promise<TierListComment> {
    const [comment] = await db.insert(tierListComments).values({ tierListId, userId, body }).returning();
    return comment;
  }

  async deleteTierListComment(commentId: string, userId: string): Promise<void> {
    const [comment] = await db.select().from(tierListComments).where(eq(tierListComments.id, commentId));
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");
    await db.delete(tierListComments).where(eq(tierListComments.id, commentId));
  }

  async getTierListCommentCount(tierListId: string): Promise<number> {
    const [row] = await db.select({ count: count() }).from(tierListComments).where(eq(tierListComments.tierListId, tierListId));
    return row?.count ?? 0;
  }

  async getPublicTierLists(options: { sort?: "popular" | "recent"; page?: number; limit?: number }): Promise<TierListWithMeta[]> {
    const page = options.page ?? 0;
    const limit = Math.min(options.limit ?? 24, 50);
    const offset = page * limit;
    const sortMode = options.sort ?? "recent";

    const selectFields = {
      list: tierLists,
      owner: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      itemCount: sql<number>`(select count(*) from tier_list_items where tier_list_items.tier_list_id = ${tierLists.id})::int`,
      collaboratorCount: sql<number>`(select count(*) from tier_list_collaborators where tier_list_collaborators.tier_list_id = ${tierLists.id})::int`,
      likeCount: sql<number>`(select count(*) from tier_list_likes where tier_list_likes.tier_list_id = ${tierLists.id})::int`,
    };

    const rows = sortMode === "popular"
      ? await db
          .select(selectFields)
          .from(tierLists)
          .innerJoin(users, eq(tierLists.ownerId, users.id))
          .where(eq(tierLists.visibility, "public"))
          .orderBy(desc(sql`(select count(*) from tier_list_likes where tier_list_likes.tier_list_id = tier_lists.id)`), desc(tierLists.createdAt))
          .limit(limit)
          .offset(offset)
      : await db
          .select(selectFields)
          .from(tierLists)
          .innerJoin(users, eq(tierLists.ownerId, users.id))
          .where(eq(tierLists.visibility, "public"))
          .orderBy(desc(tierLists.createdAt))
          .limit(limit)
          .offset(offset);

    const result: TierListWithMeta[] = rows.map((r) => ({
      ...r.list,
      owner: r.owner as UserStub,
      itemCount: r.itemCount,
      collaboratorCount: r.collaboratorCount,
      isCollaborator: false,
    }));

    const listIds = result.map((l) => l.id);
    if (listIds.length === 0) return result;

    const commentCounts = await Promise.all(listIds.map((lid) => this.getTierListCommentCount(lid)));
    const coverUrlsByList = await this.getTierListCoverUrls(listIds);

    return result.map((l, i) => ({
      ...l,
      likeCount: (rows[i] as { likeCount?: number }).likeCount ?? 0,
      commentCount: commentCounts[i],
      coverUrls: coverUrlsByList[l.id] ?? [],
    }));
  }

  async getTierListCollaborators(tierListId: string): Promise<(TierListCollaborator & { user: UserStub })[]> {
    const rows = await db
      .select({
        collab: tierListCollaborators,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(tierListCollaborators)
      .innerJoin(users, eq(tierListCollaborators.userId, users.id))
      .where(eq(tierListCollaborators.tierListId, tierListId));
    return rows.map((r) => ({ ...r.collab, user: r.user as UserStub }));
  }

  async removeTierListCollaborator(tierListId: string, userId: string): Promise<void> {
    await db.delete(tierListCollaborators).where(
      and(eq(tierListCollaborators.tierListId, tierListId), eq(tierListCollaborators.userId, userId))
    );
  }

  async createTierListInvitation(tierListId: string, invitedUserId: string, invitedByUserId: string): Promise<TierListInvitation> {
    const existing = await db
      .select()
      .from(tierListInvitations)
      .where(and(
        eq(tierListInvitations.tierListId, tierListId),
        eq(tierListInvitations.invitedUserId, invitedUserId),
        eq(tierListInvitations.status, "pending"),
      ));
    if (existing[0]) return existing[0];
    const [inv] = await db.insert(tierListInvitations).values({ tierListId, invitedUserId, invitedByUserId }).returning();
    return inv;
  }

  async getTierListInvitationsForUser(userId: string): Promise<TierListInvitationWithDetails[]> {
    const rows = await db
      .select({
        invitation: tierListInvitations,
        tierList: { id: tierLists.id, name: tierLists.name },
        invitedBy: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(tierListInvitations)
      .innerJoin(tierLists, eq(tierListInvitations.tierListId, tierLists.id))
      .innerJoin(users, eq(tierListInvitations.invitedByUserId, users.id))
      .where(and(eq(tierListInvitations.invitedUserId, userId), eq(tierListInvitations.status, "pending")))
      .orderBy(desc(tierListInvitations.createdAt));
    return rows.map((r) => ({ ...r.invitation, tierList: r.tierList, invitedBy: r.invitedBy as UserStub }));
  }

  async getTierListInvitations(tierListId: string): Promise<(TierListInvitation & { invitedUser: UserStub })[]> {
    const rows = await db
      .select({
        invitation: tierListInvitations,
        invitedUser: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(tierListInvitations)
      .innerJoin(users, eq(tierListInvitations.invitedUserId, users.id))
      .where(eq(tierListInvitations.tierListId, tierListId))
      .orderBy(desc(tierListInvitations.createdAt));
    return rows.map((r) => ({ ...r.invitation, invitedUser: r.invitedUser as UserStub }));
  }

  async respondToTierListInvitation(id: string, userId: string, status: "accepted" | "declined"): Promise<TierListInvitation> {
    const [inv] = await db
      .select()
      .from(tierListInvitations)
      .where(and(eq(tierListInvitations.id, id), eq(tierListInvitations.invitedUserId, userId)));
    if (!inv) throw new Error("Invitation not found");
    const [updated] = await db
      .update(tierListInvitations)
      .set({ status })
      .where(eq(tierListInvitations.id, id))
      .returning();
    if (status === "accepted") {
      await db.insert(tierListCollaborators).values({ tierListId: inv.tierListId, userId }).onConflictDoNothing();
    }
    return updated;
  }

  async getPendingTierListInvitationCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(tierListInvitations)
      .where(and(eq(tierListInvitations.invitedUserId, userId), eq(tierListInvitations.status, "pending")));
    return row?.c ?? 0;
  }

  async searchUsers(query: string, excludeUserId?: string): Promise<UserStub[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(and(
        or(ilike(users.username, pattern), ilike(users.displayName, pattern)),
        excludeUserId ? ne(users.id, excludeUserId) : undefined,
      ))
      .limit(10);
    return rows;
  }

  async seedBadgesIfEmpty(): Promise<void> {
    const existing = await db.select().from(badges).limit(1);
    if (existing.length > 0) return;

    const placeholderBadges = [
      { slug: "first-review", name: "First Review", description: "Posted your first review", rarity: "common", category: "engagement" },
      { slug: "avid-reader", name: "Avid Reader", description: "Logged 10 books", rarity: "common", category: "milestone" },
      { slug: "film-buff", name: "Film Buff", description: "Logged 25 films", rarity: "rare", category: "milestone" },
      { slug: "critic", name: "Critic", description: "Received 50 review likes", rarity: "epic", category: "engagement" },
      { slug: "early-adopter", name: "Early Adopter", description: "Joined during beta", rarity: "legendary", category: "special" },
    ];

    await db.insert(badges).values(
      placeholderBadges.map((b) => ({
        slug: b.slug,
        name: b.name,
        description: b.description,
        iconUrl: null,
        rarity: b.rarity,
        category: b.category,
      }))
    );
  }
}

export const storage = new DatabaseStorage();
