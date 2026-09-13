-- ─────────────────────────────────────────────────────────────
-- Migration 009: remove placeholder pandals, fix and clear pins
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.
--
-- 36 records removed (35 generic locality entries with no specific mandal behind
-- them, and one duplicate); reasons in db/removed-pandals.json. 16 pins moved to
-- the named place on Google Maps, and 37 approximate pins cleared because no
-- matching place could be found; provenance in db/coordinate-corrections.json.

-- Placeholder pandals: generic locality entries with no specific mandal behind
-- them, plus one duplicate. See db/removed-pandals.json for each reason.
DELETE FROM ganpatis WHERE name_english IN (
    'Akhil Navi Peth Hatti Ganpati',
    'Akurdi Ganpati Mandal',
    'Aundh Ganpati Mandal',
    'Balewadi Ganpati Mandal',
    'Baner Ganpati Mandal',
    'Bhosari Ganpati Mandal',
    'Bibwewadi Ganpati Mandal',
    'Camp Ganpati Mandal (East Street area)',
    'Chakan Ganpati Mandal',
    'Dapodi Ganpati Mandal',
    'Deccan Gymkhana Ganpati Mandal',
    'FC Road / JM Road Ganpati Mandal',
    'Hadapsar Ganpati Mandal',
    'Hinjewadi Ganpati Mandal',
    'Kalyani Nagar Ganpati Mandal',
    'Katraj Ganpati Mandal',
    'Kharadi Ganpati Mandal',
    'Kondhwa Ganpati Mandal',
    'Kothrud Ganpati Mandal',
    'Mohammadwadi Ganpati Mandal',
    'Moshi Ganpati Mandal',
    'Nanded City Ganpati Mandal',
    'Nigdi Ganpati Mandal',
    'Paud Road Ganpati Mandal',
    'Phugewadi Ganpati Mandal',
    'Pimple Nilakh Ganpati Mandal',
    'Pimple Saudagar Ganpati Mandal',
    'Pradhikaran Ganpati Mandal',
    'Shivajinagar Ganpati Mandal',
    'Sinhagad Road Ganpati Mandal',
    'Talawade Ganpati Mandal',
    'Undri Ganpati Mandal',
    'Viman Nagar Ganpati Mandal',
    'Wagholi Ganpati Mandal',
    'Wakad Ganpati Mandal',
    'Wanowrie Ganpati Mandal'
);

