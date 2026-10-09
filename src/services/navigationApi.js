import axios from "axios";

// The global interceptors in AuthContext attach the bearer token and the
// X-Active-Org header, so these calls carry tenant context automatically.
const baseURL = `${process.env.REACT_APP_NETWORK}/navigation`;

/**
 * The signed-in user's navigation tree for the active organisation, built from
 * its published menu. Returns { menu, permissions, modules, is_default }.
 *
 * Visibility only: every node still passes PrivateRoute, and the API enforces
 * its own permissions regardless of what the sidebar shows.
 *
 * Takes an axios config so the caller can supply its own auth headers. The
 * sidebar loads before AuthContext has registered its interceptors, so relying
 * on them would send the first request of a page load unauthenticated.
 */
export const fetchMyMenu = async (config = {}) => {
  const { data } = await axios.get(`${baseURL}/my-menu`, config);
  return data;
};

/**
 * Page registry — what the Menu Designer offers instead of free-typed URLs.
 * Returns { pages, groups, maxMenuDepth, maxMenuItems }. The limits come from the
 * server so the designer enforces exactly what the save endpoint accepts.
 */
export const fetchPageRegistry = async () => {
  const { data } = await axios.get(`${baseURL}/pages`);
  return {
    pages: Array.isArray(data?.pages) ? data.pages : [],
    groups: Array.isArray(data?.groups) ? data.groups : [],
    maxMenuDepth: data?.max_menu_depth,
    maxMenuItems: data?.max_menu_items,
  };
};

/** Every menu this organisation has designed, published one first. */
export const fetchMenus = async () => {
  const { data } = await axios.get(`${baseURL}/menus`);
  return Array.isArray(data) ? data : [];
};

/** One menu with its rows, for editing. */
export const fetchMenu = async (menuId) => {
  const { data } = await axios.get(`${baseURL}/menus/${menuId}`);
  return data;
};

/**
 * Start a new menu. Seeded from the page registry unless told otherwise, and
 * published automatically when it is the organisation's first.
 */
export const createMenu = async ({ name, description = null, seedFromDefault = true }) => {
  const { data } = await axios.post(`${baseURL}/menus`, {
    name,
    description,
    seed_from_default: seedFromDefault,
  });
  return data;
};

/** Rename a menu, set which roles it serves, or share it across companies. */
export const updateMenu = async (
  menuId,
  { name, description, roleIds, isShared } = {}
) => {
  const body = {};
  if (name !== undefined) body.name = name;
  if (description !== undefined) body.description = description;
  // Replaces the whole assignment; a role listed here is moved off any other menu.
  if (roleIds !== undefined) body.role_ids = roleIds;
  // Platform administrators only; the server rejects it from anyone else.
  if (isShared !== undefined) body.is_shared = isShared;
  const { data } = await axios.patch(`${baseURL}/menus/${menuId}`, body);
  return data;
};

/** Soft-delete a menu. The published one cannot be removed. */
export const deleteMenu = async (menuId) => {
  const { data } = await axios.delete(`${baseURL}/menus/${menuId}`);
  return data;
};

/**
 * Replace one menu's items in a single request.
 * @param {number} menuId
 * @param {Array<{temp_id: string, parent_temp_id?: string|null, label: string,
 *   icon?: string|null, page_key?: string|null, sort_order?: number,
 *   is_active?: boolean, show_when_locked?: boolean}>} items
 */
export const saveMenuItems = async (menuId, items) => {
  const { data } = await axios.put(`${baseURL}/menus/${menuId}/items`, { items });
  return data;
};

/** Pages each role of the active organisation may see, for the role preview. */
export const fetchRoleVisibility = async () => {
  const { data } = await axios.get(`${baseURL}/role-visibility`);
  return Array.isArray(data) ? data : [];
};

/**
 * Every organisation's menu state. Platform administrators only; returns 403
 * for a tenant admin, so callers treat a failure as "not available".
 */
export const fetchOrgMenus = async () => {
  const { data } = await axios.get(`${baseURL}/org-menus`);
  return Array.isArray(data) ? data : [];
};
