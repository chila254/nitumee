"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Passkey request failed.");
  return data as T;
}

function friendly(err: unknown): string {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return "Passkey prompt was cancelled or timed out.";
  }
  return err instanceof Error ? err.message : "Passkey failed.";
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function registerPasskey(deviceName?: string): Promise<void> {
  try {
    const options = await call<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/passkeys/register/options");
    const response = await startRegistration({ optionsJSON: options });
    await call("/api/passkeys/register/verify", { response, deviceName });
  } catch (err) {
    throw new Error(friendly(err));
  }
}

/** Returns the path to land on after a successful passkey sign-in. */
export async function signInWithPasskey(): Promise<string> {
  try {
    const options = await call<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/passkeys/login/options");
    const response = await startAuthentication({ optionsJSON: options });
    const result = await call<{ redirectTo: string }>("/api/passkeys/login/verify", { response });
    return result.redirectTo;
  } catch (err) {
    throw new Error(friendly(err));
  }
}