-- Pins matched to the named place on Google Maps (2026-09-13).
-- Kesariwada Ganpati: 500 m, Google Maps "Kesariwada Ganpati"
UPDATE ganpatis SET latitude = 18.515767, longitude = 73.848909,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.515767,73.848909'
WHERE name_english = 'Kesariwada Ganpati' AND latitude = 18.5135 AND longitude = 73.853;
-- Tambat Ali Ganpati (Bhausaheb Rangari Ganpati): 82 m, Google Maps "Shrimant Bhausaheb Rangari Ganpati"
UPDATE ganpatis SET latitude = 18.51754, longitude = 73.855312,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.51754,73.855312'
WHERE name_english = 'Tambat Ali Ganpati (Bhausaheb Rangari Ganpati)' AND latitude = 18.5172 AND longitude = 73.856;
-- Chhatrapati Rajaram Mandal: 188 m, Google Maps "Chhatrapati Rajaram Mandal"
UPDATE ganpatis SET latitude = 18.512386, longitude = 73.847342,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.512386,73.847342'
WHERE name_english = 'Chhatrapati Rajaram Mandal' AND latitude = 18.513 AND longitude = 73.849;
-- Garud Ganpati Mandal: 1084 m, Google Maps "Garud Ganpati"
UPDATE ganpatis SET latitude = 18.513666, longitude = 73.845667,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.513666,73.845667'
WHERE name_english = 'Garud Ganpati Mandal' AND latitude = 18.5165 AND longitude = 73.8555;
-- Jilbya Maruti Ganpati: 244 m, Google Maps "Shri Jilbya Maruti Mandal"
UPDATE ganpatis SET latitude = 18.513305, longitude = 73.854912,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.513305,73.854912'
WHERE name_english = 'Jilbya Maruti Ganpati' AND latitude = 18.5155 AND longitude = 73.855;
-- Jotyachi Talim Ganpati: 643 m, Google Maps "जोत्याची तालीम मंडळ (1 review)" (low confidence)
UPDATE ganpatis SET latitude = 18.514687, longitude = 73.862938,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.514687,73.862938'
WHERE name_english = 'Jotyachi Talim Ganpati' AND latitude = 18.516 AND longitude = 73.857;
-- Natu Baug Ganpati: 641 m, Google Maps "Natubaug Mandal"
UPDATE ganpatis SET latitude = 18.510694, longitude = 73.853819,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.510694,73.853819'
WHERE name_english = 'Natu Baug Ganpati' AND latitude = 18.5115 AND longitude = 73.8478;
-- Navjawan Mitra Mandal: 150 m, Google Maps "Navjawan mitra mandal"
UPDATE ganpatis SET latitude = 18.512686, longitude = 73.848685,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.512686,73.848685'
WHERE name_english = 'Navjawan Mitra Mandal' AND latitude = 18.514 AND longitude = 73.849;
-- Shanipar Ganpati (Bajirao Road Mandal): 829 m, Google Maps "Shanipar Mandal Ganpati Devasthan"
UPDATE ganpatis SET latitude = 18.512612, longitude = 73.852547,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.512612,73.852547'
WHERE name_english = 'Shanipar Ganpati (Bajirao Road Mandal)' AND latitude = 18.5196 AND longitude = 73.8553;
-- Munjabacha Bol Ganpati: 685 m, Google Maps "Munjabacha Bol Tarun Mandal Trust"
UPDATE ganpatis SET latitude = 18.515017, longitude = 73.849853,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.515017,73.849853'
WHERE name_english = 'Munjabacha Bol Ganpati' AND latitude = 18.517 AND longitude = 73.856;
-- Chimnya Ganapati Temple: 446 m, Google Maps "Chimnya Ganapati Mandir"
UPDATE ganpatis SET latitude = 18.511144, longitude = 73.852135,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.511144,73.852135'
WHERE name_english = 'Chimnya Ganapati Temple' AND latitude = 18.512 AND longitude = 73.848;
-- Parvati Nandan Ganpati (Khinditla Ganpati): 2455 m, Google Maps "Shri Parvatinandan Ganpati Devsthan (Khinditla)"
UPDATE ganpatis SET latitude = 18.541178, longitude = 73.829076,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.541178,73.829076'
WHERE name_english = 'Parvati Nandan Ganpati (Khinditla Ganpati)' AND latitude = 18.558 AND longitude = 73.814;
-- Ranjangaon Mahaganapati: 1033 m, Google Maps "Shree Mahaganapati Temple, Ranjangaon"
UPDATE ganpatis SET latitude = 18.754099, longitude = 74.241806,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.754099,74.241806'
WHERE name_english = 'Ranjangaon Mahaganapati' AND latitude = 18.75 AND longitude = 74.233;
-- Lenyadri Girijatmaj Ganpati: 209 m, Google Maps "Shree Girijaatmaja Ganapati Temple, Lenyadri"
UPDATE ganpatis SET latitude = 19.243453, longitude = 73.887419,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.243453,73.887419'
WHERE name_english = 'Lenyadri Girijatmaj Ganpati' AND latitude = 19.24278 AND longitude = 73.88556;
-- Morgaon Mayureshwar Ganpati: 474 m, Google Maps "Shri Mayureshwar Ganapati Temple, Morgaon"
UPDATE ganpatis SET latitude = 18.278111, longitude = 74.317461,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.278111,74.317461'
WHERE name_english = 'Morgaon Mayureshwar Ganpati' AND latitude = 18.276056 AND longitude = 74.32139;
-- Pimpri-Chinchwad Ganpati (Chinchwad Devasthan): 2284 m, Google Maps "Morya Gosavi Sanjivan Samadhi Mandir"
UPDATE ganpatis SET latitude = 18.626385, longitude = 73.778323,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.626385,73.778323'
WHERE name_english = 'Pimpri-Chinchwad Ganpati (Chinchwad Devasthan)' AND latitude = 18.6298 AND longitude = 73.7997;

