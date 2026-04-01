import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'brand-primary': 'rgb(var(--theme-primary) / <alpha-value>)',
        'brand-accent': 'rgb(var(--theme-accent) / <alpha-value>)',
        amber: {
          50: 'rgb(var(--theme-primary) / 0.05)',
          100: 'rgb(var(--theme-primary) / 0.1)',
          200: 'rgb(var(--theme-primary) / 0.2)',
          300: 'rgb(var(--theme-primary) / 0.3)',
          400: 'rgb(var(--theme-primary) / 0.8)',
          500: 'rgb(var(--theme-primary) / 1)',
          600: 'rgb(var(--theme-primary) / 0.9)',
          700: 'rgb(var(--theme-primary) / 0.8)',
          800: 'rgb(var(--theme-primary) / 0.7)',
          900: 'rgb(var(--theme-primary) / 0.6)',
        },
        blue: {
          50: 'rgb(var(--theme-primary) / 0.05)',
          100: 'rgb(var(--theme-primary) / 0.1)',
          200: 'rgb(var(--theme-primary) / 0.2)',
          300: 'rgb(var(--theme-primary) / 0.3)',
          400: 'rgb(var(--theme-primary) / 0.7)',
          500: 'rgb(var(--theme-primary) / 0.85)',
          600: 'rgb(var(--theme-primary) / 0.75)',
        },
        purple: {
          50: 'rgb(var(--theme-primary) / 0.05)',
          100: 'rgb(var(--theme-primary) / 0.1)',
          200: 'rgb(var(--theme-primary) / 0.2)',
          300: 'rgb(var(--theme-primary) / 0.3)',
          400: 'rgb(var(--theme-primary) / 0.6)',
          500: 'rgb(var(--theme-primary) / 0.75)',
          600: 'rgb(var(--theme-primary) / 0.7)',
        }
      },
    },
  },
  plugins: [],
};
export default config;
