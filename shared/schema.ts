import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  timestamp,
  primaryKey,
  boolean,
  jsonb,
  unique,
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
  coverUrl: text("cover_url").default(""),
  synopsis: text("synopsis").default(""),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  rating: text("rating").default(""),
  externalId: text("external_id").default(""),
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
  rating: real("rating").notNull(),
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

export const mediaLikes = pgTable(
  "media_likes",
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

export const watched = pgTable(
  "watched",
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

export const profileSettings = pgTable("profile_settings", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bannerUrl: text("banner_url"),
  bannerPosition: text("banner_position").default("center"),
  themeAccent: text("theme_accent").default("amber"),
  themeCustomColor: text("theme_custom_color"),
  layoutOrder: jsonb("layout_order").$type<string[]>().default(["favorites", "watchlist", "activity"]),
  avatarFrameId: varchar("avatar_frame_id", { length: 36 }),
  pronouns: text("pronouns"),
  aboutMe: text("about_me"),
  showBadges: boolean("show_badges").default(true),
});

export const badges = pgTable("badges", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconUrl: text("icon_url"),
  rarity: text("rarity").notNull().default("common"), // common | rare | epic | legendary
  category: text("category").notNull().default("engagement"), // engagement | milestone | special
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: varchar("badge_id", { length: 36 })
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

export const subscriptions = pgTable("subscriptions", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("free"), // free | pro | monthly | yearly
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
});

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // participant1Id is always the lexicographically smaller userId to prevent duplicates
    participant1Id: varchar("participant1_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participant2Id: varchar("participant2_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // active | request | declined
    requestedById: varchar("requested_by_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("conversations_participants_unique").on(t.participant1Id, t.participant2Id)],
);

export const messages = pgTable("messages", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id", { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
export type ProfileSettings = typeof profileSettings.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
