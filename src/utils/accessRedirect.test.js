/**
 * Where a user is sent when they may not open a page.
 *
 * The dashboard is somewhere they can work from; the access page is a dead end.
 * The trap is sending them to a dashboard they also cannot open, which would
 * bounce between the two forever, so both conditions are pinned here.
 *
 * The decision is tested as a pure function rather than by rendering the route guard:
 * react-router-dom v7 is ESM-only and this toolchain's Jest cannot resolve it.
 */
import { deniedRedirect, holds } from "./accessRedirect";

describe("deniedRedirect", () => {
  it("sends a denied user to the dashboard when they can open it", () => {
    expect(deniedRedirect(["View_Dashboard"], "/orders")).toBe("/dashboard");
  });

  it("falls back to the access page when the dashboard is closed to them too", () => {
    expect(deniedRedirect([], "/orders")).toBe("/unauthorized");
  });

  it("does not bounce when the denied page is the dashboard itself", () => {
    expect(deniedRedirect(["View_Dashboard"], "/dashboard")).toBe("/unauthorized");
  });

  it("does not bounce from a dashboard sub-page either", () => {
    expect(deniedRedirect(["View_Dashboard"], "/dashboard/templates")).toBe(
      "/unauthorized"
    );
  });

  it("copes with a missing path", () => {
    expect(deniedRedirect(["View_Dashboard"], undefined)).toBe("/dashboard");
  });
});

describe("holds", () => {
  it("accepts the exact permission", () => {
    expect(holds(["View_Order"], "View_Order")).toBe(true);
  });

  it("counts Edit, Add and Delete as granting the matching View", () => {
    expect(holds(["Edit_Order"], "View_Order")).toBe(true);
    expect(holds(["Add_Order"], "View_Order")).toBe(true);
    expect(holds(["Delete_Order"], "View_Order")).toBe(true);
  });

  it("counts the bare legacy name", () => {
    expect(holds(["Order"], "View_Order")).toBe(true);
  });

  it("does not invent access from an unrelated permission", () => {
    expect(holds(["View_Container"], "View_Order")).toBe(false);
    expect(holds([], "View_Dashboard")).toBe(false);
  });

  it("does not widen a non-View permission", () => {
    expect(holds(["View_Order"], "Edit_Order")).toBe(false);
  });
});
