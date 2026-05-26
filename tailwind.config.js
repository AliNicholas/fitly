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
          50: '#f5f3ff',
          100: '#ede9fe',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        energy: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        background: {
          light: '#f8fafc',
          dark: '#050510',
          DEFAULT: '#050510',
        },
        surface: {
          light: '#ffffff',
          dark: '#0f0f23',
          DEFAULT: '#0f0f23',
        },
        'surface-light': {
          light: '#f1f5f9',
          dark: '#1a1a38',
          DEFAULT: '#1a1a38',
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
          dark: '#2a2a4a',
          DEFAULT: '#2a2a4a',
        }
      },
      fontFamily: {
        sans: ["Inter", "System-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
