// Suggested darshan circuits. This is presentation config, not data: each stop
// references a Ganpati by its English name only. The actual records (history,
// coordinates, significance, timings) stay server-side and are resolved from
// the API at runtime (see components/Circuits.jsx). Nothing valuable ships here,
// only the shape of a walking route.
//
// Stop names must match name_english in the backend dataset exactly, so they
// resolve to a live record and become tappable. Every stop here has a map pin,
// so the card can show a real walking distance.
//
// Order: the Manache walk keeps the traditional order. The others were ordered
// for the shortest walk with optimizeOrder (data/walk.js) from their first stop,
// so re-running it on these lists changes nothing.
//
// `time` is the whole outing including darshan and crowds, not just the walk.
// The walking distance is worked out from the records, never typed in here.

const CIRCUITS = [
  {
    id: 'manache-morning-darshan',
    name: 'Manache Ganpati Morning Darshan',
    time: '~2 hours',
    bestTime: 'Early morning, before the crowds build',
    note: 'All five Manache Ganpati in their traditional order, the way Pune has visited them for over a century.',
    stops: [
      'Kasba Ganpati',
      'Tambdi Jogeshwari',
      'Guruji Talim Ganpati',
      'Tulshibaug Ganpati',
      'Kesariwada Ganpati',
    ],
  },
  {
    id: 'manache-and-old-city-greats',
    name: 'Manache 5 and the Old City Greats',
    time: '~3 hours',
    bestTime: 'Morning, or early evening before 7 PM',
    note: 'The Manache five with Dagdusheth, Bhausaheb Rangari and Jilbya Maruti folded in, so a half day covers the names everyone asks about.',
    stops: [
      'Kasba Ganpati',
      'Tambat Ali Ganpati (Bhausaheb Rangari Ganpati)',
      'Dagdusheth Halwai Ganpati',
      'Tambdi Jogeshwari',
      'Guruji Talim Ganpati',
      'Tulshibaug Ganpati',
      'Jilbya Maruti Ganpati',
      'Kesariwada Ganpati',
    ],
  },
  {
    id: 'mandai-metro-quick-darshan',
    name: 'Mandai Metro Quick Darshan',
    time: '~1.5 hours',
    bestTime: 'Any time. Start and end at Mandai metro',
    note: 'Short on time? Step out at Mandai and see four of the biggest names within a kilometre.',
    stops: [
      'Akhil Mandai Mandal (Sharda Ganpati)',
      'Hutatma Babu Genu Ganpati (Navsacha Ganpati)',
      'Dagdusheth Halwai Ganpati',
      'Kasba Ganpati',
    ],
  },
  {
    id: 'evening-lights-and-grand-pandals',
    name: 'Evening Lights and Grand Pandals',
    time: '~3.5 hours',
    bestTime: 'After 7 PM, when the lighting is on',
    note: 'For the night crowd: the biggest decorations and light displays, ending on the Sadashiv Peth side.',
    stops: [
      'Akhil Mandai Mandal (Sharda Ganpati)',
      'Hutatma Babu Genu Ganpati (Navsacha Ganpati)',
      'Dagdusheth Halwai Ganpati',
      'Tambat Ali Ganpati (Bhausaheb Rangari Ganpati)',
      'Jilbya Maruti Ganpati',
      'Natu Baug Ganpati',
      'Shanipar Ganpati (Bajirao Road Mandal)',
      'Chhatrapati Rajaram Mandal',
    ],
  },
  {
    id: 'sadashiv-peth-dekhava-walk',
    name: 'Sadashiv Peth Dekhava Walk',
    time: '~2.5 hours',
    bestTime: 'Evening, when the live dekhavas run',
    note: 'Live plays, moving displays and themed pandals packed into a few lanes of Sadashiv Peth.',
    stops: [
      'Hatti Ganpati Mandal',
      'Chhatrapati Rajaram Mandal',
      'Navjawan Mitra Mandal',
      'Shanipar Ganpati (Bajirao Road Mandal)',
      'Nimbalkar Talim Ganpati',
      'Chimnya Ganapati Temple',
      'Natu Baug Ganpati',
    ],
  },
  {
    id: 'complete-peth-yatra',
    name: 'The Complete Peth Yatra',
    time: '~5 hours',
    bestTime: 'A long evening, from 5 PM onwards',
    note: 'Eleven of the old city’s most important Ganpati in one unbroken walk, Manache five included.',
    stops: [
      'Kasba Ganpati',
      'Tambat Ali Ganpati (Bhausaheb Rangari Ganpati)',
      'Dagdusheth Halwai Ganpati',
      'Tambdi Jogeshwari',
      'Guruji Talim Ganpati',
      'Tulshibaug Ganpati',
      'Hutatma Babu Genu Ganpati (Navsacha Ganpati)',
      'Akhil Mandai Mandal (Sharda Ganpati)',
      'Jilbya Maruti Ganpati',
      'Shanipar Ganpati (Bajirao Road Mandal)',
      'Kesariwada Ganpati',
    ],
  },
];

export default CIRCUITS;
