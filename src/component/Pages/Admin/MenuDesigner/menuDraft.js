/**
 * Pure helpers for the Menu Designer draft.
 *
 * The draft is a flat array of items keyed by a client-generated `temp_id`, which
 * is exactly the shape `PUT /navigation/menu-items` accepts. Keeping it flat makes
 * move/reparent/delete simple and keeps every operation easy to test.
 *
 * Item shape:
 *   { temp_id, parent_temp_id, label, icon, page_key, sort_order,
 *     is_active, show_when_locked }
 * A null `page_key` means the item is a folder.
 */

/**
 * Fallback depth limit, used only until the server states its own in
 * `GET /navigation/pages`. The sidebar has exactly three visual tiers —
 * section header, accordion, sub link — so a fourth level has nowhere to render.
 */
export const MAX_MENU_DEPTH = 3;

/**
 * Folder or page, decided explicitly rather than by truthiness:
 *
 *   page_key === null       a folder
 *   page_key === ""         a page the admin has not chosen yet
 *   page_key === "ORDERS"   a page
 *
 * `""` is falsy, so a plain `!item.page_key` test reads a half-filled page as a
 * folder. Every folder/page decision goes through these two helpers.
 */
export const isFolderItem = (item) =>
  !item?.is_separator &&
  (item?.page_key === null || item?.page_key === undefined);

export const isUnassignedPage = (item) =>
  item?.page_key === "" && !item?.is_separator;

/** A section heading: a label alone, with no route and no children. */
export const isSeparator = (item) => Boolean(item?.is_separator);

let sequence = 0;

/** Client-side id for an item that does not exist in the database yet. */
export const newTempId = () => {
  sequence += 1;
  return `t${Date.now().toString(36)}${sequence.toString(36)}`;
};

/** Convert stored rows from `GET /navigation/menu-items` into a draft. */
export const draftFromRows = (rows = []) => {
  const tempById = new Map(rows.map((row) => [row.id, `s${row.id}`]));
  return rows.map((row) => ({
    temp_id: tempById.get(row.id),
    parent_temp_id: row.parent_id ? tempById.get(row.parent_id) || null : null,
    label: row.label,
    icon: row.icon || null,
    page_key: row.page_key || null,
    is_separator: Boolean(row.is_separator),
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active !== false,
    show_when_locked: Boolean(row.show_when_locked),
  }));
};

/** Seed a draft from the page registry, grouped the way the backend default is. */
export const draftFromRegistry = (pages = [], groups = []) => {
  const draft = [];
  let order = 0;

  // A heading followed by its pages at the top level, which is how the sidebar
  // draws a section. Mirrors the server-side seed.
  groups.forEach((group) => {
    const groupPages = pages.filter((page) => page.group_key === group.group_key);
    if (!groupPages.length) return;

    draft.push({
      temp_id: newTempId(),
      parent_temp_id: null,
      label: group.label,
      icon: null,
      page_key: null,
      is_separator: true,
      sort_order: order++,
      is_active: true,
      show_when_locked: false,
    });

    groupPages.forEach((page) => {
      draft.push({
        temp_id: newTempId(),
        parent_temp_id: null,
        label: page.title,
        icon: page.default_icon || null,
        page_key: page.page_key,
        is_separator: false,
        sort_order: order++,
        is_active: true,
        show_when_locked: false,
      });
    });
  });

  return normalizeSortOrder(draft);
};

export const childrenOf = (draft, parentTempId) =>
  draft
    .filter((item) => (item.parent_temp_id || null) === (parentTempId || null))
    .sort((a, b) => a.sort_order - b.sort_order);

/** Nesting level of an item, 1 for a root item. */
export const depthOf = (draft, tempId) => {
  const parentOf = new Map(draft.map((item) => [item.temp_id, item.parent_temp_id]));
  let depth = 1;
  let cursor = parentOf.get(tempId);
  const seen = new Set([tempId]);
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    depth += 1;
    cursor = parentOf.get(cursor);
  }
  return depth;
};

