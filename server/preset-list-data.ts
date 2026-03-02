/**
 * Static data for preset lists. Expand lists as needed.
 * Oscar: add IMDb tt IDs. Emmy: add TMDB TV IDs. Albums: add Spotify album IDs.
 */

/** IMDb movie IDs for Academy Award Best Picture winners (subset; expand to full 97). */
export const OSCAR_BEST_PICTURE_IMDB_IDS: string[] = [
  "tt0018578", // Wings (1927)
  "tt0020629", // All Quiet on the Western Front (1930)
  "tt0021746", // Grand Hotel (1932)
  "tt0022958", // Cavalcade (1933)
  "tt0025316", // It Happened One Night (1934)
  "tt0026529", // Mutiny on the Bounty (1935)
  "tt0027996", // The Great Ziegfeld (1936)
  "tt0028944", // The Life of Emile Zola (1937)
  "tt0030287", // You Can't Take It with You (1938)
  "tt0031381", // Gone with the Wind (1939)
  "tt0032551", // Rebecca (1940)
  "tt0033467", // Citizen Kane (1941)
  "tt0034583", // Mrs. Miniver (1942)
  "tt0036868", // Casablanca (1943)
  "tt0038787", // Going My Way (1944)
  "tt0039689", // The Lost Weekend (1945)
  "tt0040897", // The Best Years of Our Lives (1946)
  "tt0040506", // Gentleman's Agreement (1947)
  "tt0040746", // Hamlet (1948)
  "tt0042192", // All the King's Men (1949)
  "tt0042593", // All About Eve (1950)
  "tt0044672", // An American in Paris (1951)
  "tt0047296", // The Greatest Show on Earth (1952)
  "tt0046359", // From Here to Eternity (1953)
  "tt0047522", // On the Waterfront (1954)
  "tt0048028", // Marty (1955)
  "tt0048947", // Around the World in 80 Days (1956)
  "tt0050083", // The Bridge on the River Kwai (1957)
  "tt0050825", // Gigi (1958)
  "tt0052618", // Ben-Hur (1959)
  "tt0053604", // The Apartment (1960)
  "tt0054331", // West Side Story (1961)
  "tt0056197", // Lawrence of Arabia (1962)
  "tt0056592", // Tom Jones (1963)
  "tt0061722", // My Fair Lady (1964)
  "tt0062622", // The Sound of Music (1965)
  "tt0060608", // A Man for All Seasons (1966)
  "tt0061811", // In the Heat of the Night (1967)
  "tt0063522", // Oliver! (1968)
  "tt0067093", // Midnight Cowboy (1969)
  "tt0066206", // Patton (1970)
  "tt0067328", // The French Connection (1971)
  "tt0068646", // The Godfather (1972)
  "tt0070510", // The Sting (1973)
  "tt0071562", // The Godfather Part II (1974)
  "tt0073486", // One Flew Over the Cuckoo's Nest (1975)
  "tt0075148", // Rocky (1976)
  "tt0075686", // Annie Hall (1977)
  "tt0077416", // The Deer Hunter (1978)
  "tt0078754", // Kramer vs. Kramer (1979)
  "tt0080594", // Ordinary People (1980)
  "tt0082846", // Chariots of Fire (1981)
  "tt0083987", // Gandhi (1982)
  "tt0086423", // Terms of Endearment (1983)
  "tt0087803", // Amadeus (1984)
  "tt0088763", // Out of Africa (1985)
  "tt0090605", // Platoon (1986)
  "tt0091167", // The Last Emperor (1987)
  "tt0091763", // Rain Man (1988)
  "tt0094612", // Driving Miss Daisy (1989)
  "tt0099653", // Dances with Wolves (1990)
  "tt0102926", // The Silence of the Lambs (1991)
  "tt0108052", // Unforgiven (1992)
  "tt0109830", // Forrest Gump (1994)
  "tt0110912", // Pulp Fiction (1994)
  "tt0114369", // Braveheart (1995)
  "tt0118799", // The English Patient (1996)
  "tt0118607", // Titanic (1997)
  "tt0120863", // Shakespeare in Love (1998)
  "tt0169547", // American Beauty (1999)
  "tt0172495", // Gladiator (2000)
  "tt0268978", // A Beautiful Mind (2001)
  "tt0299658", // Chicago (2002)
  "tt0327056", // The Lord of the Rings: The Return of the King (2003)
  "tt0375679", // Million Dollar Baby (2004)
  "tt0407887", // The Departed (2006)
  "tt0477348", // No Country for Old Men (2007)
  "tt1010048", // Slumdog Millionaire (2008)
  "tt0887912", // The Hurt Locker (2009)
  "tt0947798", // The King's Speech (2010)
  "tt0964517", // The Artist (2011)
  "tt1045658", // Argo (2012)
  "tt2024544", // 12 Years a Slave (2013)
  "tt2562232", // Birdman (2014)
  "tt2975590", // Spotlight (2015)
  "tt4034228", // Moonlight (2016)
  "tt4555426", // The Shape of Water (2017)
  "tt5164214", // Green Book (2018)
  "tt6751668", // Parasite (2019)
  "tt9770150", // Nomadland (2020)
  "tt10272386", // CODA (2021)
  "tt13640696", // Everything Everywhere All at Once (2022)
  "tt13238346", // Oppenheimer (2023)
];

