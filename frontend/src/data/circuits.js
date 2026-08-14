// Suggested darshan circuits. This is presentation config, not data: each stop
// references a Ganpati by its English name only. The actual records (history,
// coordinates, significance, timings) stay server-side and are resolved from
// the API at runtime (see components/Circuits.jsx). Nothing valuable ships here,
// only the shape of a walking route.
//
// Stop names must match name_english in the backend dataset exactly, so they
// resolve to a live record and become tappable.

const CIRCUITS = [
  {
    id: 'tulshibaug-corridor',
    name: 'Tulshibaug Corridor',
    time: '2-3 hours',
    distance: '~600 m walk',
    note: 'A tight evening loop through the busy Tulshibaug lanes.',
    stops: [
      'Tambdi Jogeshwari',
      'Guruji Talim Ganpati',
      'Tulshibaug Ganpati',
      'Jilbya Maruti Ganpati',
      'Dagdusheth Halwai Ganpati',
    ],
  },
  {
    id: 'kasba-heritage-walk',
    name: 'Kasba Peth Heritage Walk',
    time: '',
    distance: '~1 km walk',
    note: 'A morning walk that pairs naturally with a Shaniwarwada visit.',
    stops: ['Kasba Ganpati', 'Phadke Haud Ganpati', 'Shanipar Ganpati (Bajirao Road Mandal)'],
  },
  {
    id: 'full-manache-darshan',
    name: 'Full Manache Darshan',
    time: '6-8 hours',
    distance: 'All 5 Manache',
    note: 'All five Manache Ganpatis in their traditional order.',
    stops: [
      'Kasba Ganpati',
      'Tambdi Jogeshwari',
      'Guruji Talim Ganpati',
      'Tulshibaug Ganpati',
      'Kesariwada Ganpati',
    ],
  },
  {
    id: 'peshwa-heritage-trail',
    name: 'Peshwa Heritage Trail',
    time: '',
    distance: 'South to central Pune',
    note: 'From Parvati Hill down to Budhwar Peth.',
    stops: [
      'Parvati Devachi Ganpati (Parvati Hill)',
      'Sarasbaug Siddhivinayak (Talyatla Ganpati)',
      'Dagdusheth Halwai Ganpati',
    ],
  },
];

export default CIRCUITS;
