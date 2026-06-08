module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff3eb",
          100: "#ffe1cc",
          200: "#ffc9a3",
          400: "#ff8a4f",
          500: "#ff6b3d",
          600: "#f45b2a",
          700: "#d84b20"
        },
        sand: {
          50: "#faf7f2",
          100: "#f3ede4",
          200: "#e8ddcf",
          300: "#d8c6b4"
        },
        ink: {
          500: "#1f2937",
          600: "#111827"
        }
      },
      boxShadow: {
        soft: "0 24px 60px -32px rgba(15, 23, 42, 0.35)",
        card: "0 18px 50px -30px rgba(15, 23, 42, 0.4)"
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"DM Sans"', "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
