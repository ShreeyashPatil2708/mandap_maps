import { LogoMark, OmMark } from '../components/icons.jsx';
import { UPI_ID } from '../data/upi.js';

const TEAM = [
  { name: 'Shreeyash Balaji Patil'},
  { name: 'Sharvee Neema'},
  { name: 'Advi Deshpande'},
];

// Full-page "About the team" screen, reached by tapping "Team MandapMaps" on
// the Splash screen. Rendered as a fixed full-screen overlay (its own header
// + scroll area) so it reads as a distinct screen rather than another card
// dropped into the Home layout, and so the app's bottom nav doesn't show
// through underneath it.
export default function Team({ onBack }) {
  return (
    <div className="fixed inset-0 z-[350] overflow-y-auto bg-cream">
      {/* Maroon header, distinct from Home's cream card-grid look */}
      <div className="relative overflow-hidden bg-maroon px-gutter-lg pb-10 pt-7 text-center">
        <div className="pointer-events-none absolute -right-6 -top-4 select-none font-devanagari text-[140px] font-bold leading-none text-gold/[0.08]">
          श्री
        </div>

        <button
          onClick={onBack}
          className="relative z-[1] mb-5 flex items-center gap-1.5 font-sans text-sm font-medium text-light/80"
        >
          <span className="text-lg leading-none">←</span> Back
        </button>

        <div className="relative z-[1] flex flex-col items-center">
          <LogoMark size={44} />
          <div className="mt-3 font-serif text-[30px] leading-tight text-light">
            Team MandapMaps
          </div>
          <div className="mt-1 font-devanagari text-sm text-gold/80">मंडप मॅप्स टीम</div>
          <p className="mx-auto mt-4 max-w-[320px] font-sans text-sm leading-relaxed text-light/70">
          Built as a final-year project to make navigating Pune&apos;s Ganeshotsav
          easier: finding pandals, planning routes, and celebrating the
          history behind each Ganpati.
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="px-gutter-lg pb-14 pt-8">
        <div className="mx-auto flex max-w-[420px] flex-col gap-3">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="flex items-center gap-3 rounded-card border border-maroon/10 bg-surface px-4 py-3.5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maroon">
                <OmMark size={22} textSize={10} opacity={0.9} />
              </div>
              <div className="text-left">
                <div className="font-sans text-[15px] font-semibold text-maroon">
                  {member.name}
                </div>
                <div className="font-sans text-xs text-maroon/50">{member.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-[420px] rounded-panel border border-gold/30 bg-surface px-gutter-lg py-8 text-center">
          <div className="font-serif text-lg text-maroon">Support Us</div>
          <p className="mx-auto mt-1.5 max-w-[260px] font-sans text-[13px] text-maroon/60">
            If MandapMaps helped your darshan, consider supporting the project.
          </p>
          <div className="mx-auto mt-5 flex h-[170px] w-[170px] items-center justify-center overflow-hidden rounded-panel border-2 border-gold/30 bg-cream">
            <img src="/images/upi-qr.png" alt="UPI QR code" className="h-full w-full object-contain p-2" />
          </div>
          <div className="mt-4 inline-block rounded-lg bg-maroon/5 px-4 py-1.5 font-sans text-[13px] font-medium tracking-[0.5px] text-maroon">
            {UPI_ID}
          </div>
          <div className="mt-4 font-serif text-base text-maroon">Ganpati Bappa Morya 🙏</div>
        </div>
      </div>
    </div>
  );
}