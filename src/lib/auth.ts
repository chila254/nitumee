import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "n_session";
export const CHALLENGE_COOKIE = "n_challenge";
const SESSION_TTL_S = 60 * 60 * 24 * 30;

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s-]/g, "");
  if (/^\+?254\d{9}$/.test(digits)) digits = `0${digits.slice(-9)}`;
  else if (/^[17]\d{8}$/.test(digits)) digits = `0${digits}`;
  return /^0[17]\d{8}$/.test(digits) ? digits : null;
}

/** Writes the session cookie. Callers must not redirect in the same action
 *  before this: Next 16 needs the Set-Cookie attached to the action response
 *  the browser then follows. */
export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, { ...cookieBase, maxAge: SESSION_TTL_S });
  if (jar.get(CHALLENGE_COOKIE)) jar.delete(CHALLENGE_COOKIE);
}

export async function currentUser() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, include: { runnerProfile: true } });
}

/** Creates or extends a short-lived cookie that ties a WebAuthn challenge to
 *  this browser; passkey add/sign-in must not depend on anything stored in
 *  memory (Vercel serverless instances do not share state). */
export async function setChallenge(data: unknown, ttlSeconds: number) {
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, JSON.stringify(data), { ...cookieBase, maxAge: ttlSeconds });
}

export async function readChallenge<T>(): Promise<T | null> {
  const jar = await cookies();
  const raw = jar.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearChallenge() {
  const jar = await cookies();
  if (jar.get(CHALLENGE_COOKIE)) jar.delete(CHALLENGE_COOKIE);
}

// rpID/origin come from the request behind Vercel's proxy so previews and
// custom domains work; NEXT_PUBLIC_SITE_URL pins a canonical origin if set.
export async function webauthnContext() {
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `https://${h.get("host") ?? "localhost"}`;
  const { hostname } = new URL(origin);
  const isIp = /^[\d.]+$/.test(hostname) || hostname.includes(":");
  return { rpID: isIp ? "localhost" : hostname, origin, rpName: "Nitumee" };
}
