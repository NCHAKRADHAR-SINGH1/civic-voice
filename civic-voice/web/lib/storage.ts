import { User } from "./types";

let cachedUser: User | null = null;

export function saveSession(_token: string, user: User) {
  cachedUser = user;
}

export function clearSession() {
  cachedUser = null;
}

export function getToken() {
  return null;
}

export function getStoredUser(): User | null {
  return cachedUser;
}
