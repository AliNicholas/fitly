/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        // We will define these dynamically or let the css variables handle it,
        // or configure separate light/dark colors in tailwind
        // Using tailwind's native mapping
        background: {
          light: '#f8fafc',
          dark: '#020617',
          DEFAULT: '#020617', // Default to dark first!
        },
        surface: {
          light: '#ffffff',
          dark: '#0f172a',
          DEFAULT: '#0f172a',
        },
        'surface-light': {
          light: '#f1f5f9',
          dark: '#1e293b',
          DEFAULT: '#1e293b',
        },
        'text-primary': {
          light: '#0f172a',
          dark: '#f8fafc',
          DEFAULT: '#f8fafc',
        },
        'text-secondary': {
          light: '#475569',
          dark: '#94a3b8',
          DEFAULT: '#94a3b8',
        },
        borderColor: {
          light: '#e2e8f0',
          dark: '#334155',
          DEFAULT: '#334155',
        }
      },
      fontFamily: {
        sans: ["Inter", "System-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
