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
      <path d="M12 12L16 16" stroke="#6B1E2E" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
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
