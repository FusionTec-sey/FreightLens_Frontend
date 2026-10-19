/**
 * Resolve how much of a field this user may see, from the /auth/me/access payload.
 *
 * The server publishes two things: `field_registry`, mapping an entity's field
 * keys to their field class, and `field_access`, mapping a class to "read" or
 * "edit". A class the server left out of `field_access` is one the user holds
 * neither permission for, so it is hidden.
 *
 * Presentation only. The API redacts hidden fields from its responses and
 * refuses writes it did not grant.
 */
export const FIELD_MODES = { HIDDEN: "hidden", READ: "read", EDIT: "edit" };

export function resolveFieldMode(access, entity, fieldKey, { isSuperAdmin = false } = {}) {
  if (isSuperAdmin) return FIELD_MODES.EDIT;

  const code = access?.field_registry?.[entity]?.[fieldKey];
  // An unclassified field is open, so a screen can adopt field access without
  // first enumerating every input it owns.
  if (!code) return FIELD_MODES.EDIT;

  const mode = access?.field_access?.[code];
  return mode === FIELD_MODES.EDIT || mode === FIELD_MODES.READ
    ? mode
    : FIELD_MODES.HIDDEN;
}

export const canSeeField = (...args) => resolveFieldMode(...args) !== FIELD_MODES.HIDDEN;
export const canEditField = (...args) => resolveFieldMode(...args) === FIELD_MODES.EDIT;
