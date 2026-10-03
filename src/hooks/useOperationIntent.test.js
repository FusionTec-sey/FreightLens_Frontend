import { renderHook } from "@testing-library/react";
import useOperationIntent from "./useOperationIntent";

beforeEach(() => {
  let sequence = 0;
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => `key-${++sequence}`) } });
});

test("unchanged retries retain their key across rerenders", () => {
  const { result, rerender } = renderHook(useOperationIntent);
  const first = result.current.payloadFor(["save", 1], { version: 2 });
  rerender();
  expect(result.current.payloadFor(["save", 1], { version: 2 })).toEqual(first);
  expect(window.crypto.randomUUID).toHaveBeenCalledTimes(1);
});

test("changed action, target or payload cannot reuse an old identity", () => {
  const { result } = renderHook(useOperationIntent);
  const keys = [
    result.current.payloadFor(["save", 1], { version: 2 }).operation_key,
    result.current.payloadFor(["save", 2], { version: 2 }).operation_key,
    result.current.payloadFor(["activate", 2], { version: 2 }).operation_key,
    result.current.payloadFor(["activate", 2], { version: 3 }).operation_key,
  ];
  expect(new Set(keys).size).toBe(4);
});

test("explicit new intent resets identity and snapshots are detached", () => {
  const { result } = renderHook(useOperationIntent);
  const body = { config: { factor: "12.000001" } };
  const first = result.current.payloadFor("scope", body);
  first.config.factor = "99";
  expect(result.current.payloadFor("scope", body).config.factor).toBe("12.000001");
  result.current.clear();
  expect(result.current.payloadFor("scope", body).operation_key).not.toBe(first.operation_key);
});

test("missing secure UUID cannot create a new intent", () => {
  window.crypto.randomUUID = undefined;
  const { result } = renderHook(useOperationIntent);
  expect(() => result.current.payloadFor("scope", {})).toThrow("Secure UUID");
});
