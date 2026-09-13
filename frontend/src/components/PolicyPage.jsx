import Container from './Container.jsx';
import Link from './Link.jsx';
import { PATHS } from '../router.js';

// Shared layout for the plain-language policy pages (Privacy, Terms,
// Disclaimer): a title with its Marathi name, a contents rail on desktop, and
// the sections as a reading column.
//
// Sections come in as one array so the contents list and the body can never
// disagree about what exists or what it is called.
export default function PolicyPage({ enter, title, marathi, intro, sections, updated }) {
  return (
    <Container as="main" className={`${enter} pt-6`}>
      <Link to={PATHS.about} className="cursor-pointer font-sans text-[13px] font-medium text-gold">
        ← About
      </Link>

      <h1 className="mt-4 font-serif text-[26px] text-maroon lg:text-[34px]">{title}</h1>
      <div className="mt-1 font-devanagari text-[13px] text-maroon/40" lang="mr">
        {marathi}
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
            {sections.map((s) => (
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
          <p>{intro}</p>

          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mt-7 scroll-mt-24">
              <h2 className="mb-1.5 font-sans text-[13px] font-semibold text-maroon lg:text-[15px]">
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}

          <p className="mt-8 text-maroon/50">Last updated {updated}.</p>
        </div>
      </div>
    </Container>
  );
}
