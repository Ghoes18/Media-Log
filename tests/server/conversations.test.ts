import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, mockStorage } from "../helpers/setup-app";
import { createUser } from "../helpers/fixtures";

describe("Conversations API", () => {
  let request: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    request = await createTestApp();
  });

  const appUser = createUser({ id: "user-1", username: "alice" });

  describe("GET /api/conversations", () => {
    it("returns conversations when authenticated", async () => {
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getConversationsForUser.mockResolvedValue([]);

      const res = await request
        .get("/api/conversations")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/conversations", () => {
    it("creates conversation when authenticated", async () => {
      const conv = {
        id: "conv-1",
        participant1Id: "user-1",
        participant2Id: "user-2",
        status: "active",
        requestedById: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getOrCreateConversation.mockResolvedValue(conv);

      const res = await request
        .post("/api/conversations")
        .set("Authorization", "Bearer user-1")
        .send({ recipientId: "user-2" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: "conv-1" });
    });

    it("returns 400 when recipientId missing", async () => {
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);

      const res = await request
        .post("/api/conversations")
        .set("Authorization", "Bearer user-1")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/conversations/:id/messages", () => {
    it("returns messages when authenticated", async () => {
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getConversationById.mockResolvedValue({
        id: "conv-1",
        participant1Id: "user-1",
        participant2Id: "user-2",
        status: "active",
      });
      mockStorage.getMessages.mockResolvedValue([]);

      const res = await request
        .get("/api/conversations/conv-1/messages")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/conversations/:id/messages", () => {
    it("sends message when authenticated", async () => {
      const msg = {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "Hello",
        readAt: null,
        createdAt: new Date(),
      };
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getConversationById.mockResolvedValue({
        id: "conv-1",
        participant1Id: "user-1",
        participant2Id: "user-2",
        status: "active",
      });
      mockStorage.createMessage.mockResolvedValue(msg);

      const res = await request
        .post("/api/conversations/conv-1/messages")
        .set("Authorization", "Bearer user-1")
        .send({ body: "Hello" });

      expect(res.status).toBe(201);
    });
  });

  describe("PATCH /api/conversations/:id/accept", () => {
    it("accepts conversation when authenticated", async () => {
      const conv = {
        id: "conv-1",
        participant1Id: "user-2",
        participant2Id: "user-1",
        status: "active",
        requestedById: "user-2",
      };
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getConversationById.mockResolvedValue(conv);
      mockStorage.acceptConversation.mockResolvedValue(conv);

      const res = await request
        .patch("/api/conversations/conv-1/accept")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/conversations/:id/decline", () => {
    it("declines conversation when authenticated", async () => {
      const conv = {
        id: "conv-1",
        participant1Id: "user-2",
        participant2Id: "user-1",
        status: "declined",
      };
      mockStorage.getOrCreateAppUser.mockResolvedValue(appUser);
      mockStorage.getConversationById.mockResolvedValue(conv);
      mockStorage.declineConversation.mockResolvedValue(conv);

      const res = await request
        .patch("/api/conversations/conv-1/decline")
        .set("Authorization", "Bearer user-1");

      expect(res.status).toBe(200);
    });
  });
});
