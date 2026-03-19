/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#030711",
          900: "#07101f",
          800: "#0d1b2d",
          700: "#15273d",
          600: "#223a57",
          500: "#2f4f74"
        },
        brand: {
          300: "#53f6dc",
          400: "#17dfc1",
          500: "#00c7ab"
        }
      },
      boxShadow: {
        panel: "0 20px 50px rgba(2, 8, 18, 0.45)"
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};

