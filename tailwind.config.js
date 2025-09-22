/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f6',
          100: '#dcf2ea',
          200: '#bce4d6',
          300: '#8dd0ba',
          400: '#7bbfa9',
          500: '#5aa88a',
          600: '#3e8067',
          700: '#326954',
          800: '#2a5444',
          900: '#224539',
        },
        green: {
          50: '#f0f9f6',
          100: '#dcf2ea',
          200: '#bce4d6',
          300: '#8dd0ba',
          400: '#7bbfa9',
          500: '#5aa88a',
          600: '#3e8067',
          700: '#326954',
          800: '#2a5444',
          900: '#224539',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        orange: {
          50: '#fef8f2',
          100: '#fef3e2',
          200: '#fde4c4',
          300: '#fbd09b',
          400: '#fba45f',
          500: '#f97316',
          600: '#ea8a3a',
          700: '#c86d1f',
          800: '#9f5419',
          900: '#803f16',
        },
        action: {
          50: '#fef8f2',
          100: '#fef3e2',
          200: '#fde4c4',
          300: '#fbd09b',
          400: '#fba45f',
          500: '#f97316',
          600: '#ea8a3a',
          700: '#c86d1f',
          800: '#9f5419',
          900: '#803f16',
        }
      }
    },
  },
  plugins: [],
}