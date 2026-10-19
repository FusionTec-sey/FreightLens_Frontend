import { canEditField, canSeeField, resolveFieldMode } from "./fieldAccess";

const access = {
  field_registry: {
    container: {
      container_no: "CONTAINER_IDENTITY",
      tax: "CONTAINER_TAX",
      FreeDays: "CONTAINER_DEMURRAGE",
      in_bound: "CONTAINER_MILESTONE",
      note: "CONTAINER_NOTE",
    },
  },
  field_access: {
    CONTAINER_DEMURRAGE: "read",
    CONTAINER_MILESTONE: "edit",
    CONTAINER_NOTE: "edit",
  },
};

describe("resolveFieldMode", () => {
  it("hides a class the server did not grant", () => {
    expect(resolveFieldMode(access, "container", "tax")).toBe("hidden");
    expect(resolveFieldMode(access, "container", "container_no")).toBe("hidden");
    expect(canSeeField(access, "container", "tax")).toBe(false);
  });

  it("locks a class granted read-only", () => {
    expect(resolveFieldMode(access, "container", "FreeDays")).toBe("read");
    expect(canSeeField(access, "container", "FreeDays")).toBe(true);
    expect(canEditField(access, "container", "FreeDays")).toBe(false);
  });

  it("allows editing a class granted edit", () => {
    expect(resolveFieldMode(access, "container", "in_bound")).toBe("edit");
    expect(canEditField(access, "container", "note")).toBe(true);
  });

  it("leaves unclassified fields open", () => {
    expect(resolveFieldMode(access, "container", "status")).toBe("edit");
    expect(resolveFieldMode(access, "unknown_entity", "whatever")).toBe("edit");
  });

  it("gives platform admins everything", () => {
    expect(
      resolveFieldMode(access, "container", "tax", { isSuperAdmin: true })
    ).toBe("edit");
  });

  it("hides classified fields when access has not loaded", () => {
    // Failing closed matters: a blank payload must not momentarily expose a
    // field the user may never see.
    const empty = { field_registry: access.field_registry, field_access: {} };
    expect(resolveFieldMode(empty, "container", "tax")).toBe("hidden");
  });

  it("treats a missing payload as nothing classified", () => {
    expect(resolveFieldMode(null, "container", "tax")).toBe("edit");
    expect(resolveFieldMode(undefined, "container", "tax")).toBe("edit");
  });

  it("ignores a mode the server does not define", () => {
    const odd = {
      field_registry: access.field_registry,
      field_access: { CONTAINER_TAX: "write" },
    };
    expect(resolveFieldMode(odd, "container", "tax")).toBe("hidden");
  });
});
