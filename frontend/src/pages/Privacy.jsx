import Container from '../components/Container.jsx';
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
// Sections live in one array so the contents list on desktop and the body can
// never disagree about what exists or what it is called.

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
        <p>Two things, and only while you are using the feature that needs them.</p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            <b>The questions you type into Ask.</b> Your message, and the replies, are held for one
            hour so the chat can follow a conversation, then they expire on their own.
          </li>
          <li>
            <b>Your IP address</b>, which every website necessarily sees. Ours is written to our
            server logs, and held briefly in memory to rate-limit requests, so one device cannot
            flood the site.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'device-ids',
    title: 'The random chat id',
    body: (
      <p>
        Your browser holds one random id, not tied to a name or an account. It lets the Ask chat
        recognise your conversation. Clearing your browser data removes it.
      </p>
    ),
  },
  {
    id: 'location',
    title: 'Your location',
    body: (
      <p>
        Only requested when you tap &quot;Near me&quot; on Explore, and it is precise rather than
        approximate, because that is what sorting by distance needs. It stays in your browser: there
        is no code path that sends your position to us, and we do not store it. One thing to know:
        tapping Get Directions opens Google Maps without a starting point, so Google can route from
        where you are. That happens on Google&apos;s page, under Google&apos;s terms.
      </p>
    ),
  },
  {
    id: 'on-your-device',
    title: 'What never leaves your device',
    body: (
      <p>
        Your saved darshan route, your chat transcript, and a couple of flags remembering that you
        have seen the intro and the support popup. None of it is uploaded. It does mean a shared
        phone will show your last chat, so clear the chat if that matters to you.
      </p>
    ),
  },
  {
    id: 'not-collected',
    title: 'What we do not collect',
    body: (
      <p>
        No name, email, phone number, or payment details. No accounts, no login, no password.{' '}
        <b>No cookies, and no analytics, advertising or tracking of any kind.</b> There is no
        Analytics, no tag manager, no pixel, no session recorder and no error-reporting service
        anywhere in this site. Donations go directly through your own UPI app; we never see them.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Who else sees something',
    body: (
      <>
        <p>Being honest about this, because it is easy to leave out.</p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            <b>Groq</b>, our AI provider, receives the text you send to Ask, plus the earlier turns
            of that conversation so replies make sense. If you write in Marathi or Hindi it is also
            sent for translation. Groq sees the message, not who sent it.
          </li>
          <li>
            <b>Google Fonts</b> serves our typefaces, so Google receives your IP address and the
            page you are on, on every page, before you tap anything.
          </li>
          <li>
            <b>OpenStreetMap</b> serves the map tiles, so it receives your IP and the part of the
            map you are looking at, whenever you open the map.
          </li>
          <li>
            <b>Cloudflare and Amazon Web Services</b> deliver the site and see the traffic passing
            through, as any host does.
          </li>
        </ul>
        <p className="mt-2">
          Nobody on that list is an advertiser. We do not sell your data or share it for marketing,
          and the site is locked down so the page cannot send your data anywhere else even if
          something tried.
        </p>
      </>
    ),
  },
  {
    id: 'how-long',
    title: 'How long we keep it',
    body: (
      <ul className="list-disc pl-5">
        <li>Chat conversations: one hour after your last message, then deleted automatically.</li>
        <li>Rate-limit records, which hold your IP: a few minutes, in memory only.</li>
        <li>Server logs: kept briefly for debugging and security, not mined for anything.</li>
      </ul>
    ),
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    body: (
      <p>
        Location is never requested until you tap &quot;Near me&quot;. Clear chat deletes that
        conversation from our side. Clearing your browser data for this site removes the random chat
        id, your route and your transcript. Because nothing is linked to a name, we usually cannot
        find records belonging to a particular person, but if you write to us with your device id or
        roughly when you visited, we will do what we can. Email <Mail /> and we will answer.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <p>
        Everything is served over HTTPS. The database sits in a private network with no route in
        from the public internet. The Ask service deliberately does not write your questions into
        its logs. Nothing here is tied to an identity, which is the strongest protection available:
        the less we hold, the less there is to lose.
      </p>
    ),
  },
  {
    id: 'accuracy',
    title: 'How accurate is the information?',
    body: (
      <p>
        Treat everything on this site as a helpful estimate, not an official record. Addresses, map
        pins and aarti timings are collected by hand, pandal locations move each year, and some are
        still being confirmed. Map pins can be off by a street or two. The Ask chat is AI and can be
        wrong. For anything that matters, check with the mandal or ask someone nearby once you are
        in the area.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        The site is a public guide for a public festival and is not aimed at children. We do not
        knowingly collect anything about a child, and there is nothing here that asks anyone their
        age, name or contact details.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes, and how to reach us',
    body: (
      <p>
        If what we collect changes, this page changes with it and the date below is updated.
        Questions, concerns, or a request about your data all go to the same place: <Mail />. A
        person reads it.
      </p>
    ),
  },
];

export default function Privacy({ enter = 'animate-fadeIn' }) {
  return (
    <Container as="main" className={`${enter} pt-6`}>
      <Link to={PATHS.home} className="cursor-pointer font-sans text-[13px] font-medium text-gold">
        ← Back
      </Link>

      <h1 className="mt-4 font-serif text-[26px] text-maroon lg:text-[34px]">Privacy</h1>
      <div className="mt-1 font-devanagari text-[13px] text-maroon/40" lang="mr">
        गोपनीयता
      </div>

      {/* Contents rail on the left, policy on the right. A policy is a document
          people scan for one answer, so a wide screen is better spent on a way
          in than on longer lines. */}
      <div className="mt-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <nav className="hidden lg:sticky lg:top-24 lg:block" aria-label="On this page">
          <div className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-[1.5px] text-maroon/35">
            On this page
          </div>
          <ul className="flex flex-col gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="font-sans text-[13px] leading-snug text-maroon/55 no-underline hover:text-maroon"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-prose font-sans text-[13px] leading-[1.7] text-maroon/70 lg:text-[15px]">
          <p>
            MandapMaps is a free companion for Pune&apos;s Ganeshotsav, built by three engineers in
            Pune. We collect as little as we can get away with, and this page says exactly what that
            is in plain language rather than in legal boilerplate.
          </p>

          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="mt-7 scroll-mt-24">
              <h2 className="mb-1.5 font-sans text-[13px] font-semibold text-maroon lg:text-[15px]">
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}

          <p className="mt-8 text-maroon/50">Last updated 13 September 2026.</p>
        </div>
      </div>
    </Container>
  );
}
