import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  media,
  reviews,
  watchlist,
  favorites,
  follows,
  reviewLikes,
  type User,
  type InsertUser,
  type Media,
  type InsertMedia,
  type Review,
  type InsertReview,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export const storage = new DatabaseStorage();
