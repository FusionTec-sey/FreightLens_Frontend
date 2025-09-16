// ThemeContext.js
import { button, s, text } from "framer-motion/m";
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const themes = {
  light: {
    background: "bg-white text-slate-900",
    border: "border-slate-200",
    hover: "hover:bg-slate-200",
    profileText: "text-slate-400",
    scrollbar: "scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100",
    shadow: "shadow-lg shadow-blue-500/40 dark:shadow-white/40",
    button: "bg-slate-900 text-white hover:bg-slate-700",
    text: "text-slate-900",
  },
  dark: {
    background: "bg-slate-950 text-white",
    border: "border-slate-800",
    hover: "hover:bg-slate-800",
    profileText: "text-slate-400", // tweak if you want lighter
    scrollbar: "scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900",
    shadow: "shadow-lg shadow-blue-500/40 dark:shadow-white/40",
    button: "bg-white text-slate-900 hover:bg-slate-200",
    text: "text-white",
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") return false;
    if (stored === "dark") return true;
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const theme = isDark ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
