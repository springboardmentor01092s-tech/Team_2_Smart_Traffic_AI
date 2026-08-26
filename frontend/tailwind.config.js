/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0f1c",
          panel: "#0f1729",
          card: "#131c30",
          hover: "#1a2438",
        },
        border: {
          DEFAULT: "#22304a",
        },
        accent: {
          DEFAULT: "#2f6bff",
          light: "#5b8bff",
        },
        status: {
          low: "#22c55e",
          moderate: "#f59e0b",
          heavy: "#ef4444",
          severe: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
