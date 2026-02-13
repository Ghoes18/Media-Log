# Tastelog

## Overview
A Letterboxd-inspired web app for reviewing and sharing taste across multiple media types (movies, anime, books, TV shows). Users can create profiles, maintain watchlists, follow other users, like reviews, and write short reviews.

## Current State
Full-stack application with PostgreSQL database, Express API, and React frontend. All pages fetch from real API endpoints.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS v4, shadcn/ui, wouter router, TanStack Query, framer-motion
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon)
- **Design**: Glass UI aesthetic with dark mode default, purple primary (#8B5CF6), teal accent (#14B8A6)

## Key Files
- `shared/schema.ts` - Database schema (users, media, reviews, watchlist, favorites, follows, reviewLikes)
- `server/storage.ts` - DatabaseStorage class with all CRUD operations
- `server/routes.ts` - Express API routes (all prefixed with /api)
- `server/seed.ts` - Seeds 4 users, 18 media items, 14 reviews, favorites, follows, watchlist
- `server/db.ts` - Drizzle database connection
- `client/src/pages/` - 6 pages: home, discover, profile, media-detail, watchlist, review-create

## API Routes
- GET /api/users/:id, GET /api/users/username/:username
- GET /api/media, GET /api/media/:id, GET /api/media/:id/reviews
- GET /api/reviews/recent, GET /api/users/:id/reviews
- POST /api/reviews
- GET/POST/DELETE /api/users/:id/watchlist/:mediaId
- GET/PUT /api/users/:id/favorites
- GET/POST/DELETE /api/users/:followerId/follow/:followingId
- POST/DELETE /api/reviews/:reviewId/like

## User Preferences
- Dark mode by default
- Glass UI aesthetic with backdrop-filter blur
- Heart icons for likes, star icons for ratings
- No auth system - current user is "alice"
