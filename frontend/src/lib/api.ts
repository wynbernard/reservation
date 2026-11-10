const API_BASE_URL = "/reservation/backend";

export function apiUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
