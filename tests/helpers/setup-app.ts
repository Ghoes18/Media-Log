import { vi } from "vitest";
import express from "express";
import { createServer } from "http";
import supertest, { type SuperTest, type Test } from "supertest";
import { createMockStorage } from "./mock-storage";
import { registerRoutes } from "../../server/routes";

vi.mock("../../server/storage", async () => {
  const { createMockStorage } = await import("./mock-storage");
  const storage = createMockStorage();
  (globalThis as { __mockStorage?: ReturnType<typeof createMockStorage> }).__mockStorage = storage;
  return { storage };
});

export const mockStorage = new Proxy({} as ReturnType<typeof createMockStorage>, {
  get(_, prop) {
    return (globalThis as { __mockStorage?: ReturnType<typeof createMockStorage> }).__mockStorage?.[prop as keyof ReturnType<typeof createMockStorage>];
  },
});

vi.mock("../../server/auth", () => ({
  authMiddleware: () => (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (token) {
      req.authUserId = token;
      req.authPayload = { sub: token, name: "Test", email: "test@test.com" };
    }
    next();
  },
}));

vi.mock("../../server/ws", () => ({ pushToUser: vi.fn() }));

export async function createTestApp(): Promise<SuperTest<Test>> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  return supertest(app);
}
