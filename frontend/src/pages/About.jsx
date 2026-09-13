import { useMemo, useState } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useRoute } from '../context/RouteContext.jsx';
import Container from '../components/Container.jsx';
import Link from '../components/Link.jsx';
import { PATHS } from '../router.js';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/links.js';
import { safeRemove } from '../data/storage.js';
import { resetSessionId } from '../services/chatbot.js';

// About: why MandapMaps exists, what is in it, the controls for what it keeps
// on this device, and the way into the policy pages.
//
// The counts come from the live data rather than being typed in, so the page
// never claims more pandals or areas than the site actually has.

// Same key AskSheet persists the transcript under.
const CHAT_MESSAGES_KEY = 'mm_chat_messages';

const POLICIES = [
  {
    to: PATHS.privacy,
    title: 'Privacy',
    summary: 'No accounts or tracking. Your route and location stay on your device.',
  },
  {
    to: PATHS.terms,
    title: 'Terms of Use',
    summary: 'Free for personal use. Please do not scrape or reuse the content commercially.',
  },
  {
    to: PATHS.disclaimer,
    title: 'Disclaimer',
    summary: 'Independent guide. Confirm timings on the ground and stay safe in the crowds.',
  },
];

function SectionTitle({ children }) {
  return <h2 className="mb-3 font-serif text-[20px] text-maroon lg:text-[22px]">{children}</h2>;
}

// One "clear this" row. The button reports what it did in place, rather than
// asking for confirmation in a browser dialog.
function ClearRow({ title, detail, onClear }) {
  const [cleared, setCleared] = useState(false);

  return (
    <div className="flex items-center gap-4 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[14px] font-medium text-maroon">{title}</div>
        <div className="mt-0.5 font-sans text-xs leading-[1.5] text-maroon/45">{detail}</div>
      </div>
      <button
        type="button"
        disabled={cleared}
        onClick={() => {
          onClear();
          setCleared(true);
        }}
        className={`flex-none rounded-pill px-5 py-2 font-sans text-[13px] font-semibold ${
          cleared
            ? 'cursor-default bg-maroon/5 text-maroon/45'
            : 'cursor-pointer bg-maroon text-light hover:bg-maroon-dark'
        }`}
      >
        {cleared ? 'Cleared' : 'Clear'}
      </button>
    </div>
  );
}

export default function About({ enter = 'animate-fadeIn' }) {
  const { ganpatis } = useGanpatis();
  const { clearRoute } = useRoute();

  const facts = useMemo(() => {
    const areas = new Set(ganpatis.map((g) => g.areaCategory).filter(Boolean)).size;
    return [
      { value: ganpatis.length, label: 'pandals across Pune and Pimpri-Chinchwad' },
      { value: areas, label: 'areas, from the old peths to the suburbs' },
      { value: '2', label: 'languages for every history: English and Marathi' },
      { value: '5', label: 'Manache Ganpati, in their traditional order' },
    ];
  }, [ganpatis]);

  const clearChat = () => {
    safeRemove(CHAT_MESSAGES_KEY);
    resetSessionId();
  };

  return (
    <Container as="main" className={`${enter} pt-6`}>
      <Link to={PATHS.home} className="cursor-pointer font-sans text-[13px] font-medium text-gold">
        ← Back
      </Link>

      <h1 className="mt-4 font-serif text-[26px] text-maroon lg:text-[34px]">About MandapMaps</h1>
      <div className="mt-1 font-devanagari text-[13px] text-maroon/40" lang="mr">
        आमच्याबद्दल
      </div>

      {/* Two rows of two columns on a laptop, one column on a phone. The story
          sits beside what is inside it, and the data controls beside the
          policies that describe them. */}
      <div className="lg:mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        {/* Why it exists */}
        <div className="mt-6 overflow-hidden lg:mt-0 rounded-panel bg-maroon px-6 py-6 lg:px-8 lg:py-7">
          <div className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[3px] text-gold">
            Why we built this
          </div>
          <p className="font-sans text-[15px] leading-[1.7] text-light/75">
            Every Ganeshotsav the same questions come up. Which pandals matter, where exactly they
            are, when the aarti is, and how to fit a few of them into one evening without getting
            lost in the peths. The answers were scattered across old articles, forwards and word of
            mouth. MandapMaps puts them in one place: the history of each Ganpati, its timings, the
            nearest metro and food, and a route you can walk.
          </p>
          <p className="mt-3 font-sans text-[13px] leading-[1.6] text-light/45">
            Free, no account, built in Pune. An independent project, not affiliated with any mandal
            or festival committee.
          </p>
        </div>

        {/* What is inside */}
        <section className="mt-9 lg:mt-0">
          <SectionTitle>What&apos;s inside</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {facts.map((f) => (
              <div
                key={f.label}
                className="rounded-card border border-maroon/[0.06] bg-surface px-4 py-3.5"
              >
                <div className="font-serif text-[26px] leading-none text-gold">{f.value}</div>
                <div className="mt-1.5 font-sans text-xs leading-[1.5] text-maroon/55">
                  {f.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-sans text-[13px] leading-[1.6] text-maroon/55">
            Plus darshan circuits, a map, &quot;Near me&quot; sorting, and Ask, an assistant that
            answers questions about the pandals.
          </p>
        </section>
      </div>

      <div className="lg:mt-12 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        {/* Stored data */}
        <section className="mt-9 lg:mt-0">
          <SectionTitle>Your data on this device</SectionTitle>
          <p className="mb-3 font-sans text-[13px] leading-[1.6] text-maroon/55">
            MandapMaps keeps a few things in your browser so they survive a refresh. Clear them here
            at any time.
          </p>
          <div className="flex flex-col gap-2.5">
            <ClearRow
              title="Saved route"
              detail="The pandals you added to your darshan route."
              onClear={clearRoute}
            />
            <ClearRow
              title="Chat history"
              detail="Your Ask conversation, and the id that links it to the assistant."
              onClear={clearChat}
            />
          </div>
        </section>

        {/* Policies */}
        <section className="mt-9 lg:mt-0">
          <SectionTitle>Policies</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {POLICIES.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="flex cursor-pointer items-center gap-3 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3.5 hover:border-gold/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[14px] font-medium text-maroon">{p.title}</div>
                  <div className="mt-0.5 font-sans text-xs leading-[1.5] text-maroon/45">
                    {p.summary}
                  </div>
                </div>
                <div className="flex-none font-sans text-[16px] text-maroon/25">›</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-9 lg:mt-12 font-sans text-[13px] leading-[1.6] text-maroon/55">
        Spotted a mistake, or know a pandal we should add? Write to{' '}
        <a href={CONTACT_MAILTO} className="font-medium text-gold no-underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </Container>
  );
}
