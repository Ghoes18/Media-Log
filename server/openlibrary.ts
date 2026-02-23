export async function getTrendingBooks(limit = 10) {
  try {
    const url = `https://openlibrary.org/trending/weekly.json?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.works || []).slice(0, limit).map((doc: any) => ({
      externalId: doc.key || "",
      title: doc.title || "",
      creator: doc.author_name?.join(", ") || (doc.authors || []).map((a: any) => a.name || "").join(", ") || "Unknown",
      year: doc.first_publish_year?.toString() || "",
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : doc.cover_edition_key
          ? `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-L.jpg`
          : "",
      synopsis: "",
      tags: (doc.subject || []).slice(0, 3),
      type: "book" as const,
      rating: "",
    }));
  } catch (e) {
    console.error("getTrendingBooks error:", e);
    return [];
  }
}

export async function searchOpenLibraryBooks(query: string, limit = 10) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,subject,first_sentence`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs || []).map((doc: any) => ({
    externalId: doc.key,
    title: doc.title,
    creator: doc.author_name?.join(", ") || "Unknown",
    year: doc.first_publish_year?.toString() || "",
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : "",
    synopsis: doc.first_sentence?.join(" ") || "",
    tags: (doc.subject || []).slice(0, 3),
    type: "book" as const,
  }));
}

