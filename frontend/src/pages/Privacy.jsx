import Container from '../components/Container.jsx';
import Link from '../components/Link.jsx';
import { PATHS } from '../router.js';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/links.js';

// Plain-language privacy policy. Reached from the home footer and the menu drawer.
export default function Privacy({ enter = 'animate-fadeIn' }) {
  const heading = 'mb-1 font-sans text-[13px] font-semibold text-maroon';

  return (
    <Container as="main" width="prose" className={`${enter} pt-6`}>
      <Link to={PATHS.home} className="cursor-pointer font-sans text-[13px] font-medium text-gold">
        ← Back
      </Link>

      <h1 className="mt-4 font-serif text-[26px] text-maroon">Privacy</h1>
      <div className="mt-1 font-devanagari text-[13px] text-maroon/40" lang="mr">
        गोपनीयता
      </div>

      <div className="mt-6 flex flex-col gap-5 font-sans text-[13px] leading-[1.7] text-maroon/70">
        <p>
          MandapMaps is a free companion for Pune&apos;s Ganeshotsav. We try to collect as little as
          possible. There are no accounts and no login.
        </p>

        <div>
          <div className={heading}>What we collect</div>
          <ul className="list-disc pl-5">
            <li>The questions you type into the Ask chat.</li>
            <li>
              Your approximate location, only if you tap &quot;near me&quot; on Explore, to sort
              pandals by distance. It stays on your device and is never sent to us.
            </li>
            <li>
              A random id saved in your browser so the chat can remember the last few messages in a
              conversation.
            </li>
          </ul>
        </div>

        <div>
          <div className={heading}>What we do not collect</div>
          <p>
            No name, email, phone number, or payment details. Donations happen directly through your
            own UPI app.
          </p>
        </div>

        <div>
          <div className={heading}>How accurate is this information?</div>
          <p>
            Treat everything here as a helpful estimate, not an official record. Addresses, map pins
            and aarti timings are collected by hand, pandal locations move each year, and some are
            still being confirmed. Map pins can be off by a street or two. For anything that
            matters, please check with the mandal or ask someone nearby once you are in the area.
          </p>
        </div>

        <div>
          <div className={heading}>AI answers</div>
          <p>
            The Ask chat is powered by AI and can be wrong. Please confirm timings, addresses, and
            directions with the mandal or official sources before relying on them.
          </p>
        </div>

        <div>
          <div className={heading}>Third parties</div>
          <p>
            To answer your questions, the text you send to the chat is processed by our AI provider
            (Groq). The app is served through standard web hosting and a content delivery network.
          </p>
        </div>

        <div>
          <div className={heading}>Keeping and deleting data</div>
          <p>
            Chat memory is short-lived and clears on its own. You can clear it anytime by ending the
            conversation. We do not store your location at all.
          </p>
        </div>

        <div>
          <div className={heading}>How we protect your data</div>
          <ul className="list-disc pl-5">
            <li>
              Everything is anonymous. There is no account, and we never ask for your name, email,
              or phone number.
            </li>
            <li>
              Your location never leaves your device, so there is no trail of where you have been
              for anyone to look at.
            </li>
            <li>
              All traffic is served over HTTPS, and data sits in a private database that is not open
              to the public internet.
            </li>
            <li>
              We do not sell your data or share it with advertisers. The only outside service that
              sees your input is our AI provider (Groq), and only the text you send to the chat.
            </li>
          </ul>
        </div>

        <div>
          <div className={heading}>Your choices</div>
          <p>
            Sharing your location is entirely up to you: nothing is requested until you tap
            &quot;near me&quot;, and you can clear the chat whenever you like. Because nothing is
            tied to you, there is nothing to look up or export.
          </p>
        </div>

        <div>
          <div className={heading}>Contact</div>
          <p>
            Questions about privacy or data? Write to us at{' '}
            <a href={CONTACT_MAILTO} className="font-medium text-gold">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <p className="text-maroon/50">
          Last updated 11 September 2026. This page will be updated as the app grows.
        </p>
      </div>
    </Container>
  );
}
