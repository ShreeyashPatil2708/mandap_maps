import { LogoMark, OmMark, LinkedInIcon } from '../components/icons.jsx';
import Container from '../components/Container.jsx';
import Link from '../components/Link.jsx';
import { UPI_ID } from '../data/upi.js';
import { PATHS, canGoBack, goBack } from '../router.js';

// A member's `linkedin` is optional: no URL means no icon, so the roster is
// correct whether none, one or all three profiles are filled in.
const TEAM = [
  { name: 'Shreeyash Balaji Patil', linkedin: '' },
  { name: 'Sharvee Neema', linkedin: '' },
  { name: 'Advi Deshpande', linkedin: '' },
];

// The "About the team" page, at /team. Reached from the menu drawer, from the
// footer, and from the "Team MandapMaps" button on the Splash screen.
//
// It used to be a fixed full-screen overlay toggled by a boolean in App.jsx,
// which meant it had no URL: it could not be linked, shared or returned to
// once the splash had been seen. It is a normal page now. The maroon header
// band stays, because that is what makes it read as its own screen rather
// than another card dropped into the Home layout.
export default function Team({ enter = 'animate-fadeIn' }) {
  // A real link for anyone who landed here from search, but inside the app it
  // steps back through history so the previous screen keeps its state.
  const onBackClick = (event) => {
    if (!canGoBack()) return;
    event.preventDefault();
    goBack();
  };

  return (
    <main className={enter}>
      {/* Maroon header, full bleed, contents on the shared column */}
      <div className="relative overflow-hidden bg-maroon pb-10 pt-7">
        <div className="pointer-events-none absolute -right-6 -top-4 select-none font-devanagari text-[140px] font-bold leading-none text-gold/[0.08]">
          श्री
        </div>

        <Container className="relative z-[1] text-center">
          <Link
            to={PATHS.home}
            onClick={onBackClick}
            className="mb-5 flex items-center gap-1.5 font-sans text-sm font-medium text-light/80 no-underline"
          >
            <span className="text-lg leading-none">←</span> Back
          </Link>

          <div className="flex flex-col items-center">
            <LogoMark size={44} />
            <div className="mt-3 font-serif text-[30px] leading-tight text-light">
              Team MandapMaps
            </div>
            <div className="mt-1 font-devanagari text-sm text-gold/80">मंडप मॅप्स टीम</div>
            <p className="mx-auto mt-4 max-w-[320px] font-sans text-sm leading-relaxed text-light/70">
              Built as a final-year project to make navigating Pune&apos;s Ganeshotsav easier:
              finding pandals, planning routes, and celebrating the history behind each Ganpati.
            </p>
          </div>
        </Container>
      </div>

      <Container className="pb-14 pt-8">
        <div className="mx-auto flex max-w-[420px] flex-col gap-3">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="flex items-center gap-3 rounded-card border border-maroon/10 bg-surface px-4 py-3.5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maroon">
                <OmMark size={22} textSize={10} opacity={0.9} />
              </div>
              <div className="flex-1 text-left font-sans text-[15px] font-semibold text-maroon">
                {member.name}
              </div>
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on LinkedIn`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon/[0.06] text-maroon/55 hover:bg-maroon/10 hover:text-maroon"
                >
                  <LinkedInIcon size={15} />
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-[420px] rounded-panel border border-gold/30 bg-surface px-gutter-lg py-8 text-center">
          <div className="font-serif text-lg text-maroon">Support Us</div>
          <p className="mx-auto mt-1.5 max-w-[260px] font-sans text-[13px] text-maroon/60">
            If MandapMaps helped your darshan, consider supporting the project.
          </p>
          <div className="mx-auto mt-5 flex h-[170px] w-[170px] items-center justify-center overflow-hidden rounded-panel border-2 border-gold/30 bg-cream">
            <img
              src="/images/upi-qr.png"
              alt="UPI QR code"
              className="h-full w-full object-contain p-2"
            />
          </div>
          <div className="mt-4 inline-block rounded-lg bg-maroon/5 px-4 py-1.5 font-sans text-[13px] font-medium tracking-[0.5px] text-maroon">
            {UPI_ID}
          </div>
          <div className="mt-4 font-serif text-base text-maroon">Ganpati Bappa Morya 🙏</div>
        </div>
      </Container>
    </main>
  );
}
