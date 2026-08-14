// UI helpers that used to live alongside the hardcoded dataset. These are
// presentation logic, not data, so they stay in the frontend. The Ganpati
// records themselves now come from the API (see context/GanpatisContext.jsx).

const ORDINALS = ['st', 'nd', 'rd', 'th', 'th'];

/** "1st Manacha", "2nd Manacha", … or '' for non-manache pandals. */
export function manachaBadge(manacha) {
  if (!manacha) return '';
  return `${manacha}${ORDINALS[manacha - 1]} Manacha`;
}
