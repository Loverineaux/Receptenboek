import type { Config } from "tailwindcss";

/**
 * Receptenboek v2 — design tokens (zie design_handoff_receptenboek_v2/README.md).
 *
 * De bestaande tokennamen (background, surface, text-*, primary, gray-*) zijn
 * bewust behouden maar omgezet naar het nieuwe zand/bosgroen-palet, zodat ook
 * schermen die niet in het ontwerp zitten (instellingen, admin, login) meteen
 * dezelfde warme uitstraling krijgen. Nieuwe tokens staan eronder.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16653a",
          dark: "#0F4A2A",
          light: "#E2ECE2", // primary-tint: bron-tag, stapnummers, initialen
          tint: "#E2ECE2",
        },
        "on-primary": "#F4EFE3",

        background: "#F4EFE3", // zand
        surface: "#FFFDF8",
        sunk: "#EAE2D0", // segmented track, info-blokken, ronde icon-knoppen

        line: {
          DEFAULT: "#E6DDCB",
          soft: "#ECE4D3",
          strong: "#CFC3AA",
          tag: "#DCD1BC",
        },

        ink: {
          DEFAULT: "#1E1C17",
          2: "#3E3A31",
          3: "#6E675A",
          4: "#9A927F",
        },
        "nav-icon": "#7A7366",

        // Oude namen → nieuwe inkt-tinten
        "text-primary": "#1E1C17",
        "text-secondary": "#6E675A",
        "text-muted": "#9A927F",

        placeholder: {
          DEFAULT: "#DCCFB4",
          2: "#CDBB98",
          3: "#D9CDB3",
        },

        cook: {
          bg: "#12271B",
          surface: "#1E3527",
          accent: "#8CC7A0",
          muted: "#B5C3B6",
          soft: "#D3DCD2",
        },

        season: {
          bg: "#EFE4CF",
          text: "#6A4A12",
        },

        // Ingrediënt-categorietints (initiaal-tegels)
        cat: {
          groente: "#DCE8D8",
          kruiden: "#D3E3CF",
          zuivel: "#EFE9DA",
          fruit: "#F1E2C4",
          vlees: "#EAD8CC",
        },

        // Warme grijsschaal: alle bestaande gray-* utilities passen zo bij het zand.
        gray: {
          50: "#FAF6ED",
          100: "#F1EBDD",
          200: "#E6DDCB",
          300: "#CFC3AA",
          400: "#9A927F",
          500: "#7A7366",
          600: "#6E675A",
          700: "#3E3A31",
          800: "#2A2721",
          900: "#1E1C17",
        },

        error: "#B42318",
        warning: "#B7791F",
      },
      borderColor: {
        DEFAULT: "#E6DDCB",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-bricolage)", "var(--font-geist)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }]
        "screen-title": ["34px", { lineHeight: "1", letterSpacing: "-0.03em" }],
        "detail-title": ["32px", { lineHeight: "1", letterSpacing: "-0.03em" }],
        "hero-title": ["26px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        section: ["22px", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        body: ["15.5px", { lineHeight: "1.55" }],
        meta: ["13px", { lineHeight: "1.35" }],
        overline: ["13px", { lineHeight: "1.2", letterSpacing: "0.12em" }],
      },
      borderRadius: {
        chip: "999px",
        "icon-btn": "14px",
        input: "14px",
        card: "20px",
        "card-lg": "22px",
        btn: "18px",
        sheet: "30px",
        tag: "8px",
      },
      boxShadow: {
        "btn-primary": "0 10px 22px -10px rgba(22,101,58,0.7)",
        fab: "0 12px 24px -8px rgba(22,101,58,0.65), 0 0 0 5px #F4EFE3",
        seg: "0 1px 3px rgba(40,32,18,0.12)",
        sheet: "0 -20px 40px -20px rgba(0,0,0,0.3)",
        card: "0 1px 2px rgba(40,32,18,0.04)",
      },
      spacing: {
        gutter: "20px", // horizontale schermpadding (px-gutter)
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 250ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
