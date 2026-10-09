import {
  MAX_MENU_DEPTH,
  addItem,
  buildTree,
  canAddUnder,
  canNestUnder,
  childrenOf,
  depthOf,
  draftFromRows,
  dropEmptySeparators,
  isFolderItem,
  isSeparator,
  isUnassignedPage,
  moveItem,
  normalizeSortOrder,
  previewForRole,
  removeItem,
  reparentItem,
  subtreeHeight,
  toSavePayload,
  updateItem,
  validateDraft,
} from "./menuDraft";

const draft = () => {
  let items = [];
  items = addItem(items, { label: "Logistics", icon: "Container" });
  const folder = items[0].temp_id;
  items = addItem(items, { label: "Containers", page_key: "CONTAINER_REGISTER", parent_temp_id: folder });
  items = addItem(items, { label: "Bills of Lading", page_key: "BILLS_OF_LADING", parent_temp_id: folder });
  items = addItem(items, { label: "Dashboard", page_key: "DASHBOARD" });
  return { items, folder };
};

describe("menuDraft", () => {
  it("builds a nested tree with siblings in sort order", () => {
    const { items } = draft();
    const tree = buildTree(items);
    expect(tree.map((n) => n.label)).toEqual(["Logistics", "Dashboard"]);
    expect(tree[0].children.map((n) => n.label)).toEqual(["Containers", "Bills of Lading"]);
  });

  it("moves an item among its siblings only", () => {
    const { items, folder } = draft();
    const bl = items.find((i) => i.page_key === "BILLS_OF_LADING").temp_id;
    const moved = moveItem(items, bl, "up");
    expect(childrenOf(moved, folder).map((i) => i.label)).toEqual([
      "Bills of Lading",
      "Containers",
    ]);
  });

  it("ignores a move past the first or last sibling", () => {
    const { items, folder } = draft();
    const first = childrenOf(items, folder)[0].temp_id;
    expect(moveItem(items, first, "up")).toEqual(items);
  });

  it("removes an item together with its descendants", () => {
    const { items, folder } = draft();
    const remaining = removeItem(items, folder);
    expect(remaining.map((i) => i.label)).toEqual(["Dashboard"]);
  });

  it("refuses to nest an item inside its own child", () => {
    const { items, folder } = draft();
    const child = childrenOf(items, folder)[0].temp_id;
    const { draft: next, error } = reparentItem(items, folder, child);
    expect(error).toMatch(/own children/i);
    expect(next).toEqual(items);
  });

  it("refuses to nest an item inside itself", () => {
    const { items, folder } = draft();
    expect(reparentItem(items, folder, folder).error).toMatch(/own parent/i);
  });

  it("refuses nesting deeper than the backend allows", () => {
    let items = [];
    items = addItem(items, { label: "L1" });
    const l1 = items[0].temp_id;
    items = addItem(items, { label: "L2", parent_temp_id: l1 });
    const l2 = items[1].temp_id;
    items = addItem(items, { label: "L3", parent_temp_id: l2 });
    const l3 = items[2].temp_id;
    items = addItem(items, { label: "Loose", page_key: "DASHBOARD" });
    const loose = items[3].temp_id;

    expect(depthOf(items, l3)).toBe(MAX_MENU_DEPTH);
    const { error } = reparentItem(items, loose, l3);
    expect(error).toMatch(/limited to 3 levels/i);
  });

  it("measures the height of a subtree, not just one item's depth", () => {
    const { items, folder } = draft();
    expect(subtreeHeight(items, folder)).toBe(2);
    expect(subtreeHeight(items, childrenOf(items, folder)[0].temp_id)).toBe(1);
  });

  it("refuses a move that would push nested children past the limit", () => {
    // A two-level subtree cannot go under a level-2 folder: that needs 4 levels.
    let items = [];
    items = addItem(items, { label: "Top" });
    const top = items[0].temp_id;
    items = addItem(items, { label: "Mid", parent_temp_id: top });
    const mid = items[1].temp_id;
    items = addItem(items, { label: "Group" });
    const group = items[2].temp_id;
    items = addItem(items, { label: "Leaf", page_key: "DASHBOARD", parent_temp_id: group });

    expect(subtreeHeight(items, group)).toBe(2);
    expect(canNestUnder(items, group, mid)).toBe(false);
    expect(canNestUnder(items, group, top)).toBe(true);
    expect(reparentItem(items, group, mid).error).toMatch(/limited to 3 levels/i);
  });

  it("never offers a parent that is the item itself or inside it", () => {
    const { items, folder } = draft();
    const child = childrenOf(items, folder)[0].temp_id;
    expect(canNestUnder(items, folder, folder)).toBe(false);
    expect(canNestUnder(items, folder, child)).toBe(false);
  });

  it("always allows the top level", () => {
    const { items, folder } = draft();
    expect(canNestUnder(items, folder, null)).toBe(true);
  });

  it("honours a depth limit supplied by the server", () => {
    const { items, folder } = draft();
    const child = childrenOf(items, folder)[0].temp_id;
    // With a 2-level limit, a page may sit under one folder but no deeper.
    expect(canNestUnder(items, child, folder, 2)).toBe(true);
    expect(canAddUnder(items, child, 2)).toBe(false);
    expect(validateDraft(items, [], 1).errors.join(" ")).toMatch(/limited to 1 levels/i);
  });

  it("reserves a level for a new folder's children", () => {
    let items = [];
    items = addItem(items, { label: "Top" });
    const top = items[0].temp_id;
    items = addItem(items, { label: "Mid", parent_temp_id: top });
    const mid = items[1].temp_id;

    // A page fits at level 3; a folder does not, because it needs level 4 for content.
    expect(canAddUnder(items, mid, MAX_MENU_DEPTH, 1)).toBe(true);
    expect(canAddUnder(items, mid, MAX_MENU_DEPTH, 2)).toBe(false);
  });

  it("tells a folder apart from a page that has no page chosen yet", () => {
    // page_key "" is falsy, so a truthiness test would call this a folder.
    const pending = { temp_id: "a", page_key: "" };
    const folder = { temp_id: "b", page_key: null };
    const page = { temp_id: "c", page_key: "DASHBOARD" };

    expect(isFolderItem(folder)).toBe(true);
    expect(isFolderItem(pending)).toBe(false);
    expect(isFolderItem(page)).toBe(false);
    expect(isUnassignedPage(pending)).toBe(true);
    expect(isUnassignedPage(folder)).toBe(false);
  });

  it("blocks saving while an item still has no page selected", () => {
    let items = [];
    items = addItem(items, { label: "Pick me", page_key: "" });
    const { errors, warnings } = validateDraft(items, ["DASHBOARD"]);
    expect(errors.join(" ")).toMatch(/no page selected/i);
    // It must not be reported as an empty folder as well.
    expect(warnings).toEqual([]);
  });

  it("clears the error once a page is chosen", () => {
    let items = [];
    items = addItem(items, { label: "Dashboard", page_key: "" });
    const chosen = updateItem(items, items[0].temp_id, { page_key: "DASHBOARD" });
    expect(validateDraft(chosen, ["DASHBOARD"]).errors).toEqual([]);
  });

  it("does not offer a page awaiting selection as a parent folder", () => {
    let items = [];
    items = addItem(items, { label: "Pending", page_key: "" });
    const pending = items[0].temp_id;
    items = addItem(items, { label: "Leaf", page_key: "DASHBOARD" });
    const leaf = items[1].temp_id;
    // Nesting is depth-legal, but a page is not a folder, so the form filters it
    // out by isFolderItem before canNestUnder is ever consulted.
    expect(isFolderItem(items.find((i) => i.temp_id === pending))).toBe(false);
    expect(items.filter(isFolderItem).map((i) => i.temp_id)).not.toContain(pending);
    expect(leaf).toBeDefined();
  });

  it("keeps an unselected page out of the role preview", () => {
    let items = [];
    items = addItem(items, { label: "Group" });
    const group = items[0].temp_id;
    items = addItem(items, { label: "Pending", page_key: "", parent_temp_id: group });
    expect(previewForRole(items, ["DASHBOARD"])).toEqual([]);
  });

  it("treats a separator as neither folder nor page", () => {
    const sep = { temp_id: "s", page_key: null, is_separator: true };
    expect(isSeparator(sep)).toBe(true);
    expect(isFolderItem(sep)).toBe(false);
    expect(isUnassignedPage(sep)).toBe(false);
  });

  it("drops a heading left with nothing under it", () => {
    const nodes = [
      { temp_id: "a", label: "Core", is_separator: true },
      { temp_id: "b", label: "Dashboard", page_key: "DASHBOARD" },
      { temp_id: "c", label: "System", is_separator: true },
    ];
    expect(dropEmptySeparators(nodes).map((n) => n.label)).toEqual([
      "Core",
      "Dashboard",
    ]);
  });

  it("keeps consecutive content under one heading", () => {
    const nodes = [
      { temp_id: "a", label: "Core", is_separator: true },
      { temp_id: "b", label: "One", page_key: "DASHBOARD" },
      { temp_id: "c", label: "Two", page_key: "ORDERS" },
    ];
    expect(dropEmptySeparators(nodes)).toHaveLength(3);
  });

  it("hides a heading whose whole section a role cannot see", () => {
    let items = [];
    items = addItem(items, { label: "Core", page_key: null, is_separator: true });
    items = addItem(items, { label: "Dashboard", page_key: "DASHBOARD" });
    items = addItem(items, { label: "Logistics", page_key: null, is_separator: true });
    items = addItem(items, { label: "Containers", page_key: "CONTAINER_REGISTER" });

    const preview = previewForRole(items, ["DASHBOARD"]);
    expect(preview.map((n) => n.label)).toEqual(["Core", "Dashboard"]);
  });

  it("renumbers each sibling group from zero", () => {
    const { items, folder } = draft();
    const scrambled = items.map((i) => ({ ...i, sort_order: 50 - i.sort_order }));
    const normalized = normalizeSortOrder(scrambled);
    expect(childrenOf(normalized, folder).map((i) => i.sort_order)).toEqual([0, 1]);
  });

  it("flags a blank label and warns about an empty folder", () => {
    let items = [];
    items = addItem(items, { label: "  " });
    const { errors, warnings } = validateDraft(items, ["DASHBOARD"]);
    expect(errors).toEqual(["Every menu item needs a label."]);
    expect(warnings).toHaveLength(1);
  });

  it("flags a page that is no longer in the registry", () => {
    let items = [];
    items = addItem(items, { label: "Gone", page_key: "RETIRED_PAGE" });
    const { errors } = validateDraft(items, ["DASHBOARD"]);
    expect(errors.join(" ")).toMatch(/no longer available/i);
  });

  it("round-trips stored rows into a draft with parent links intact", () => {
    const rows = [
      { id: 7, parent_id: null, label: "Logistics", icon: "Container", page_key: null, sort_order: 0, is_active: true },
      { id: 9, parent_id: 7, label: "Containers", page_key: "CONTAINER_REGISTER", sort_order: 1, is_active: true, show_when_locked: true },
    ];
    const items = draftFromRows(rows);
    expect(items[1].parent_temp_id).toBe(items[0].temp_id);
    expect(toSavePayload(items)[1]).toMatchObject({
      label: "Containers",
      page_key: "CONTAINER_REGISTER",
      show_when_locked: true,
      sort_order: 0,
    });
  });

  it("trims labels in the save payload", () => {
    let items = [];
    items = addItem(items, { label: "  Dashboard  ", page_key: "DASHBOARD" });
    expect(toSavePayload(items)[0].label).toBe("Dashboard");
  });

  it("hides pages a role cannot open and drops the folder left empty", () => {
    const { items } = draft();
    const preview = previewForRole(items, ["DASHBOARD"]);
    expect(preview.map((n) => n.label)).toEqual(["Dashboard"]);
  });

  it("keeps a forbidden page visible but locked when show_when_locked is set", () => {
    const { items, folder } = draft();
    const target = childrenOf(items, folder)[0].temp_id;
    const withLocked = items.map((i) =>
      i.temp_id === target ? { ...i, show_when_locked: true } : i
    );
    const preview = previewForRole(withLocked, ["DASHBOARD"]);
    expect(preview[0].label).toBe("Logistics");
    expect(preview[0].children.map((c) => [c.label, c.locked])).toEqual([
      ["Containers", true],
    ]);
  });

  it("omits inactive items from the preview", () => {
    const { items } = draft();
    const withInactive = items.map((i) =>
      i.page_key === "DASHBOARD" ? { ...i, is_active: false } : i
    );
    const preview = previewForRole(withInactive, ["DASHBOARD", "CONTAINER_REGISTER"]);
    expect(preview.map((n) => n.label)).toEqual(["Logistics"]);
  });
});