export async function getOpenLibraryAuthorWorks(authorKey: string, limit = 24) {
  try {
    const normalizedKey = authorKey.startsWith("/") ? authorKey : `/authors/${authorKey}`;
    const url = `https://openlibrary.org${normalizedKey}/works.json?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const entries = data.entries || [];
    return entries.slice(0, limit).map((work: any) => {
      const coverId = work.cover_id ?? work.covers?.[0];
      return {
      externalId: work.key || "",
      title: work.title || "",
      creator: "Unknown",
      year: String(work.first_publish_date || "").slice(0, 4) || "",
      coverUrl: coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : "",
      synopsis: "",
      tags: (work.subject || []).slice(0, 3),
      type: "book" as const,
      rating: "",
    };
    });
  } catch (e) {
    console.error("getOpenLibraryAuthorWorks error:", e);
    return [];
  }
}

export async function getOpenLibraryBook(workKey: string) {
  const url = `https://openlibrary.org${workKey}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  let coverUrl = "";
  if (data.covers && data.covers.length > 0) {
    coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
  }

  let synopsis = "";
  if (typeof data.description === "string") {
    synopsis = data.description;
  } else if (data.description?.value) {
    synopsis = data.description.value;
  }

  const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(data.title)}&limit=1&fields=author_name,first_publish_year`;
  const searchRes = await fetch(searchUrl);
  const searchData = searchRes.ok ? await searchRes.json() : { docs: [] };
  const doc = searchData.docs?.[0];

  return {
    externalId: workKey,
    title: data.title,
    creator: doc?.author_name?.join(", ") || "Unknown",
    year: doc?.first_publish_year?.toString() || "",
    coverUrl,
    synopsis,
    tags: (data.subjects || []).slice(0, 3).map((s: any) => typeof s === "string" ? s : s.name || ""),
    type: "book" as const,
  };
}

export interface OpenLibraryDetails {
  externalId: string;
  type: "book";
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  backdropUrl: string | null;
  synopsis: string;
  subjects: string[];
  editions: { publisher: string; publishDate: string; pages: number; language: string; isbn: string; format: string }[];
  rating: { average: number; count: number };
  authors: { key: string; name: string; bio: string; photo: string; birthDate: string }[];
  links: { title: string; url: string }[];
}

export async function getOpenLibraryDetails(workKey: string): Promise<OpenLibraryDetails | null> {
  const normalizedKey = workKey.startsWith("/") ? workKey : `/works/${workKey}`;
  try {
    const [workRes, editionsRes, ratingsRes] = await Promise.all([
      fetch(`https://openlibrary.org${normalizedKey}.json`),
      fetch(`https://openlibrary.org${normalizedKey}/editions.json?limit=10`),
      fetch(`https://openlibrary.org${normalizedKey}/ratings.json`),
    ]);
    if (!workRes.ok) return null;
    const data = await workRes.json();

    let synopsis = "";
    if (typeof data.description === "string") {
      synopsis = data.description;
    } else if (data.description?.value) {
      synopsis = data.description.value;
    }

    let coverUrl = "";
    if (data.covers && data.covers.length > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
    }

    const subjects = (data.subjects || []).slice(0, 12).map((s: any) => (typeof s === "string" ? s : s.name || ""));

    let editions: OpenLibraryDetails["editions"] = [];
    if (editionsRes.ok) {
      const editionsData = await editionsRes.json();
      const entries = editionsData.entries || editionsData.editions || [];
      editions = entries.slice(0, 10).map((e: any) => {
        const publishers = e.publishers || [];
        const publisher = Array.isArray(publishers) ? publishers[0] : publishers;
        const isbn = e.isbn_13?.[0] || e.isbn_10?.[0] || e.isbn?.[0] || "";
        const langs = e.languages || [];
        const langKey = Array.isArray(langs) ? langs[0]?.key : langs?.key;
        const language = typeof langKey === "string" ? langKey.replace(/^\/languages\//, "") : "";
        return {
          publisher: typeof publisher === "string" ? publisher : publisher?.name || "",
          publishDate: e.publish_date || "",
          pages: e.number_of_pages || 0,
          language,
          isbn,
          format: e.physical_format || "",
        };
      });
    }

    let rating = { average: 0, count: 0 };
    if (ratingsRes.ok) {
      const ratingsData = await ratingsRes.json();
      const summary = ratingsData.summary || {};
      rating = {
        average: summary.average ?? 0,
        count: summary.count ?? 0,
      };
    }

    const authorKeys = (data.authors || [])
      .map((a: any) => a.author?.key || a.key)
      .filter(Boolean)
      .slice(0, 5);
    const authorsData = await Promise.all(
      authorKeys.map(async (key: string) => {
        try {
          const res = await fetch(`https://openlibrary.org${key}.json`);
          if (!res.ok) return null;
          const a = await res.json();
          let bio = "";
          if (typeof a.bio === "string") bio = a.bio;
          else if (a.bio?.value) bio = a.bio.value;
          const olid = (a.key || key).replace(/^\/authors\//, "");
          const photo = a.photos?.length
            ? `https://covers.openlibrary.org/a/id/${a.photos[0]}-M.jpg`
            : olid ? `https://covers.openlibrary.org/a/olid/${olid}-M.jpg` : "";
          return {
            key,
            name: a.personal_name || a.name || "Unknown",
            bio: (bio || "").slice(0, 300),
            photo,
            birthDate: a.birth_date || "",
          };
        } catch {
          return null;
        }
      })
    );
    const authors = authorsData.filter(Boolean) as OpenLibraryDetails["authors"];

    const searchRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(data.title || "")}&limit=1&fields=author_name,first_publish_year`
    );
    const searchData = searchRes.ok ? await searchRes.json() : { docs: [] };
    const doc = searchData.docs?.[0];
    const creator = doc?.author_name?.join(", ") || authors.map((a) => a.name).join(", ") || "Unknown";
    const year = doc?.first_publish_year?.toString() || data.first_publish_date?.slice(0, 4) || "";

    const links: { title: string; url: string }[] = [{ title: "Open Library", url: `https://openlibrary.org${normalizedKey}` }];

    return {
      externalId: normalizedKey,
      type: "book",
      title: data.title || "",
      creator,
      year,
      coverUrl,
      backdropUrl: coverUrl || null,
      synopsis,
      subjects,
      editions,
      rating,
      authors,
      links,
    };
  } catch (e) {
    console.error("getOpenLibraryDetails error:", e);
    return null;
  }
}
