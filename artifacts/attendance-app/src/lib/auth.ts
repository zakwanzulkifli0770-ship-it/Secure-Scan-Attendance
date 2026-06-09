import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";

export const TOKEN_KEY = "attendance_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Register the getter so API calls automatically use it
setAuthTokenGetter(getToken);
