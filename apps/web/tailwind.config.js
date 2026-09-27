/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--color-gray-border, #2a2a30)",
        muted: "#1a1a1e",
        "muted-foreground": "var(--color-gray-text, #8b8b93)",
        foreground: "var(--color-gray-text-contrast, #f2f2f4)",
      },
    },
  },
  plugins: [],
};
