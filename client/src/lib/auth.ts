import { createClient } from "@neondatabase/neon-js";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

export const authClient = authUrl
  ? createClient({
      auth: { url: authUrl },
      dataApi: { url: authUrl.replace(/\/auth\/?$/, "") + "/rest/v1" },
    })
  : null;

export type AuthClient = NonNullable<typeof authClient>;
