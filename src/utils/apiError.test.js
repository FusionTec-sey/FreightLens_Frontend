/**
 * Error text. The server already says what is wrong; these are the shapes it
 * says it in, and the two ways that message used to be lost.
 */
import { errorText } from "./apiError";

const res = (data) => ({ response: { data } });

describe("errorText", () => {
  it("passes a plain detail through", async () => {
    await expect(
      errorText(res({ detail: "Report contains 240,000 rows; narrow the filters." }))
    ).resolves.toBe("Report contains 240,000 rows; narrow the filters.");
  });

  it("reads a detail out of a blob, as a download error arrives", async () => {
    const blob = { text: async () => JSON.stringify({ detail: "Export limit reached" }) };
    Object.setPrototypeOf(blob, Blob.prototype);
    await expect(errorText(res(blob))).resolves.toBe("Export limit reached");
  });

  it("names the field in a validation list", async () => {
    const err = res({ detail: [{ loc: ["body", "entity_id"], msg: "Input should be a valid integer" }] });
    await expect(errorText(err)).resolves.toBe("entity_id: Input should be a valid integer");
  });

  it("does not render an object as [object Object]", async () => {
    const text = await errorText(res({ detail: { code: "too_many_rows", rows: 240000 } }));
    expect(text).not.toContain("[object Object]");
    expect(text).toContain("too_many_rows");
  });

  it("falls back when there is no detail at all", async () => {
    await expect(errorText({ message: "Network Error" }, "Failed")).resolves.toBe("Network Error");
    await expect(errorText({}, "Failed to export")).resolves.toBe("Failed to export");
  });
});
