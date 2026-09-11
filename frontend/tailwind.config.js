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
        maroon: {
          DEFAULT: '#6B1E2E',
          dark: '#5A1826',
        },
        gold: {
          DEFAULT: '#C9A84C',
          dark: '#B8973F',
        },
        cream: '#EDE4D0',
        surface: '#F9F2E5',
        light: '#FAF6F0',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['Outfit', 'sans-serif'],
        devanagari: ['"Noto Serif Devanagari"', 'serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      borderRadius: {
        badge: '4px',
        card: '12px',
        panel: '14px',
        sheet: '20px',
        pill: '50px',
      },
      spacing: {
        gutter: '20px',
        'gutter-lg': '24px',
        'nav-safe': '90px',
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
        kenBurns: {
          from: { transform: 'scale(1.05)' },
          to: { transform: 'scale(1.15)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        ringPulse: {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        breathe: {
          '0%, 100%': { boxShadow: '0 8px 24px rgba(201,168,76,0.35)' },
          '50%': { boxShadow: '0 8px 34px rgba(201,168,76,0.65)' },
        },
        dholSway: {
          '0%, 100%': { transform: 'rotate(-8deg)' },
          '50%': { transform: 'rotate(8deg)' },
        },
        crackerBurst: {
          '0%, 85%': { opacity: '0', transform: 'scale(0.3)' },
          '90%': { opacity: '1', transform: 'scale(1.1)' },
          '100%': { opacity: '0', transform: 'scale(1.4)' },
        },
        spinSlow: {
          from: { transform: 'translate(-50%, -50%) rotate(0deg)' },
          to: { transform: 'translate(-50%, -50%) rotate(360deg)' },
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