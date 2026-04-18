const API_BASE = import.meta.env.VITE_VIDEO_API_URL ?? "http://127.0.0.1:8765";

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

export const isRemoteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export const isRepoLocalPath = (value: string): boolean =>
  WINDOWS_ABSOLUTE_PATH.test(value) ||
  value.startsWith("outputs/") ||
  value.startsWith("outputs\\") ||
  value.startsWith("apps/") ||
  value.startsWith("apps\\") ||
  value.startsWith("./") ||
  value.startsWith(".\\");

export const toBridgeFileUrl = (path: string): string =>
  `${API_BASE}/api/video/local-file?path=${encodeURIComponent(path.replaceAll("\\", "/"))}`;

export const resolveMediaUrl = (value: string): string => {
  if (!value) {
    return value;
  }
  if (value.startsWith("/") || isRemoteUrl(value)) {
    return value;
  }
  if (isRepoLocalPath(value)) {
    return toBridgeFileUrl(value);
  }
  return value;
};
