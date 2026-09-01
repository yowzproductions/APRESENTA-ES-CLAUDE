import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ekotruck: {
          orange: "#F4661E",
          dark: "#1A1A1A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
