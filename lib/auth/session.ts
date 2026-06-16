"use client";

import { refresh as refreshAuthSession } from "@/lib/api/scrolls";
import type { AuthSession } from "@/lib/types/scrolls";

const sessionKey = "scrolls.web.session";

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
}

export function clearSession() {
  window.localStorage.removeItem(sessionKey);
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
