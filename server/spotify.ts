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

export async function getSpotifyArtistAlbums(artistId: string, limit = 24) {
  try {
    const data = await spotifyFetch(
      `/artists/${artistId}/albums?limit=50&include_groups=album,single`
    );
    return (data.items || []).slice(0, limit).map((album: any) => ({
      externalId: album.id,
      title: album.name,
      creator: (album.artists || []).map((a: { name?: string }) => a.name).join(", "),
      year: album.release_date?.slice(0, 4) || "",
      coverUrl: album.images?.[0]?.url || "",
      tags: album.genres?.length ? album.genres : [],
      type: "music" as const,
    }));
  } catch {
    return [];
  }
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

export interface SpotifyAlbumDetails {
  externalId: string;
  type: "music";
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  backdropUrl: string | null;
  synopsis: string;
  genres: string[];
  tracks: { name: string; trackNumber: number; durationMs: number; artists: string; previewUrl: string | null }[];
  label: string;
  copyrights: string[];
  popularity: number;
  totalTracks: number;
  releaseDate: string;
  releaseDatePrecision: string;
  externalUrl: string | null;
  albumType: string;
  artists: { id: string; name: string; externalUrl: string }[];
  images: { url: string; width: number; height: number }[];
}

export async function getSpotifyAlbumDetails(albumId: string): Promise<SpotifyAlbumDetails | null> {
  try {
    const album = await spotifyFetch(`/albums/${albumId}`);
    let genres: string[] = album.genres || [];
    if (genres.length === 0 && album.artists?.[0]?.id) {
      try {
        const artist = await spotifyFetch(`/artists/${album.artists[0].id}`);
        genres = artist.genres || [];
      } catch {
        // ignore
      }
    }
    const tracks = (album.tracks?.items || []).map((t: any) => ({
      name: t.name || "",
      trackNumber: t.track_number || 0,
      durationMs: t.duration_ms || 0,
      artists: (t.artists || []).map((a: any) => a.name).join(", "),
      previewUrl: t.preview_url || null,
    }));
    const copyrights = (album.copyrights || []).map((c: any) => c.text).filter(Boolean);
    const artists = (album.artists || []).map((a: any) => ({
      id: a.id || "",
      name: a.name || "",
      externalUrl: a.external_urls?.spotify || "",
    }));
    const images = (album.images || []).map((img: any) => ({
      url: img.url,
      width: img.width || 0,
      height: img.height || 0,
    }));
    const year = album.release_date?.slice(0, 4) || "";
    const creator = artists.map((a: { name?: string }) => a.name).join(", ");
    return {
      externalId: album.id,
      type: "music",
      title: album.name || "",
      creator,
      year,
      coverUrl: album.images?.[0]?.url || "",
      backdropUrl: album.images?.[0]?.url || null,
      synopsis: album.total_tracks
        ? `${album.total_tracks} tracks. Released ${album.release_date || "unknown"}.${album.label ? ` Label: ${album.label}.` : ""}`
        : "",
      genres,
      tracks,
      label: album.label || "",
      copyrights,
      popularity: album.popularity ?? 0,
      totalTracks: album.total_tracks ?? 0,
      releaseDate: album.release_date || "",
      releaseDatePrecision: album.release_date_precision || "year",
      externalUrl: album.external_urls?.spotify || null,
      albumType: album.album_type || "album",
      artists,
      images,
    };
  } catch {
    return null;
  }
}
