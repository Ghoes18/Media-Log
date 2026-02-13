import { db } from "./db";
import { users, media, reviews, favorites, follows, watchlist } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existingUser] = await db.select().from(users).limit(1);
  if (existingUser) return;

  const [alice, bob, carol, dave] = await db
    .insert(users)
    .values([
      { username: "alice", displayName: "Alice Chen", bio: "Film buff & anime lover. Always watching something.", avatarUrl: "" },
      { username: "bob", displayName: "Bob Tanaka", bio: "Bookworm. TV binger. Occasional movie goer.", avatarUrl: "" },
      { username: "carol", displayName: "Carol Rivera", bio: "Anime enthusiast and manga collector", avatarUrl: "" },
      { username: "dave", displayName: "Dave Kim", bio: "TV show addict. Currently watching too many shows.", avatarUrl: "" },
    ])
    .returning();

  const mediaRows = await db
    .insert(media)
    .values([
      { type: "movie", title: "Inception", creator: "Christopher Nolan", year: "2010", coverGradient: "from-blue-600 to-purple-900", tags: ["Sci-Fi", "Thriller"], rating: "8.8" },
      { type: "movie", title: "Parasite", creator: "Bong Joon-ho", year: "2019", coverGradient: "from-emerald-800 to-yellow-600", tags: ["Drama", "Thriller"], rating: "8.5" },
      { type: "movie", title: "Spirited Away", creator: "Hayao Miyazaki", year: "2001", coverGradient: "from-sky-400 to-indigo-700", tags: ["Animation", "Fantasy"], rating: "8.6" },
      { type: "movie", title: "The Grand Budapest Hotel", creator: "Wes Anderson", year: "2014", coverGradient: "from-pink-400 to-rose-700", tags: ["Comedy", "Drama"], rating: "8.1" },
      { type: "movie", title: "Blade Runner 2049", creator: "Denis Villeneuve", year: "2017", coverGradient: "from-orange-500 to-amber-900", tags: ["Sci-Fi", "Drama"], rating: "8.0" },

      { type: "anime", title: "Attack on Titan", creator: "Hajime Isayama", year: "2013", coverGradient: "from-red-700 to-gray-900", tags: ["Action", "Dark Fantasy"], rating: "9.0" },
      { type: "anime", title: "Steins;Gate", creator: "White Fox", year: "2011", coverGradient: "from-green-400 to-teal-800", tags: ["Sci-Fi", "Thriller"], rating: "9.1" },
      { type: "anime", title: "Cowboy Bebop", creator: "Sunrise", year: "1998", coverGradient: "from-indigo-500 to-violet-900", tags: ["Action", "Sci-Fi"], rating: "8.9" },
      { type: "anime", title: "Fullmetal Alchemist: Brotherhood", creator: "Bones", year: "2009", coverGradient: "from-yellow-500 to-red-800", tags: ["Action", "Adventure"], rating: "9.2" },
      { type: "anime", title: "Neon Genesis Evangelion", creator: "Gainax", year: "1995", coverGradient: "from-purple-600 to-green-500", tags: ["Mecha", "Psychological"], rating: "8.5" },

      { type: "book", title: "Dune", creator: "Frank Herbert", year: "1965", coverGradient: "from-amber-500 to-orange-800", tags: ["Sci-Fi", "Epic"], rating: "8.7" },
      { type: "book", title: "1984", creator: "George Orwell", year: "1949", coverGradient: "from-gray-600 to-red-900", tags: ["Dystopian", "Political"], rating: "8.4" },
      { type: "book", title: "The Name of the Wind", creator: "Patrick Rothfuss", year: "2007", coverGradient: "from-emerald-600 to-cyan-900", tags: ["Fantasy", "Adventure"], rating: "8.6" },
      { type: "book", title: "Project Hail Mary", creator: "Andy Weir", year: "2021", coverGradient: "from-blue-400 to-purple-700", tags: ["Sci-Fi", "Adventure"], rating: "8.8" },

      { type: "tv", title: "Breaking Bad", creator: "Vince Gilligan", year: "2008", coverGradient: "from-green-600 to-yellow-800", tags: ["Drama", "Crime"], rating: "9.5" },
      { type: "tv", title: "The Bear", creator: "Christopher Storer", year: "2022", coverGradient: "from-slate-500 to-orange-700", tags: ["Drama", "Comedy"], rating: "8.7" },
      { type: "tv", title: "Severance", creator: "Dan Erickson", year: "2022", coverGradient: "from-cyan-400 to-blue-900", tags: ["Sci-Fi", "Thriller"], rating: "8.7" },
      { type: "tv", title: "Shogun", creator: "Rachel Kondo", year: "2024", coverGradient: "from-red-600 to-stone-800", tags: ["Drama", "Historical"], rating: "8.6" },
    ])
    .returning();

  const mediaMap: Record<string, string> = {};
  for (const m of mediaRows) {
    mediaMap[m.title] = m.id;
  }

  await db.insert(reviews).values([
    { userId: alice.id, mediaId: mediaMap["Inception"], rating: 5, body: "A mind-bending masterpiece that rewards multiple viewings. The layered dream sequences are pure cinema magic." },
    { userId: alice.id, mediaId: mediaMap["Attack on Titan"], rating: 4, body: "Incredible world-building and one of the best plot twists in anime history. The final season delivers." },
    { userId: alice.id, mediaId: mediaMap["Dune"], rating: 5, body: "Herbert created an entire universe of politics, religion, and ecology. Essential sci-fi reading." },
    { userId: bob.id, mediaId: mediaMap["Breaking Bad"], rating: 5, body: "The greatest TV show ever made. Walter White's transformation is Shakespearean in its tragedy." },
    { userId: bob.id, mediaId: mediaMap["1984"], rating: 4, body: "More relevant now than ever. Orwell's vision is chilling and prophetic." },
    { userId: bob.id, mediaId: mediaMap["Parasite"], rating: 5, body: "A genre-defying film that seamlessly blends dark comedy with social commentary. Every frame is intentional." },
    { userId: carol.id, mediaId: mediaMap["Steins;Gate"], rating: 5, body: "The time travel mechanics are brilliant and the character development is top-tier. El Psy Kongroo!" },
    { userId: carol.id, mediaId: mediaMap["Fullmetal Alchemist: Brotherhood"], rating: 5, body: "Perfect anime. The story, characters, animation, and themes all come together flawlessly." },
    { userId: carol.id, mediaId: mediaMap["Cowboy Bebop"], rating: 5, body: "Style, substance, and the best soundtrack in anime. See you space cowboy..." },
    { userId: dave.id, mediaId: mediaMap["The Bear"], rating: 4, body: "Incredibly intense. The single-shot episode in season 2 is some of the best TV I've ever seen." },
    { userId: dave.id, mediaId: mediaMap["Severance"], rating: 5, body: "The most original sci-fi concept in years. Every episode leaves you questioning reality." },
    { userId: dave.id, mediaId: mediaMap["Shogun"], rating: 5, body: "A masterclass in historical drama. The attention to cultural detail is extraordinary." },
    { userId: alice.id, mediaId: mediaMap["Spirited Away"], rating: 5, body: "Miyazaki's magnum opus. Every frame is a painting and the story resonates at any age." },
    { userId: bob.id, mediaId: mediaMap["Project Hail Mary"], rating: 5, body: "Could not put this down. The science is fascinating and the friendship at its core is deeply moving." },
  ]);

  await db.insert(favorites).values([
    { userId: alice.id, mediaId: mediaMap["Inception"], position: 0 },
    { userId: alice.id, mediaId: mediaMap["Spirited Away"], position: 1 },
    { userId: alice.id, mediaId: mediaMap["Attack on Titan"], position: 2 },
    { userId: alice.id, mediaId: mediaMap["Dune"], position: 3 },
    { userId: bob.id, mediaId: mediaMap["Breaking Bad"], position: 0 },
    { userId: bob.id, mediaId: mediaMap["1984"], position: 1 },
    { userId: bob.id, mediaId: mediaMap["Project Hail Mary"], position: 2 },
  ]);

  await db.insert(follows).values([
    { followerId: alice.id, followingId: bob.id },
    { followerId: alice.id, followingId: carol.id },
    { followerId: bob.id, followingId: alice.id },
    { followerId: carol.id, followingId: alice.id },
    { followerId: dave.id, followingId: alice.id },
    { followerId: dave.id, followingId: carol.id },
  ]);

  await db.insert(watchlist).values([
    { userId: alice.id, mediaId: mediaMap["Blade Runner 2049"] },
    { userId: alice.id, mediaId: mediaMap["The Bear"] },
    { userId: bob.id, mediaId: mediaMap["Severance"] },
    { userId: bob.id, mediaId: mediaMap["Cowboy Bebop"] },
  ]);

  console.log("Database seeded successfully!");
}
