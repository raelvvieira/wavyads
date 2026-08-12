import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      // Escala tipográfica WAVY: tracking e leading fazem parte do TAMANHO.
      //
      // O ajuste ótico mora aqui, e não numa classe à parte, por causa da
      // cascata: as utilidades do Tailwind saem depois da camada de
      // componentes, então um `line-height` declarado em `.wavy-title` perde
      // silenciosamente para o `text-3xl` do mesmo elemento. Embutindo na
      // escala, `text-3xl` sozinho já sai com o espaçamento certo — e as
      // centenas de chamadas existentes herdam sem serem tocadas.
      //
      // Um título grande com o tracking do corpo fica frouxo; um rótulo de
      // 12px com o tracking do título fica ilegível. Por isso o valor aperta
      // conforme o texto cresce e afrouxa conforme ele diminui.
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.012em' }],       // 12/16 — rótulo
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.004em' }],   // 14/20 — tabela, apoio
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.002em' }],     // 16/24 — corpo
        lg: ['1.125rem', { lineHeight: '1.575rem', letterSpacing: '-0.008em' }], // 18/25 — título de card
        xl: ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.011em' }],  // 20/26 — seção
        '2xl': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.014em' }],// 24/30 — título de página
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.018em' }], // 30/36 — display compacto
        '4xl': ['2.25rem', { lineHeight: '2.5625rem', letterSpacing: '-0.022em' }],// 36/41 — display
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.024em' }],   // 48/52 — display grande
      },
      fontFamily: {
        // Fonte única, vinda do token: o body já usa --wavy-font, e deixar o
        // config apontando para outra pilha fazia a utilidade font-sans
        // renderizar uma fonte diferente do resto do produto.
        sans: ['var(--wavy-font)'],
        // Monoespaçado continua existindo de propósito — é usado em editor de
        // código, textarea de prompt e código hex, onde alinhamento importa.
        // Pilha do sistema para não custar mais um webfont.
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border) / 0.1)",
        input: "hsl(var(--input) / 0.1)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / 0.05)",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border) / 0.1)",
          ring: "hsl(var(--sidebar-ring))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // `<alpha-value>` é o que faz `bg-status-active/10` funcionar. Sem o
        // marcador, o Tailwind não consegue injetar a opacidade e o modificador
        // é silenciosamente ignorado.
        status: {
          active: "hsl(var(--status-active) / <alpha-value>)",
          paused: "hsl(var(--status-paused) / <alpha-value>)",
          ended: "hsl(var(--status-ended) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
