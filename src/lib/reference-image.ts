const SUPPORTED_PREFIXES = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"];

export const MAX_REFERENCE_IMAGE_BYTES = 900_000;

export function isReferenceImageDataUrl(value: string) {
  return SUPPORTED_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function estimateDataUrlBytes(value: string) {
  const payload = value.split(",", 2)[1] ?? "";
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

export function normalizeReferenceImageDataUrl(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!isReferenceImageDataUrl(normalized)) {
    throw new Error("La imagen debe ser JPG, PNG o WEBP.");
  }

  const bytes = estimateDataUrlBytes(normalized);
  if (bytes > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("La imagen excede el límite de 900 KB.");
  }

  return normalized;
}
