// Inline SVG icons, ported verbatim from the design reference so the strokes,
// weights and gold/maroon accents match exactly.

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#C9A84C" strokeWidth="1.2" />
      <text
        x="14"
        y="18.5"
        textAnchor="middle"
        fontSize="14"
        fontFamily="Noto Serif Devanagari"
        fill="#C9A84C"
        fontWeight="700"
      >
        ग
      </text>
    </svg>
  );
}

/** The "ॐ" placeholder mark shown on card / hero image tiles. */
export function OmMark({ size = 40, textSize = 18, opacity = 0.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="16" stroke="#C9A84C" strokeWidth="1" opacity={opacity - 0.2} />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fontSize={textSize}
        fontFamily="Noto Serif Devanagari"
        fill="#C9A84C"
        opacity={opacity}
      >
        ॐ
      </text>
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 -translate-y-1/2"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
    >
      <circle cx="7.5" cy="7.5" r="5.5" stroke="#6B1E2E" strokeWidth="1.5" opacity="0.3" />
      <path
        d="M12 12L16 16"
        stroke="#6B1E2E"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

export function MetroIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="4" width="12" height="7" rx="2" stroke="#C9A84C" strokeWidth="1.2" />
      <path d="M4 4V3M10 4V3M1 8h12" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 2v4a2 2 0 004 0V2M5 2v10M10 2c0 0 2 1.5 2 4s-2 2-2 2v4"
        stroke="#C9A84C"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ParkingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="#C9A84C" strokeWidth="1.2" />
      <path
        d="M5 10V5h2.5a1.5 1.5 0 010 3H5"
        stroke="#C9A84C"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M15 7L10 2L5 7M10 2V14M3 18H17"
        stroke="#6B1E2E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeNavIcon({ color, fill }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M3 9.5L11 3L19 9.5V19H14V14H8V19H3V9.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={fill}
      />
    </svg>
  );
}

export function ExploreNavIcon({ color, fill }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" fill={fill} />
      <path d="M15.5 15.5L19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AskNavIcon({ color, fill }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M5 3.5H17C17.83 3.5 18.5 4.17 18.5 5V12C18.5 12.83 17.83 13.5 17 13.5H9L5.5 17V13.5H5C4.17 13.5 3.5 12.83 3.5 12V5C3.5 4.17 4.17 3.5 5 3.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={fill}
      />
    </svg>
  );
}

export function RouteNavIcon({ color, fill }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="5" cy="5" r="2.5" stroke={color} strokeWidth="1.5" fill={fill} />
      <circle cx="17" cy="11" r="2.5" stroke={color} strokeWidth="1.5" fill={fill} />
      <circle cx="5" cy="17" r="2.5" stroke={color} strokeWidth="1.5" fill={fill} />
      <path
        d="M5 7.5V14.5M7.5 5H14.5C15.6 5 16.5 5.9 16.5 7V8.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Brand marks for the credit block (drawer) and the team roster. Both take
// `currentColor` so they inherit whatever the surrounding link is coloured,
// rather than carrying their own brand colours onto a maroon panel.
export function GitHubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function LinkedInIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.6 1.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM2.2 6.05h2.8V14.4H2.2V6.05Zm4.55 0h2.68v1.14h.04c.37-.66 1.28-1.36 2.64-1.36 2.82 0 3.34 1.76 3.34 4.05v4.52h-2.79v-4c0-.96-.02-2.19-1.4-2.19-1.4 0-1.61 1.04-1.61 2.12v4.07H6.75V6.05Z" />
    </svg>
  );
}
