// ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

/**
 * Ergonomic, Low-Eye-Strain Theme Tokens (DES / Computer Vision Syndrome Research Compliant)
 * - Light: Off-white slate background (replaces blinding pure #ffffff) with charcoal slate text (replaces harsh #000000).
 * - Dark: Deep balanced slate #0F172A (replaces pitch-black #000000) to eliminate halation and accommodative stress.
 * - Accents: Calmer indigo/slate tones rather than piercing high-frequency neon blue.
 */
const themes = {
  light: {
    background: "bg-slate-50 text-slate-800",
    surface: "bg-white",
    mutedBg: "bg-slate-100/90",
    border: "border-slate-200",
    hover: "hover:bg-slate-100/80",
    profileText: "text-slate-600",
    mutedText: "text-slate-500",
    accentText: "text-indigo-600",
    tableHeader: "bg-slate-100/90 text-slate-700",
    tableRow: "hover:bg-slate-100/60",
    tableText: "text-slate-800",
    tableMutedText: "text-slate-500",
    scrollbar: "scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100",
    shadow: "shadow-md shadow-slate-200/60",
    button: "bg-indigo-600 text-white hover:bg-indigo-700",
    text: "text-slate-800",
  },
  dark: {
    background: "bg-[#0F172A] text-slate-200",
    surface: "bg-[#1E293B]",
    mutedBg: "bg-slate-800/90",
    border: "border-slate-700/80",
    hover: "hover:bg-slate-800/80",
    profileText: "text-slate-400",
    mutedText: "text-slate-400",
    accentText: "text-indigo-400",
    tableHeader: "bg-slate-800 text-slate-300",
    tableRow: "hover:bg-slate-800/60",
    tableText: "text-slate-200",
    tableMutedText: "text-slate-400",
    scrollbar: "scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800",
    shadow: "shadow-md shadow-slate-950/40",
    button: "bg-indigo-600 text-slate-100 hover:bg-indigo-500",
    text: "text-slate-200",
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") return false;
    if (stored === "dark") return true;
    return false;
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