-- Pins with no matching named place anywhere. The approximate coordinate is
-- cleared so the site says the location is unavailable and the Maps button
-- searches by name, instead of sending a visitor to a guessed spot.
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Alandi Ganesh Temple (Sant Dnyaneshwar Pilgrimage Town)' AND latitude = 18.674 AND longitude = 73.896;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Ambegaon Ganpati Mandal' AND latitude = 18.4524 AND longitude = 73.8511;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Bavdhan Ganpati Mandal' AND latitude = 18.5201 AND longitude = 73.7793;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Bopodi Ganpati Mandal' AND latitude = 18.5642 AND longitude = 73.8454;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Charoli Ganpati Mandal' AND latitude = 18.6612 AND longitude = 73.9052;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Dehu Ganesh Temple (Sant Tukaram Pilgrimage Town)' AND latitude = 18.659 AND longitude = 73.761;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Dhanori Ganpati Mandal' AND latitude = 18.5934 AND longitude = 73.9115;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Dhayari Ganpati Mandal' AND latitude = 18.464 AND longitude = 73.8283;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Gajanan Ganpati Mandal' AND latitude = 18.516 AND longitude = 73.856;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Ganesh Peth Mandal' AND latitude = 18.515 AND longitude = 73.857;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Kasarwadi Ganpati Mandal' AND latitude = 18.6037 AND longitude = 73.8213;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Kasba Peth Talim Ganpati' AND latitude = 18.518 AND longitude = 73.857;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Khadakwasla Ganpati Mandal' AND latitude = 18.45 AND longitude = 73.773;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Khadki Ganpati Mandal (Kirkee)' AND latitude = 18.5694 AND longitude = 73.85;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Koregaon Park Ganpati Mandal' AND latitude = 18.537 AND longitude = 73.8962;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Lohegaon Ganpati Mandal' AND latitude = 18.5821 AND longitude = 73.9145;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Mangalwar Peth Ganpati Mandal' AND latitude = 18.518 AND longitude = 73.856;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Mundhwa Ganpati Mandal' AND latitude = 18.5262 AND longitude = 73.9232;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Narayan Peth Ganpati Mandal' AND latitude = 18.513 AND longitude = 73.852;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pashan Ganpati Mandal' AND latitude = 18.5352 AND longitude = 73.8083;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pimpri Ganpati (Morya Gosavi Peth Mandal)' AND latitude = 18.6274 AND longitude = 73.7997;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pirangut Ganpati Mandal' AND latitude = 18.497 AND longitude = 73.699;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pisoli Ganpati Mandal' AND latitude = 18.4491 AND longitude = 73.9058;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Raviwar Peth Ganpati Mandal' AND latitude = 18.517 AND longitude = 73.858;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Sangvi Ganpati Mandal' AND latitude = 18.5831 AND longitude = 73.7931;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Saswad Ganpati (Historic Maratha Town)' AND latitude = 18.344 AND longitude = 73.914;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Shukrawar Peth Ganpati Mandal' AND latitude = 18.517 AND longitude = 73.856;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Somwar Peth Ganpati Mandal' AND latitude = 18.516 AND longitude = 73.862;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Sus / Mahalunge Ganpati Mandal' AND latitude = 18.5501 AND longitude = 73.7801;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Tambe Ganpati (Shrimant Tambe Mandal)' AND latitude = 18.5122 AND longitude = 73.8495;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Twasta Kasar Ganpati Mandal' AND latitude = 18.5185 AND longitude = 73.857;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Umbrya Ganapati Temple' AND latitude = 18.511 AND longitude = 73.847;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Vishrambag Wada Ganpati' AND latitude = 18.5125 AND longitude = 73.852;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Vishrantwadi Ganpati Mandal' AND latitude = 18.5989 AND longitude = 73.9052;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Wanwadi Ganpati Mandal' AND latitude = 18.4979 AND longitude = 73.8884;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Warje Ganpati Mandal' AND latitude = 18.4812 AND longitude = 73.8132;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Yerawada Ganpati Mandal' AND latitude = 18.5484 AND longitude = 73.8972;
