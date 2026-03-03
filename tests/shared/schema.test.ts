import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertMediaSchema,
  insertReviewSchema,
  insertListSchema,
  insertListItemSchema,
  insertListInvitationSchema,
  insertTierListSchema,
  insertTierListTierSchema,
  insertTierListItemSchema,
  insertTierListInvitationSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertPresetListCommentSchema,
  MEDIA_TYPES,
} from "@shared/schema";

describe("insertUserSchema", () => {
  it("accepts valid user", () => {
    const result = insertUserSchema.safeParse({
      username: "alice",
      displayName: "Alice",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing username", () => {
    const result = insertUserSchema.safeParse({ displayName: "Alice" });
    expect(result.success).toBe(false);
  });

  it("rejects missing displayName", () => {
    const result = insertUserSchema.safeParse({ username: "alice" });
    expect(result.success).toBe(false);
  });

  it("strips extra fields", () => {
    const result = insertUserSchema.safeParse({
      username: "alice",
      displayName: "Alice",
      id: "custom-id",
      createdAt: new Date(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });
});

describe("insertMediaSchema", () => {
  it("accepts valid media for each type", () => {
    for (const type of MEDIA_TYPES) {
      const result = insertMediaSchema.safeParse({
        type,
        title: "Test",
        coverGradient: "from-slate-700 to-slate-900",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing title", () => {
    const result = insertMediaSchema.safeParse({
      type: "movie",
      coverGradient: "from-slate-700 to-slate-900",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing coverGradient", () => {
    const result = insertMediaSchema.safeParse({
      type: "movie",
      title: "Test",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertReviewSchema", () => {
  it("accepts valid review", () => {
    const result = insertReviewSchema.safeParse({
      userId: "user-1",
      mediaId: "media-1",
      rating: 5,
      body: "Great movie!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional seasonNumber and episodeNumber", () => {
    const result = insertReviewSchema.safeParse({
      userId: "user-1",
      mediaId: "media-1",
      rating: 4,
      body: "Good",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(insertReviewSchema.safeParse({ rating: 5, body: "x" }).success).toBe(false);
    expect(insertReviewSchema.safeParse({ userId: "u", mediaId: "m", body: "x" }).success).toBe(false);
  });
});

describe("insertListSchema", () => {
  it("accepts valid list", () => {
    const result = insertListSchema.safeParse({
      ownerId: "user-1",
      name: "My List",
    });
    expect(result.success).toBe(true);
  });

  it("accepts visibility enum", () => {
    const result = insertListSchema.safeParse({
      ownerId: "user-1",
      name: "List",
      visibility: "public",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertListItemSchema", () => {
  it("accepts valid list item", () => {
    const result = insertListItemSchema.safeParse({
      listId: "list-1",
      mediaId: "media-1",
      addedByUserId: "user-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertListInvitationSchema", () => {
  it("accepts valid invitation", () => {
    const result = insertListInvitationSchema.safeParse({
      listId: "list-1",
      invitedUserId: "user-2",
      invitedByUserId: "user-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertTierListSchema", () => {
  it("accepts valid tier list", () => {
    const result = insertTierListSchema.safeParse({
      ownerId: "user-1",
      name: "My Tier List",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertTierListTierSchema", () => {
  it("accepts valid tier", () => {
    const result = insertTierListTierSchema.safeParse({
      tierListId: "tl-1",
      label: "S",
      color: "#ff0000",
      position: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("insertTierListItemSchema", () => {
  it("accepts valid tier list item", () => {
    const result = insertTierListItemSchema.safeParse({
      tierListId: "tl-1",
      mediaId: "media-1",
      addedByUserId: "user-1",
      tierId: "tier-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertTierListInvitationSchema", () => {
  it("accepts valid tier list invitation", () => {
    const result = insertTierListInvitationSchema.safeParse({
      tierListId: "tl-1",
      invitedUserId: "user-2",
      invitedByUserId: "user-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertConversationSchema", () => {
  it("accepts valid conversation", () => {
    const result = insertConversationSchema.safeParse({
      participant1Id: "user-1",
      participant2Id: "user-2",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertMessageSchema", () => {
  it("accepts valid message", () => {
    const result = insertMessageSchema.safeParse({
      conversationId: "conv-1",
      senderId: "user-1",
      body: "Hello!",
    });
    expect(result.success).toBe(true);
  });

});

describe("insertPresetListCommentSchema", () => {
  it("accepts valid preset list comment", () => {
    const result = insertPresetListCommentSchema.safeParse({
      presetListId: "imdb-top-250",
      userId: "user-1",
      body: "Great list!",
    });
    expect(result.success).toBe(true);
  });
});
