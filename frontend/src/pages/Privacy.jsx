import PolicyPage from '../components/PolicyPage.jsx';
import Link from '../components/Link.jsx';
import { PATHS } from '../router.js';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/links.js';

// Plain-language privacy policy, reached from the footer and the menu drawer.
//
// Every claim here is meant to be checkable against the code. Keep it that way:
// if a feature starts collecting something, this page changes in the same
// commit. Three earlier claims had drifted into being false (that the only
// outside service seeing anything was Groq, that everything was anonymous, and
// that there was nothing tied to you to look up), which is the worst kind of
// bug to have on a page like this.
//
// The layout lives in components/PolicyPage.jsx, shared with Terms and
// Disclaimer.

const Mail = () => (
  <a href={CONTACT_MAILTO} className="font-medium text-gold no-underline">
    {CONTACT_EMAIL}
  </a>
);

const SECTIONS = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>Very little, and only when you use the feature that needs it.</p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            <b>What you ask in Ask.</b> Kept for one hour so the chat can follow the conversation,
            then deleted. Clear chat deletes it straight away.
          </li>
          <li>
            <b>Your IP address</b>, which every website sees. It ends up in our server logs and is
            held briefly in memory to rate-limit requests.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'on-your-device',
    title: 'What stays on your device',
    body: (
      <p>
        Your saved route, your chat transcript, a random id that lets the chat recognise your
        conversation, and a flag or two like having seen the intro. Your location is only asked for
        when you tap &quot;Near me&quot;, and it never leaves your browser. You can clear it from
        the{' '}
        <Link to={PATHS.about} className="font-medium text-gold no-underline">
          About
        </Link>{' '}
        page, and clearing your browser data removes all of it.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Who else sees something',
    body: (
      <p>
        <b>Groq</b>, our AI provider, receives what you send to Ask. <b>Google Fonts</b> and{' '}
        <b>OpenStreetMap</b> see your IP address when they load fonts and map tiles.{' '}
        <b>Cloudflare</b> and <b>Amazon Web Services</b> host the site.
      </p>
    ),
  },
  {
    id: 'not-collected',
    title: 'What we do not do',
    body: (
      <p>
        No accounts, cookies, analytics, ads or tracking, and we never sell or share your data.
        Donations go through your own UPI app, so we never see them.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Questions',
    body: (
      <p>
        Email <Mail />. If what we collect ever changes, this page changes with it.
      </p>
    ),
  },
];

export default function Privacy({ enter = 'animate-fadeIn' }) {
  return (
    <PolicyPage
      enter={enter}
      title="Privacy"
      marathi="गोपनीयता"
      intro="MandapMaps is a free side project for Pune's Ganeshotsav. We collect as little as we can, and this page says what that is in plain words."
      sections={SECTIONS}
      updated="13 September 2026"
    />
  );
}
