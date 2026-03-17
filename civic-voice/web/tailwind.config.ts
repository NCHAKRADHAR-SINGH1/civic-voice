import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152027",
        sand: "#f6efe5",
        moss: "#2f5d50",
        ember: "#ce5b3f",
        steel: "#70818a",
      },
      boxShadow: {
        card: "0 10px 30px rgba(17, 24, 39, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
