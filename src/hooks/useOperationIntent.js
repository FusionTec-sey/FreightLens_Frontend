import { useCallback, useRef } from "react";

// In-memory retry identity, not durable draft storage or permission enforcement.
// Scope includes the action/target; the organisation-pinned parent owns lifetime.
export default function useOperationIntent() {
  const intent = useRef(null);
  const clear = useCallback(() => { intent.current = null; }, []);
  const payloadFor = useCallback((scope, body) => {
    const signature = JSON.stringify([scope, body]);
    if (intent.current?.signature !== signature) {
      if (typeof window.crypto?.randomUUID !== "function") throw new Error("Secure UUID generation is unavailable");
      intent.current = { signature, key: window.crypto.randomUUID() };
    }
    // Return a detached snapshot; later edits cannot mutate a submitted request.
    return { ...JSON.parse(signature)[1], operation_key: intent.current.key };
  }, []);
  return { payloadFor, clear };
}
