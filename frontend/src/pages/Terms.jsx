import PolicyPage from '../components/PolicyPage.jsx';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/links.js';

// Terms of use, in plain words. Kept short on purpose: MandapMaps is a free
// guide with no accounts or payments, so there is little to agree to beyond
// fair use of the content.

const SECTIONS = [
  {
    id: 'what-it-is',
    title: 'What MandapMaps is',
    body: (
      <p>
        A free, independent guide to Pune&apos;s Ganpati pandals: history, aarti timings, nearby
        metro and food, darshan routes, and an assistant that answers questions. There is no account
        and nothing to buy.
      </p>
    ),
  },
  {
    id: 'using-it',
    title: 'Using it',
    body: (
      <p>
        Use MandapMaps for your own darshan planning, and share links to it freely. Please do not
        scrape the site or the API, copy the pandal write-ups in bulk, or reuse them commercially
        without asking us first.
      </p>
    ),
  },
  {
    id: 'ask',
    title: 'The Ask assistant',
    body: (
      <p>
        Ask is an AI and can be wrong. Treat its answers as a starting point, not as fact, and do
        not use it to send anything abusive or to try to break the service. We may limit how often
        it can be used so it stays available for everyone.
      </p>
    ),
  },
  {
    id: 'no-guarantees',
    title: 'No guarantees',
    body: (
      <p>
        We work to keep the information right, but timings, locations and arrangements change every
        year and sometimes on the day. MandapMaps is provided as it is, without any promise that it
        is complete, current or always online. See the disclaimer for more.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        We may update these terms as the site changes, and the date below changes with them.
        Questions go to{' '}
        <a href={CONTACT_MAILTO} className="font-medium text-gold no-underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    ),
  },
];

export default function Terms({ enter = 'animate-fadeIn' }) {
  return (
    <PolicyPage
      enter={enter}
      title="Terms of Use"
      marathi="वापराच्या अटी"
      intro="By using MandapMaps you agree to these few terms. They are written to be read, not skimmed past."
      sections={SECTIONS}
      updated="13 September 2026"
    />
  );
}
