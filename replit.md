# Tastelog

## Overview
A Letterboxd-inspired web app for reviewing and sharing taste across multiple media types (movies, anime, books, TV shows, music). Users can create profiles, maintain watchlists, follow other users, like reviews, and write short reviews.

## Current State
Full-stack application with PostgreSQL database, Express API, and React frontend. All pages fetch from real API endpoints. External APIs integrated for media data.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS v4, shadcn/ui, wouter router, TanStack Query, framer-motion
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon)
- **Design**: Glass UI aesthetic with dark mode default, purple primary (#8B5CF6), teal accent (#14B8A6)
- **External APIs**:
  - TMDB API (movies, TV shows, anime) - covers and synopses
  - Open Library API (books) - covers and synopses, search endpoint
  - Spotify API / MusicBrainz fallback (music) - album covers, search endpoint

## Key Files
- `shared/schema.ts` - Database schema (users, media, reviews, watchlist, favorites, follows, reviewLikes)
- `server/storage.ts` - DatabaseStorage class with all CRUD operations
- `server/routes.ts` - Express API routes (all prefixed with /api)
- `server/tmdb.ts` - TMDB API helper (trending + search for movies, TV, anime with 30min cache)
- `server/seed.ts` - Seeds 4 users, 22 media items (5 movies, 5 anime, 4 books, 4 TV, 4 music), 16 reviews
- `server/spotify.ts` - Spotify connector with MusicBrainz/Cover Art Archive fallback
- `server/openlibrary.ts` - Open Library search, trending, and book detail fetching
- `server/db.ts` - Drizzle database connection
- `client/src/pages/` - 6 pages: home, discover, profile, media-detail, watchlist, review-create

## API Routes
- GET /api/trending/:type (movie|tv|anime|book|music|all) - fetches trending content from external APIs with caching
- GET /api/search/all?q=&type= - unified real-time search across TMDB, Open Library, Spotify/MusicBrainz
- GET /api/users/top-reviewers, GET /api/users/:id, GET /api/users/username/:username
- GET /api/media, GET /api/media/:id, GET /api/media/:id/reviews
- GET /api/reviews/popular, GET /api/reviews/recent, GET /api/users/:id/reviews
- POST /api/reviews
- GET/POST/DELETE /api/users/:id/watchlist/:mediaId
- GET/PUT /api/users/:id/favorites
- GET/POST/DELETE /api/users/:followerId/follow/:followingId
- POST/DELETE /api/reviews/:reviewId/like
- GET /api/search/music?q= (Spotify with MusicBrainz fallback)
- GET /api/search/music/:albumId
- GET /api/search/books?q= (Open Library)
- GET /api/search/books/work/:workId

## Home Page Sections
- Hero with real-time search (debounced 300ms), category browse cards, trending media grid with tabs
- Media grid shows trending/popular content from external APIs (TMDB, Open Library, Spotify/MusicBrainz)
- "Popular Reviews This Week" (sorted by likes)
- Sidebar: profile preview, favorites, Top Reviewers (ranked by review count), watchlist

## External API Integration
- **TMDB**: Trending movies/TV via `/trending/{type}/week`, anime via `/discover/tv?with_genres=16`, search via `/search/{type}`
- **Open Library**: Trending books via `/trending/weekly.json`, search via `/search.json`
- **Spotify/MusicBrainz**: Music search with MusicBrainz + Cover Art Archive fallback
- **Caching**: 30-minute in-memory TTL cache for trending + search results to avoid API rate limits

## Running locally
- The app requires PostgreSQL. Set `DATABASE_URL` (e.g. `postgresql://user:pass@localhost:5432/medialog`) or run Postgres on `localhost:5432`.
- If the server fails to start with "Cannot connect to PostgreSQL", start PostgreSQL or point `DATABASE_URL` at a running database (e.g. [Neon](https://neon.tech)).
- **Auth**: Uses Neon Auth (Better Auth). Set `NEON_AUTH_BASE_URL` and `VITE_NEON_AUTH_URL` to your Neon Auth URL (from Neon Console → Project → Auth → Configuration). Add your app origin (e.g. `http://localhost:5000`) to trusted domains in the Neon Console so sign-in redirects work.

## User Preferences
- Dark mode by default
- Glass UI aesthetic with backdrop-filter blur
- Heart icons for likes, star icons for ratings
- No auth system - current user is "alice"
