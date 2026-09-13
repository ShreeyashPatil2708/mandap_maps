import PolicyPage from '../components/PolicyPage.jsx';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/links.js';

// What MandapMaps is not, and what a visitor should check for themselves.
// Every data claim here matches what the pages actually show: several pandals
// carry a "not yet verified for 2026" note, and about half have no map pin.

const SECTIONS = [
  {
    id: 'independent',
    title: 'An independent guide',
    body: (
      <p>
        MandapMaps is not affiliated with, endorsed by or run on behalf of any mandal, trust,
        festival committee, the police or the city. For official announcements, follow the mandal
        and local authorities directly.
      </p>
    ),
  },
  {
    id: 'check-on-the-ground',
    title: 'Check timings and locations',
    body: (
      <p>
        Aarti timings, addresses and walking times are gathered from public sources and can change
        from year to year. Where a detail is not yet confirmed for 2026 the page says so, and some
        pandals do not have a map location yet. Confirm on the ground before you rely on it,
        especially late at night.
      </p>
    ),
  },
  {
    id: 'crowds-and-safety',
    title: 'Crowds and safety',
    body: (
      <p>
        The peth lanes get very crowded during Ganeshotsav, roads close without notice, and surfaces
        can be wet or uneven. Keep children and elderly companions close, agree a meeting point,
        follow police and volunteer instructions, and travel at your own risk. We are not liable for
        injury, loss, delay or a missed darshan.
      </p>
    ),
  },
  {
    id: 'respectful-darshan',
    title: 'Respectful darshan',
    body: (
      <p>
        Pandals are places of devotion. Be patient in queues, do not block lanes, follow each
        mandal&apos;s rules on footwear, bags and photography, and ask before photographing people.
      </p>
    ),
  },
  {
    id: 'history',
    title: 'History and legends',
    body: (
      <p>
        The history on each page is written from published accounts. Where a story is legend rather
        than record we try to say so. If you know a detail is wrong, write to{' '}
        <a href={CONTACT_MAILTO} className="font-medium text-gold no-underline">
          {CONTACT_EMAIL}
        </a>{' '}
        and we will correct it.
      </p>
    ),
  },
];

export default function Disclaimer({ enter = 'animate-fadeIn' }) {
  return (
    <PolicyPage
      enter={enter}
      title="Disclaimer"
      marathi="अस्वीकरण"
      intro="MandapMaps is here to help you plan, not to replace your own judgement or the mandals' own announcements."
      sections={SECTIONS}
      updated="13 September 2026"
    />
  );
}
