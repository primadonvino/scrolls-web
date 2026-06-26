"use client";

import { refresh as refreshAuthSession } from "@/lib/api/scrolls";
import type { AuthSession } from "@/lib/types/scrolls";

const sessionKey = "scrolls.web.session";
const accountsKey = "scrolls.web.accounts.v1";
const activeAccountKey = "scrolls.web.activeAccountID";

export type StoredAccountSession = AuthSession & {
  lastUsedAt: string;
};

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  saveAccountSession(session);
}

export function clearSession() {
  const current = readSession();
  if (current?.user?.id) removeSavedAccount(current.user.id);
  window.localStorage.removeItem(sessionKey);
  window.localStorage.removeItem(activeAccountKey);
}

export function listSavedAccounts(): StoredAccountSession[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(accountsKey);
  if (!raw) {
    const legacySession = readSession();
    return legacySession?.user?.id ? [{ ...legacySession, lastUsedAt: new Date().toISOString() }] : [];
  }
  try {
    const parsed = JSON.parse(raw) as StoredAccountSession[];
    return Array.isArray(parsed)
      ? parsed
          .filter((account) => Boolean(account?.token && account?.user?.id))
          .sort((a, b) => Date.parse(b.lastUsedAt ?? "") - Date.parse(a.lastUsedAt ?? ""))
      : [];
  } catch {
    return [];
  }
}

export function switchAccount(userID: string): AuthSession | null {
  const account = listSavedAccounts().find((item) => item.user?.id === userID);
  if (!account) return null;
  const session = storedAccountToSession(account);
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  window.localStorage.setItem(activeAccountKey, userID);
  saveAccountSession(session);
  window.dispatchEvent(new Event("scrolls-session-changed"));
  return session;
}

export function removeSavedAccount(userID: string) {
  if (typeof window === "undefined") return;
  const remaining = listSavedAccounts().filter((account) => account.user?.id !== userID);
  window.localStorage.setItem(accountsKey, JSON.stringify(remaining));

  const activeID = window.localStorage.getItem(activeAccountKey);
  if (activeID === userID) {
    const next = remaining[0];
    if (next) {
      const session = storedAccountToSession(next);
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      window.localStorage.setItem(activeAccountKey, next.user.id);
    } else {
      window.localStorage.removeItem(sessionKey);
      window.localStorage.removeItem(activeAccountKey);
    }
    window.dispatchEvent(new Event("scrolls-session-changed"));
  }
}

export async function readFreshSession(): Promise<AuthSession | null> {
  const session = readSession();
  if (!session) return null;
  if (!tokenExpiresSoon(session.token)) return session;

  const refreshToken = session.refresh_token ?? session.refreshToken;
  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const refreshed = await refreshAuthSession(refreshToken);
    const merged: AuthSession = {
      ...session,
      ...refreshed,
      refresh_token: refreshed.refresh_token ?? refreshed.refreshToken ?? refreshToken
    };
    writeSession(merged);
    return merged;
  } catch {
    clearSession();
    return null;
  }
}

function storedAccountToSession(account: StoredAccountSession): AuthSession {
  return {
    token: account.token,
    refresh_token: account.refresh_token,
    refreshToken: account.refreshToken,
    user: account.user
  };
}

function saveAccountSession(session: AuthSession) {
  if (typeof window === "undefined" || !session.user?.id) return;
  const accounts = listSavedAccounts().filter((account) => account.user?.id !== session.user.id);
  const stored: StoredAccountSession = {
    ...session,
    lastUsedAt: new Date().toISOString()
  };
  window.localStorage.setItem(accountsKey, JSON.stringify([stored, ...accounts].slice(0, 8)));
  window.localStorage.setItem(activeAccountKey, session.user.id);
  window.dispatchEvent(new Event("scrolls-session-changed"));
}

function tokenExpiresSoon(token: string): boolean {
  const payload = decodeJWTPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp - now < 120;
}

function decodeJWTPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}
