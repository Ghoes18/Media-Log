import { eq, and, desc, sql, count, lt, or, ne, isNull } from "drizzle-orm";
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
} from "@shared/schema";

export interface ConversationWithDetails extends Conversation {
  otherUser: User;
  lastMessage: { body: string; senderId: string; createdAt: Date } | null;
  unreadCount: number;
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

  getReviewsForMedia(mediaId: string): Promise<
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

  getMediaStats(mediaId: string): Promise<{ watched: number; likes: number; listed: number }>;

  getProfileSettings(userId: string): Promise<ProfileSettings | undefined>;
  updateProfileSettings(userId: string, data: Partial<ProfileSettings>): Promise<ProfileSettings>;
  getUserSubscription(userId: string): Promise<{ status: "free" | "pro" }>;
  getBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<(Badge & { earnedAt: Date })[]>;
  seedBadgesIfEmpty(): Promise<void>;

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
  ): Promise<(Review & { user: User; likeCount: number })[]> {
    const rows = await db
      .select({
        review: reviews,
        user: users,
        likeCount: sql<number>`coalesce(count(${reviewLikes.reviewId}), 0)::int`,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .leftJoin(reviewLikes, eq(reviewLikes.reviewId, reviews.id))
      .where(eq(reviews.mediaId, mediaId))
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

  async getMediaStats(mediaId: string): Promise<{ watched: number; likes: number; listed: number }> {
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
    return {
      watched: watchedCount?.c ?? 0,
      likes: likesCount?.c ?? 0,
      listed: listedCount?.c ?? 0,
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
