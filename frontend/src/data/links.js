// Outbound links for the credit block in the drawer and the Team page. Kept in
// one module so the contact address is not retyped across Privacy, the drawer
// and the corrections link.

export const CONTACT_EMAIL = 'connect@mandapmaps.in';

// Source is public; the pandal dataset is not, and stays out of the repo.
export const GITHUB_URL = 'https://github.com/ShreeyashPatil2708/mandap_maps';

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

// Timings and details drift during the festival and visitors standing in front
// of a mandal notice before we do. The prefilled subject keeps those reports
// separate from everything else in the inbox.
export const CORRECTION_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'Correction: '
)}`;
