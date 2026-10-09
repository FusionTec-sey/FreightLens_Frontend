/**
 * Turn a FastAPI error body into text a person can act on.
 *
 * `detail` may be a string, an object, or a list of validation errors, and a
 * blob when the request asked for a file. Rendering it directly is what produced
 * "[object Object]"; dropping it is what produced "Failed to export", when the
 * server had already said "Report contains 240,000 rows; narrow the filters
 * below the 200,000 row export limit".
 */
export const errorText = async (err, fallback = "Unknown error") => {
  let data = err?.response?.data;

  // A download request gets its error as a blob, so the JSON is inside it.
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch (e) {
      data = null;
    }
  }

  const detail = data?.detail;
  if (!detail) return err?.message || fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => `${(d.loc || []).slice(-1)[0] || "field"}: ${d.msg}`)
      .join("; ");
  }
  if (typeof detail === "object") return detail.message || JSON.stringify(detail);
  return String(detail);
};

export default errorText;
