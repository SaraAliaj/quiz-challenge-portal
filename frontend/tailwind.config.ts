import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#ffffff",
        foreground: "#6c9bcf",
        primary: {
          DEFAULT: "#6c9bcf",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f8edeb",
          foreground: "#6c9bcf",
        },
        destructive: {
          DEFAULT: "#ff9494",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f0f4f8",
          foreground: "#6c9bcf",
        },
        accent: {
          DEFAULT: "#ba94d1",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#6c9bcf",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#6c9bcf",
        },
        lesson: {
          DEFAULT: "#f8f9fa",
          header: "#7ec4cf",
          text: "#6c9bcf",
          highlight: "#ffb6c1",
        },
        gradient: {
          start: "#7ec4cf",
          middle: "#6c9bcf",
          end: "#ba94d1",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
