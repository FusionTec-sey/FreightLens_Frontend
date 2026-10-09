/**
 * Paging for operational registers.
 *
 * The server pages these queries (`page`, `limit`) and reports the full count as
 * `total_records`. The screen must ask for each page: slicing the one page it
 * was given showed 50 rows beside a total of thousands, with no way to reach the
 * rest.
 */

/** The API caps `limit` at 1000 (ReportDatasetSchema.DatasetQuerySpec). */
export const MAX_REGISTER_PAGE_SIZE = 1000;

export const REGISTER_PAGE_SIZES = [25, 50, 100, 250, 500, MAX_REGISTER_PAGE_SIZE];

/** Used by the run modal and the viewer, so the first page matches the pager. */
export const DEFAULT_REGISTER_PAGE_SIZE = 25;

export const totalPagesFor = (totalRecords, pageSize) => {
  const size = Number(pageSize) || DEFAULT_REGISTER_PAGE_SIZE;
  return Math.max(1, Math.ceil((Number(totalRecords) || 0) / size));
};

/**
 * "Showing 51–75 of 3,400" — the sentence that would have made the missing rows
 * obvious. `count` is how many rows actually came back, so a short last page
 * reads correctly.
 */
export const showingRange = (page, pageSize, count, totalRecords) => {
  const total = Number(totalRecords) || 0;
  if (!total || !count) return `0 of ${total.toLocaleString()}`;
  const first = (Number(page) - 1) * Number(pageSize) + 1;
  const last = Math.min(first + Number(count) - 1, total);
  return `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`;
};
