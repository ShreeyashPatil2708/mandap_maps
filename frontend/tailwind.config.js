/** @type {import('tailwindcss').Config} */

// Design tokens extracted verbatim from the approved MandapMaps design
// (frontend/design-reference/*.dc.html). Do not drift from these values,
// the maroon/gold/cream palette and the serif+devanagari type system are
// the identity of the app.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Core palette
        maroon: {
          DEFAULT: '#6B1E2E', // primary brand / navbar / hero background
          dark: '#5A1826', // hover state for maroon buttons
        },
        gold: {
          DEFAULT: '#C9A84C', // accent / badges / CTAs / links
          dark: '#B8973F', // hover state for gold buttons
        },
        cream: '#EDE4D0', // page background
        surface: '#F9F2E5', // card / panel background
        light: '#FAF6F0', // text/icons on maroon backgrounds
      },
      fontFamily: {
        // Headings & numerals
        serif: ['"DM Serif Display"', 'serif'],
        // Body / UI
        sans: ['Outfit', 'sans-serif'],
        // Marathi (Devanagari) text
        devanagari: ['"Noto Serif Devanagari"', 'serif'],
        // Occasional display headings
        display: ['"Playfair Display"', 'serif'],
      },
      borderRadius: {
        badge: '4px', // gold accent badges
        card: '12px', // list / grid cards
        panel: '14px', // larger content panels (support card, hero image)
        sheet: '20px', // bottom-sheet modal
        pill: '50px', // pill buttons & filter chips
      },
      spacing: {
        // Common layout rhythm used across screens
        gutter: '20px', // default screen horizontal padding
        'gutter-lg': '24px', // wider padding on hero / detail
        'nav-safe': '90px', // bottom padding to clear the fixed tab bar
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease',
        slideUp: 'slideUp 0.3s ease',
        slideInRight: 'slideInRight 0.22s ease',
      },
    },
  },
  plugins: [],
};
