import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env file in the project root (e.g. from Neon: DATABASE_URL=postgresql://...)."
  );
}

const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
