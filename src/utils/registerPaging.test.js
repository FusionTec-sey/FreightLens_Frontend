/**
 * The register pager.
 *
 * `records` is one server page and `total_records` is the whole count; mixing
 * the two is what showed 50 rows beside a total of thousands.
 */
import {
  DEFAULT_REGISTER_PAGE_SIZE,
  MAX_REGISTER_PAGE_SIZE,
  REGISTER_PAGE_SIZES,
  showingRange,
  totalPagesFor,
} from "./registerPaging";

describe("totalPagesFor", () => {
  it("counts pages from the full total, not the page in hand", () => {
    expect(totalPagesFor(3400, 25)).toBe(136);
  });

  it("rounds a partial last page up", () => {
    expect(totalPagesFor(51, 25)).toBe(3);
  });

  it("never reports fewer than one page", () => {
    expect(totalPagesFor(0, 25)).toBe(1);
  });

  it("falls back to the default size when none is given", () => {
    expect(totalPagesFor(100, undefined)).toBe(100 / DEFAULT_REGISTER_PAGE_SIZE);
  });
});

describe("showingRange", () => {
  it("names the rows of the page actually being viewed", () => {
    expect(showingRange(3, 25, 25, 3400)).toBe("51–75 of 3,400");
  });

  it("stops at the total on a short last page", () => {
    expect(showingRange(3, 25, 1, 51)).toBe("51–51 of 51");
  });

  it("reads correctly when the register is empty", () => {
    expect(showingRange(1, 25, 0, 0)).toBe("0 of 0");
  });
});

describe("page sizes", () => {
  it("stays within the limit the API accepts", () => {
    expect(Math.max(...REGISTER_PAGE_SIZES)).toBe(MAX_REGISTER_PAGE_SIZE);
    expect(MAX_REGISTER_PAGE_SIZE).toBe(1000);
  });

  it("offers the default as a choice", () => {
    expect(REGISTER_PAGE_SIZES).toContain(DEFAULT_REGISTER_PAGE_SIZE);
  });
});