/** TMDB TV show IDs for Emmy Outstanding Drama Series winners (subset). */
export const EMMY_DRAMA_TMDB_IDS: string[] = [
  "1396", // Breaking Bad
  "1399", // Game of Thrones
  "2734", // Law & Order
  "46261", // Mad Men
  "37680", // The Good Wife
  "67198", // The Crown
  "71728", // The Handmaid's Tale
  "75006", // Killing Eve
  "82856", // The Mandalorian
  "82809", // Ozark
  "87108", // Succession
  "95057", // Squid Game
  "60574", // Peaky Blinders
  "82809", // Ozark
  "85271", // The Crown
];

/** Spotify album IDs for "Greatest Albums" (Rolling Stone / critical consensus). Add real IDs from Spotify. */
export const GREATEST_ALBUMS_SPOTIFY_IDS: string[] = [
  "3nBk2bXGjtbDte4osFidkH", // Abbey Road - The Beatles
  "1Bw2tEcuPW3SfOQJ5n2aNp", // Kind of Blue - Miles Davis
  "2noRn2Aes5aoNVsU6iWThc", // Nevermind - Nirvana
  "5eJT0dLqJ9lUcfP6n2M0C8", // Thriller - Michael Jackson
  "2C5aa75N3p7nq3tIWW7GVo", // The Dark Side of the Moon - Pink Floyd
  "6i6folBtxKV28WX3msQ4FE", // Rumours - Fleetwood Mac
  "4LH4d3cOWNNsVw41Gqt2kv", // Back in Black - AC/DC
  "1btvpcqBkJr2PmcQ8P8e0S", // London Calling - The Clash
  "4a6DxkhmMvvEdPXJJ4nLKH", // Led Zeppelin IV
  "6sYJu1cE4NGtHPBSwvjXik", // Blonde on Blonde - Bob Dylan
  "1kuzBk5KfFKxR2Lpnv8FZ0", // The Rise and Fall of Ziggy Stardust
  "2C5aa75N3p7nq3tIWW7GVo", // (expand with more Spotify album IDs)
  "3nBk2bXGjtbDte4osFidkH",
  "1Bw2tEcuPW3SfOQJ5n2aNp",
  "2noRn2Aes5aoNVsU6iWThc",
  "5eJT0dLqJ9lUcfP6n2M0C8",
  "6i6folBtxKV28WX3msQ4FE",
  "4LH4d3cOWNNsVw41Gqt2kv",
  "1btvpcqBkJr2PmcQ8P8e0S",
  "4a6DxkhmMvvEdPXJJ4nLKH",
  "6sYJu1cE4NGtHPBSwvjXik",
];
