const EXTERNAL_MEDIA_PREFIXES = ["http://", "https://", "blob:", "data:"];

const absoluteUrl = (value) => {
  if (!value) return null;
  if (EXTERNAL_MEDIA_PREFIXES.some((prefix) => value.startsWith(prefix))) return value;
  const apiBase = process.env.REACT_APP_NETWORK || "";
  return `${apiBase}${value.startsWith("/") ? "" : "/"}${value}`;
};

export const mediaUrl = (source, field = "file_url") => {
  if (!source) return null;
  if (typeof source === "string") {
    return EXTERNAL_MEDIA_PREFIXES.some((prefix) => source.startsWith(prefix)) ? source : null;
  }

  const signedField = `${field.replace(/_url$/, "")}_signed_url`;
  const signed = source[signedField] || source.file_signed_url || source.signed_url;
  if (signed) return absoluteUrl(signed);

  const raw = source[field] || source.file_url || source.url;
  return typeof raw === "string" && EXTERNAL_MEDIA_PREFIXES.some((prefix) => raw.startsWith(prefix))
    ? raw
    : null;
};
