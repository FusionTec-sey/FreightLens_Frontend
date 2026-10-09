import {
  Boxes,
  Building2,
  CalendarCheck,
  ClipboardList,
  Coins,
  Container,
  Database,
  FilePlus,
  FileText,
  Files,
  Folder,
  Gavel,
  GitCompare,
  LayoutDashboard,
  LayoutTemplate,
  ListTree,
  PackageCheck,
  PackageOpen,
  Printer,
  Receipt,
  Settings,
  Shield,
  Ship,
  ShoppingBag,
  SlidersHorizontal,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";

/**
 * Icons a menu item or registry page may use, keyed by the name stored in the
 * database. Explicit rather than a namespace import, so the bundle only carries
 * the icons the menu can actually show, and the allowed set stays reviewable.
 *
 * Adding an icon: import it here and add it to the map; the Menu Designer picker
 * reads its options from MENU_ICON_NAMES.
 */
export const MENU_ICONS = {
  Boxes,
  Building2,
  CalendarCheck,
  ClipboardList,
  Coins,
  Container,
  Database,
  FilePlus,
  FileText,
  Files,
  Folder,
  Gavel,
  GitCompare,
  LayoutDashboard,
  LayoutTemplate,
  ListTree,
  PackageCheck,
  PackageOpen,
  Printer,
  Receipt,
  Settings,
  Shield,
  Ship,
  ShoppingBag,
  SlidersHorizontal,
  TriangleAlert,
  Truck,
  Users,
};

export const MENU_ICON_NAMES = Object.keys(MENU_ICONS).sort();

export const DEFAULT_MENU_ICON = "Folder";

/** Resolve a stored icon name to a component, falling back to a folder icon. */
export const resolveMenuIcon = (name) =>
  MENU_ICONS[name] || MENU_ICONS[DEFAULT_MENU_ICON];

export default MENU_ICONS;
