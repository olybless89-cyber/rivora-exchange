import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0B1220",
        card: "#161B2E",
        primary: "#00A300",
        border: "rgba(255,255,255,0.08)",
        muted: "#8b95a1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        app: "430px",
      },
    },
  },
  plugins: [],
} satisfies Config;
