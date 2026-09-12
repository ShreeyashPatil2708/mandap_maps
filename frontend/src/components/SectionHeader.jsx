import Link from './Link.jsx';

// The heading that opens every content section: English title, its Marathi
// counterpart underneath, and an optional link to the fuller list on the right.
//
// This was hand written three times (twice in Home, once in Circuits) with
// slightly different classes each time, which is why the sections did not line
// up with each other. `items-start` rather than `items-baseline` because the
// title is a two line block and baseline alignment floated the link too high.
export default function SectionHeader({ title, marathi, linkTo, linkLabel, className = '' }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h2 className="font-serif text-[22px] leading-tight text-maroon">{title}</h2>
        {marathi && (
          <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40" lang="mr">
            {marathi}
          </div>
        )}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex-none cursor-pointer pt-1 font-sans text-[13px] font-medium text-gold"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
