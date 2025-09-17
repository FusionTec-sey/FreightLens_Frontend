/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-20px) translateX(15px)" },
        },
        floatAlt: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(25px) translateX(-20px)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-15px) translateX(10px)" },
        },
      },
      animation: {
        "float-slow": "float 8s ease-in-out infinite",
        "float-slower": "floatAlt 10s ease-in-out infinite",
        "float-slowest": "floatSlow 12s ease-in-out infinite",
      },
      boxShadow: {
            blue: "0 4px 20px rgba(59, 130, 246, 0.6)", // blue glow
            white: "0 4px 20px rgba(255, 255, 255, 0.6)", // white glow
          },
    }

  },
  plugins: [
    require("tailwind-scrollbar"),
  ],
};
