import { mediaUrl } from "./mediaUrl";

test("uses a signed relative media URL", () => {
  process.env.REACT_APP_NETWORK = "http://localhost:9000";
  expect(mediaUrl({ file_url: "products/images/a.jpg", file_signed_url: "/blobs/products/images/a.jpg?exp=1&sig=x" }))
    .toBe("http://localhost:9000/blobs/products/images/a.jpg?exp=1&sig=x");
});

test("allows external media and refuses unsigned object keys", () => {
  expect(mediaUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  expect(mediaUrl("products/images/a.jpg")).toBeNull();
});
