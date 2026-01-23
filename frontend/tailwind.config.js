/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg) / <alpha-value>)',
        foreground: 'rgb(var(--fg) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent) / 0.9)',
        },
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          '01': 'rgb(var(--card-01) / <alpha-value>)',
          '02': 'rgb(var(--card-02) / <alpha-value>)',
          '03': 'rgb(var(--card-03) / <alpha-value>)',
          '04': 'rgb(var(--card-04) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}


