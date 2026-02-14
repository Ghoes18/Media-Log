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