/** Every descendant temp_id of an item, the item itself excluded. */
export const descendantsOf = (draft, tempId) => {
  const out = [];
  const walk = (parentId) => {
    draft
      .filter((item) => item.parent_temp_id === parentId)
      .forEach((child) => {
        out.push(child.temp_id);
        walk(child.temp_id);
      });
  };
  walk(tempId);
  return out;
};

/** How many levels the subtree rooted at an item occupies; 1 when it has no children. */
export const subtreeHeight = (draft, tempId) => {
  const measure = (id, seen) => {
    const children = draft.filter(
      (item) => item.parent_temp_id === id && !seen.has(item.temp_id)
    );
    if (!children.length) return 1;
    return (
      1 +
      Math.max(...children.map((child) => measure(child.temp_id, new Set([...seen, child.temp_id]))))
    );
  };
  return measure(tempId, new Set([tempId]));
};

/**
 * Whether an item (with everything nested under it) may sit under a parent.
 * `null` means the top level. Used to build the parent dropdown, so the designer
 * never offers a move the server would reject.
 */
export const canNestUnder = (draft, tempId, parentTempId, maxDepth = MAX_MENU_DEPTH) => {
  const parent = parentTempId || null;
  if (!parent) return subtreeHeight(draft, tempId) <= maxDepth;
  if (parent === tempId) return false;
  if (descendantsOf(draft, tempId).includes(parent)) return false;
  return depthOf(draft, parent) + subtreeHeight(draft, tempId) <= maxDepth;
};

/**
 * Whether a brand-new item fits under a parent. `height` is 1 for a page and 2
 * for a folder, because a folder with no room for children would never render.
 */
export const canAddUnder = (draft, parentTempId, maxDepth = MAX_MENU_DEPTH, height = 1) => {
  const parentDepth = parentTempId ? depthOf(draft, parentTempId) : 0;
  return parentDepth + height <= maxDepth;
};

