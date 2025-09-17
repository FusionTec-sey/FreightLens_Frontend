// ThemeContext.js
import { button, s, text } from "framer-motion/m";
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const themes = {
  light: {
    background: "bg-white text-gray-900",
    surface: "bg-white",
    mutedBg: "bg-gray-100",
    border: "border-gray-200",
    hover: "hover:bg-gray-50",
    profileText: "text-gray-600",
    mutedText: "text-gray-600",
    accentText: "text-blue-600",
    tableHeader: "bg-gray-100 text-gray-700",
    tableRow: "hover:bg-gray-50",
    tableText: "text-gray-900",
    tableMutedText: "text-gray-600",
    scrollbar: "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
    shadow: "shadow-lg shadow-gray-200",
    button: "bg-blue-600 text-white hover:bg-blue-700",
    text: "text-gray-900",
  },
  dark: {
    background: "bg-slate-950 text-white",
    surface: "bg-slate-900",
    mutedBg: "bg-slate-800",
    border: "border-slate-700",
    hover: "hover:bg-slate-800",
    profileText: "text-slate-300",
    mutedText: "text-slate-300",
    accentText: "text-blue-400",
    tableHeader: "bg-slate-800 text-slate-200",
    tableRow: "hover:bg-slate-800",
    tableText: "text-white",
    tableMutedText: "text-slate-300",
    scrollbar: "scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800",
    shadow: "shadow-lg shadow-slate-900",
    button: "bg-blue-600 text-white hover:bg-blue-700",
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
