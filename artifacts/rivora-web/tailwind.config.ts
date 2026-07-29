import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium palette sampled from the RIVORA EXCHANGE mark: black
        // field, metallic-gold "R", brushed-silver "X"/wordmark.
        background: "#0A0A0A",
        card: "#141414",
        primary: "#D4AF37",
        "primary-light": "#E8C874",
        "primary-dark": "#A6821F",
        silver: "#C7CBD1",
        "silver-light": "#EDEEF0",
        border: "rgba(212,175,55,0.14)",
        muted: "#9C9C9C",
        danger: "#C0392B",
        warning: "#C98A2E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },
      maxWidth: {
        app: "430px",
      },
    },
  },
  plugins: [],
} satisfies Config;
