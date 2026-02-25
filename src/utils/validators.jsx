export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? "").trim());
}

export function minLen(v, n) {
  return String(v ?? "").length >= n;
}