/** Nested tree for rendering, siblings ordered by sort_order. */
export const buildTree = (draft) => {
  const nodes = new Map(draft.map((item) => [item.temp_id, { ...item, children: [] }]));
  const roots = [];
  nodes.forEach((node) => {
    const parent = node.parent_temp_id ? nodes.get(node.parent_temp_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sortRecursive = (list) => {
    list.sort((a, b) => a.sort_order - b.sort_order);
    list.forEach((node) => sortRecursive(node.children));
    return list;
  };
  return sortRecursive(roots);
};

/** Renumber each sibling group 0..n-1 so ordering survives a round trip. */
export const normalizeSortOrder = (draft) => {
  const byParent = new Map();
  draft.forEach((item) => {
    const key = item.parent_temp_id || "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  });
  const next = new Map();
  byParent.forEach((siblings) => {
    siblings
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((item, index) => next.set(item.temp_id, index));
  });
  return draft.map((item) => ({ ...item, sort_order: next.get(item.temp_id) ?? 0 }));
};

export const addItem = (draft, item) =>
  normalizeSortOrder([
    ...draft,
    {
      temp_id: newTempId(),
      parent_temp_id: null,
      label: "",
      icon: null,
      page_key: null,
      is_separator: false,
      is_active: true,
      show_when_locked: false,
      // Land after the current last sibling.
      sort_order: draft.length,
      ...item,
    },
  ]);

export const updateItem = (draft, tempId, changes) =>
  draft.map((item) => (item.temp_id === tempId ? { ...item, ...changes } : item));

/** Remove an item and everything nested under it. */
export const removeItem = (draft, tempId) => {
  const doomed = new Set([tempId, ...descendantsOf(draft, tempId)]);
  return normalizeSortOrder(draft.filter((item) => !doomed.has(item.temp_id)));
};

/** Move an item one slot up or down among its siblings. */
export const moveItem = (draft, tempId, direction) => {
  const item = draft.find((entry) => entry.temp_id === tempId);
  if (!item) return draft;
  const siblings = childrenOf(draft, item.parent_temp_id);
  const index = siblings.findIndex((entry) => entry.temp_id === tempId);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= siblings.length) return draft;

  const reordered = siblings.slice();
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  const orderByTempId = new Map(reordered.map((entry, position) => [entry.temp_id, position]));
  return draft.map((entry) =>
    orderByTempId.has(entry.temp_id)
      ? { ...entry, sort_order: orderByTempId.get(entry.temp_id) }
      : entry
  );
};

/**
 * Reparent an item. Rejected when it would create a cycle or exceed the depth
 * the backend accepts, so the designer never submits a tree the API will refuse.
 */
export const reparentItem = (draft, tempId, parentTempId, maxDepth = MAX_MENU_DEPTH) => {
  const nextParent = parentTempId || null;
  if (nextParent === tempId) return { draft, error: "An item cannot be its own parent." };
  if (nextParent && descendantsOf(draft, tempId).includes(nextParent)) {
    return { draft, error: "An item cannot be moved inside one of its own children." };
  }
  if (!canNestUnder(draft, tempId, nextParent, maxDepth)) {
    return { draft, error: `Menu nesting is limited to ${maxDepth} levels.` };
  }

  const moved = draft.map((item) =>
    item.temp_id === tempId ? { ...item, parent_temp_id: nextParent } : item
  );
  return { draft: normalizeSortOrder(moved), error: null };
};

/** Client-side mirror of the server's validation, so Save fails fast and inline. */
export const validateDraft = (draft, activePageKeys = [], maxDepth = MAX_MENU_DEPTH) => {
  const errors = [];
  const allowed = new Set(activePageKeys);

  draft.forEach((item) => {
    if (!String(item.label || "").trim()) {
      errors.push("Every menu item needs a label.");
    }
    if (isUnassignedPage(item)) {
      errors.push(`"${item.label || "An item"}" has no page selected.`);
    }
    if (item.page_key && allowed.size && !allowed.has(item.page_key)) {
      errors.push(`"${item.label}" points at a page that is no longer available.`);
    }
    if (depthOf(draft, item.temp_id) > maxDepth) {
      errors.push(`Menu nesting is limited to ${maxDepth} levels.`);
    }
  });

  const emptyFolders = draft.filter(
    (item) =>
      isFolderItem(item) &&
      !isSeparator(item) &&
      childrenOf(draft, item.temp_id).length === 0
  );
  return {
    errors: [...new Set(errors)],
    // Not fatal: the API accepts these, but they are invisible to users.
    warnings: emptyFolders.map((item) => `"${item.label || "Untitled"}" is an empty folder and will not be shown.`),
  };
};

/** Payload for `PUT /navigation/menu-items`. */
export const toSavePayload = (draft) =>
  normalizeSortOrder(draft).map((item) => ({
    temp_id: item.temp_id,
    parent_temp_id: item.parent_temp_id || null,
    label: String(item.label || "").trim(),
    icon: item.icon || null,
    page_key: item.page_key || null,
    is_separator: Boolean(item.is_separator),
    sort_order: item.sort_order,
    is_active: item.is_active !== false,
    show_when_locked: Boolean(item.show_when_locked),
  }));

/**
 * Filter a draft tree the way `/my-menu` would for a role: drop pages the role
 * cannot open unless the item is marked show-when-locked, then drop folders left
 * with nothing visible in them.
 */
export const previewForRole = (draft, allowedPageKeys) => {
  const allowed = new Set(allowedPageKeys || []);
  const visible = (nodes) =>
    nodes
      .filter((node) => node.is_active !== false)
      .map((node) => ({ ...node, children: visible(node.children) }))
      .filter((node) => {
        if (isSeparator(node)) return true;
        if (isFolderItem(node)) return node.children.length > 0;
        if (isUnassignedPage(node)) return false;
        const permitted = allowed.has(node.page_key);
        return permitted || node.show_when_locked;
      })
      .map((node) => ({
        ...node,
        locked: Boolean(node.page_key) && !allowed.has(node.page_key),
      }));
  return dropEmptySeparators(visible(buildTree(draft)));
};

/** Remove a heading left with nothing under it before the next heading. */
export const dropEmptySeparators = (nodes) => {
  const kept = [];
  let seenItem = false;
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (isSeparator(node)) {
      if (seenItem) kept.push(node);
      seenItem = false;
    } else {
      kept.push(node);
      seenItem = true;
    }
  }
  return kept.reverse();
};
