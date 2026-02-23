let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresInMs = (data.expires_in - 60) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresInMs,
  };
  return cachedToken.token;
}

async function spotifyFetch(endpoint: string) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify API ${res.status}: ${body}`);
  }
  return res.json();
}

async function musicBrainzSearch(query: string, limit = 10) {
  const luceneQuery = `release-group:"${query}" OR artist:"${query}"`;
  const url = `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(luceneQuery)}&type=album&limit=${limit}&fmt=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Tastelog/1.0 (https://github.com/tastelog)" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data["release-groups"] || [];
}

async function getCoverArt(mbid: string): Promise<string> {
  try {
    const res = await fetch(`https://coverartarchive.org/release-group/${mbid}`, {
      redirect: "follow",
    });
    if (!res.ok) return "";
    let data: any;
    const text = await res.text();
    if (text.startsWith("See: ")) {
      const redirectUrl = text.replace("See: ", "").trim();
      const res2 = await fetch(redirectUrl);
      if (!res2.ok) return "";
      data = await res2.json();
    } else {
      data = JSON.parse(text);
    }
    const front = data.images?.find((img: any) => img.front);
    const url = front?.thumbnails?.["500"] || front?.thumbnails?.large || front?.image || data.images?.[0]?.image || "";
    return url.replace(/^http:\/\//, "https://");
  } catch {
    return "";
  }
}

export async function searchSpotifyAlbums(query: string, limit = 10) {
  try {
    const data = await spotifyFetch(
      `/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`
    );
    return (data.albums?.items || []).map((album: any) => ({
      externalId: album.id,
      title: album.name,
      creator: (album.artists || []).map((a: any) => a.name).join(", "),
      year: album.release_date?.slice(0, 4) || "",
      coverUrl: album.images?.[0]?.url || "",
      tags: album.genres?.length ? album.genres : [],
      type: "music" as const,
    }));
  } catch {
    return searchMusicBrainz(query, limit);
  }
}

export async function searchMusicBrainz(query: string, limit = 10) {
  const groups = await musicBrainzSearch(query, limit);
  const results = await Promise.all(
    groups.map(async (rg: any) => {
      const coverUrl = await getCoverArt(rg.id);
      return {
        externalId: rg.id,
        title: rg.title,
        creator: (rg["artist-credit"] || []).map((ac: any) => ac.name || ac.artist?.name).join(", "),
        year: rg["first-release-date"]?.slice(0, 4) || "",
        coverUrl,
        tags: (rg.tags || []).slice(0, 3).map((t: any) => t.name),
        type: "music" as const,
      };
    })
  );
  return results;
}

export async function getSpotifyAlbum(albumId: string) {
  try {
    const album = await spotifyFetch(`/albums/${albumId}`);
    return {
      externalId: album.id,
      title: album.name,
      creator: (album.artists || []).map((a: any) => a.name).join(", "),
      year: album.release_date?.slice(0, 4) || "",
      coverUrl: album.images?.[0]?.url || "",
      synopsis: `${album.total_tracks} tracks. Released ${album.release_date}. Label: ${album.label}.`,
      tags: album.genres?.length ? album.genres : [],
      type: "music" as const,
    };
  } catch {
    return getMusicBrainzAlbum(albumId);
  }
}

export async function getMusicBrainzAlbum(mbid: string) {
  const url = `https://musicbrainz.org/ws/2/release-group/${mbid}?inc=artists+tags&fmt=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Tastelog/1.0 (https://github.com/tastelog)" },
  });
  if (!res.ok) return null;
  const rg = await res.json();
  const coverUrl = await getCoverArt(mbid);
  return {
    externalId: rg.id,
    title: rg.title,
    creator: (rg["artist-credit"] || []).map((ac: any) => ac.name || ac.artist?.name).join(", "),
    year: rg["first-release-date"]?.slice(0, 4) || "",
    coverUrl,
    synopsis: `${rg["primary-type"] || "Album"} by ${(rg["artist-credit"] || []).map((ac: any) => ac.name).join(", ")}, released ${rg["first-release-date"] || "unknown"}.`,
    tags: (rg.tags || []).slice(0, 3).map((t: any) => t.name),
    type: "music" as const,
  };
}
