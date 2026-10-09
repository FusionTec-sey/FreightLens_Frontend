import { icons } from "lucide-react";

/**
 * Every icon the library ships, keyed by the name stored on a menu item.
 *
 * The library's own map is used rather than a hand-kept list, so an admin can
 * pick any of them and a new library version brings its new icons along. The
 * whole set costs about 100 KB gzipped, measured, paid once and then cached; the
 * hand-kept list it replaces cost almost nothing but silently fell back to a
 * folder whenever someone wanted an icon that was not on it.
 *
 * Names are PascalCase, as the library exports them: "LayoutDashboard",
 * "TriangleAlert", "Ship".
 */
export const MENU_ICONS = icons;

/** Alphabetical, for the designer's icon picker. */
export const MENU_ICON_NAMES = Object.keys(icons).sort();

export const DEFAULT_MENU_ICON = "Folder";

/** Resolve a stored icon name to a component, falling back to a folder icon. */
export const resolveMenuIcon = (name) =>
  MENU_ICONS[name] || MENU_ICONS[DEFAULT_MENU_ICON];

/**
 * Icon names matching a search term, best first: names starting with the term
 * before names that merely contain it. Capped, because rendering 1594 previews
 * at once is both slow and unreadable.
 */
export const searchMenuIcons = (term, limit = 60) => {
  const query = String(term || "").trim().toLowerCase();
  if (!query) return MENU_ICON_NAMES.slice(0, limit);

  const startsWith = [];
  const contains = [];
  for (const name of MENU_ICON_NAMES) {
    const lower = name.toLowerCase();
    if (lower.startsWith(query)) startsWith.push(name);
    else if (lower.includes(query)) contains.push(name);
  }
  return [...startsWith, ...contains].slice(0, limit);
};

export default MENU_ICONS;
