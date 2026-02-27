# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (Express + Vite on port 5000)
npm run check      # TypeScript type checking (tsc --noEmit)
npm run build      # Production build via script/build.ts
npm run start      # Run production build (dist/index.cjs)
npm run db:push    # Push schema changes directly to DB (drizzle-kit push)
```

There are no tests.

For migrations, prefer `drizzle-kit migrate` but if it fails because tables already exist (the DB was originally set up via `db:push`), apply SQL statements directly and track them by inserting into `__drizzle_migrations`.

## Architecture

### Single-server dev setup
`npm run dev` runs Express on port 5000. In development, Vite's dev server is mounted **inside** Express as middleware (see `server/vite.ts`) — there is no separate Vite process. All API routes must be registered before the Vite middleware to prevent catch-all interference.

### Shared schema as source of truth
`shared/schema.ts` defines all Drizzle table definitions, Zod insert schemas, and TypeScript types. Both the server and client build from this single file. When adding a table: define it here first, export its insert schema and `$inferSelect` type, then create the migration SQL.

### Storage layer — never query DB directly from routes
All database access goes through the `storage` singleton in `server/storage.ts`. It exports an `IStorage` interface and a `DatabaseStorage` class. Adding a new DB operation means:
1. Adding the method signature to `IStorage`
2. Implementing it in `DatabaseStorage`
3. Calling `storage.methodName()` from routes

### Route registration pattern
All routes are in `registerRoutes()` in `server/routes.ts`. Auth middleware is applied to all `/api` routes as optional (`authMiddleware(false)`). Use the `requireAuth` helper for protected endpoints. Always call `storage.getOrCreateAppUser(authReq.authUserId!, {})` to get the app-level user from the JWT subject.

Route params need explicit casting: `req.params.id as string` (Express types them as `string | string[]`).

### Authentication flow
- **Server**: Neon Auth JWT verified via JWKS from `NEON_AUTH_BASE_URL`. `verifyNeonToken()` returns `{ sub, email, name }`. The middleware attaches `authUserId` and `authPayload` to the request.
- **Client**: `authClient` (in `client/src/lib/auth.ts`) manages the session. Auth headers are fetched in `apiRequest()` and `getQueryFn()` from `client/src/lib/queryClient.ts` and passed as `Authorization: Bearer <token>`.

### TanStack Query conventions
- `staleTime: Infinity` — no automatic background refetches; all cache updates are manual via `queryClient.invalidateQueries()`
- The default `queryFn` in `getQueryFn` joins the `queryKey` array with `/` to form the URL — so `queryKey: ["/api/lists", id]` fetches `/api/lists/id`
- For mutations, always use `apiRequest(method, url, body)` from `queryClient.ts`

### WebSocket push
- **Server**: `pushToUser(userId, event)` in `server/ws.ts` sends to all open sockets for a user. Extend the `WsEvent` union type when adding new event types.
- **Client**: `WebSocketProvider` in `client/src/lib/websocket.tsx` handles reconnect with exponential backoff. Extend `WsEventType` and add cache invalidation in the `ws.onmessage` handler when adding new events.

### Media deduplication
External media (from TMDB, Spotify, etc.) is stored in the `media` table via `storage.ensureMedia()`, which deduplicates by `(externalId, type)`. Always call `POST /api/media/ensure` from the client before using a mediaId.

### Path aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

### Environment variables
- `DATABASE_URL` — required, PostgreSQL connection string (Neon)
- `NEON_AUTH_BASE_URL` — required for authentication JWKS

## Key files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | All DB tables, Zod schemas, TypeScript types |
| `server/storage.ts` | `IStorage` interface + `DatabaseStorage` — all DB logic |
| `server/routes.ts` | All Express route handlers |
| `server/ws.ts` | WebSocket server, `WsEvent` union, `pushToUser()` |
| `client/src/lib/websocket.tsx` | WS client, `WsEventType`, cache invalidation |
| `client/src/lib/queryClient.ts` | `apiRequest()`, `QueryClient` config |
| `client/src/App.tsx` | Wouter routes (uses `Switch`/`Route` from wouter) |
| `client/src/components/BottomNav.tsx` | Bottom navigation bar |
| `migrations/meta/_journal.json` | Drizzle migration journal (append new entries manually) |
