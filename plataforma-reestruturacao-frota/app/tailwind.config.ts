import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Elms Sans", "Arial", "sans-serif"],
      },
      colors: {
        // Identidade visual oficial Ekotruck
        ekotruck: {
          darkGreen: "#012d2b",
          light: "#eaf0ec",
          gray: "#5f6369",
          black: "#0f0f0f",
          orange: "#f26800",
          teal: "#0c6d61",
          mint: "#a3ccab",
        },
      },
    },
  },
  plugins: [],
};

export default config;
