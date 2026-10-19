import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Field-level access for one entity, e.g. useFieldAccess("container").
 *
 * Three states per field, resolved on the server and published through
 * /auth/me/access:
 *   "edit"   - render it, let it be changed
 *   "read"   - render it disabled
 *   "hidden" - do not render it at all
 *
 * A field the registry does not classify is open, so a screen can adopt this
 * incrementally without first enumerating every input it owns.
 *
 * This is presentation only. The API redacts hidden fields from its responses
 * and refuses writes to fields it did not grant, so a tampered client gains
 * nothing -- see Backend/.agents/rules/security.md.
 */
export default function useFieldAccess(entity) {
  const { fieldMode, fieldRegistry, accessLoaded } = useAuth();

  const mode = useCallback(
    (fieldKey) => fieldMode(entity, fieldKey),
    [fieldMode, entity]
  );

  const api = useMemo(
    () => ({
      mode,
      canSee: (fieldKey) => mode(fieldKey) !== "hidden",
      canEdit: (fieldKey) => mode(fieldKey) === "edit",
      isLocked: (fieldKey) => mode(fieldKey) === "read",
      /** Keep only the entries this user may write, for a save payload. */
      writableKeys: (keys) => keys.filter((key) => mode(key) === "edit"),
      /** Field keys this entity classifies at all, for debugging a screen. */
      classified: Object.keys(fieldRegistry?.[entity] || {}),
      accessLoaded,
    }),
    [mode, fieldRegistry, entity, accessLoaded]
  );

  return api;
}
