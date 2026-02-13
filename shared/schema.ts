import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").default(""),
  avatarUrl: text("avatar_url").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const media = pgTable("media", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  creator: text("creator").default(""),
  year: text("year").default(""),
  coverGradient: text("cover_gradient").notNull(),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  rating: text("rating").default(""),
});

export const reviews = pgTable("reviews", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  mediaId: varchar("media_id", { length: 36 })
    .notNull()
    .references(() => media.id),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchlist = pgTable(
  "watchlist",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    mediaId: varchar("media_id", { length: 36 })
      .notNull()
      .references(() => media.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaId] })],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    mediaId: varchar("media_id", { length: 36 })
      .notNull()
      .references(() => media.id),
    position: integer("position").default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaId] })],
);

export const follows = pgTable(
  "follows",
  {
    followerId: varchar("follower_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    followingId: varchar("following_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })],
);

export const reviewLikes = pgTable(
  "review_likes",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    reviewId: varchar("review_id", { length: 36 })
      .notNull()
      .references(() => reviews.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reviewId] })],
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export const insertMediaSchema = createInsertSchema(media).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof media.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
