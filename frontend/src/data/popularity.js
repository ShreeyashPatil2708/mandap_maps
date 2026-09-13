// The order Explore lists pandals in: most visited and best known first. This
// is an editorial ranking, not measured footfall, so reorder it freely.
//
// Like the circuit stops and the homepage picks, names must match name_english
// in the backend dataset exactly. Pandals not listed here follow after, in the
// API's order (tier, then name), so a new record still appears.
//
// Rough bands: the Manache five in their traditional order, the city's big
// festival mandals, the Ashtavinayak and Morya Gosavi temples people travel out
// of Pune for, then the old city's smaller heritage temples and talims.

const POPULARITY = [
  // Manache Ganpati
  'Kasba Ganpati',
  'Tambdi Jogeshwari',
  'Guruji Talim Ganpati',
  'Tulshibaug Ganpati',
  'Kesariwada Ganpati',

  // The city's biggest festival draws
  'Dagdusheth Halwai Ganpati',
  'Tambat Ali Ganpati (Bhausaheb Rangari Ganpati)',
  'Akhil Mandai Mandal (Sharda Ganpati)',
  'Hutatma Babu Genu Ganpati (Navsacha Ganpati)',
  'Tvashta Kasar Ganpati Mandal',
  'Sarasbaug Siddhivinayak (Talyatla Ganpati)',
  'Chhatrapati Rajaram Mandal',
  'Hatti Ganpati Mandal',
  'Natu Baug Ganpati',
  'Navjawan Mitra Mandal',
  'Shanipar Ganpati (Bajirao Road Mandal)',
  'Jilbya Maruti Ganpati',
  'Nimbalkar Talim Ganpati',
  'Garud Ganpati Mandal',

  // Ashtavinayak and Morya Gosavi, outside the city
  'Pimpri-Chinchwad Ganpati (Chinchwad Devasthan)',
  'Morgaon Mayureshwar Ganpati',
  'Theur Chintamani Ganpati',
  'Ranjangaon Mahaganapati',
  'Ozar Vighnahar Ganpati',
  'Lenyadri Girijatmaj Ganpati',

  // Heritage temples and talims in and around the old city
  'Parvati Devachi Ganpati (Parvati Hill)',
  'Dashabhuja Ganapati Temple',
  'Chimnya Ganapati Temple',
  'Trishund Mayureshwar Ganapati',
  'Parvati Nandan Ganpati (Khinditla Ganpati)',
  'Peshwe Ganpati (Shaniwarwada Ganpati)',
  'Munjabacha Bol Ganpati',
  'Tambe Ganpati (Shrimant Tambe Mandal)',
  'Vishrambag Wada Ganpati',
  'Phadke Haud Ganpati',
  'Jotyachi Talim Ganpati',
  'Umbrya Ganapati Temple',
  'Kasba Peth Talim Ganpati',
  'Gajanan Ganpati Mandal',
  'Pimpri Ganpati (Morya Gosavi Peth Mandal)',
];

const RANK = new Map(POPULARITY.map((name, i) => [name, i]));

/** Sort position for a pandal: its place in the list, or after every listed one. */
export function popularityRank(g) {
  return RANK.has(g.name) ? RANK.get(g.name) : POPULARITY.length;
}

/** `ganpatis` in popularity order. Unlisted pandals keep their existing order. */
export function byPopularity(ganpatis) {
  return [...ganpatis].sort((a, b) => popularityRank(a) - popularityRank(b));
}

export default POPULARITY;
