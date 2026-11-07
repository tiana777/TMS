/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tms: {
          dark: "#0f172a",
          primary: "#1e40af",
          accent: "#2563eb",
          light: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
