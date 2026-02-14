let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Spotify not connected');
  }
  return accessToken;
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
    headers: { 'User-Agent': 'Tastelog/1.0 (tastelog@replit.app)' },
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
    const data = await res.json();
    const front = data.images?.find((img: any) => img.front);
    return front?.thumbnails?.large || front?.image || data.images?.[0]?.image || "";
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
    headers: { 'User-Agent': 'Tastelog/1.0 (tastelog@replit.app)' },
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
