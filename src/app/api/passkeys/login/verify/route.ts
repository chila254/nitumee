import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getDb } from "@/lib/db";
import { clearChallenge, readChallenge, startSession, webauthnContext } from "@/lib/auth";

type Pending = { kind: "login"; challenge: string };

export async function POST(request: Request) {
  const pending = await readChallenge<Pending>();
  if (!pending || pending.kind !== "login") {
    return Response.json({ error: "That passkey prompt expired. Try again." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { response?: AuthenticationResponseJSON } | null;
  if (!body?.response?.id) return Response.json({ error: "Missing passkey response." }, { status: 400 });

  // The credential owner is resolved from the authenticator's response id —
  // never from the request body — so one user cannot claim another's passkey.
  const stored = await getDb().orm.public.WebAuthnCredential.where({ id: body.response.id }).first();
  if (!stored) return Response.json({ error: "This passkey is not registered. Sign in with your password." }, { status: 401 });

  const { rpID, origin } = await webauthnContext();
  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.id,
        publicKey: Buffer.from(stored.publicKey),
        counter: stored.counter,
        transports: stored.transports as never,
      },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Passkey check failed." }, { status: 401 });
  }
  if (!verified.verified) return Response.json({ error: "Passkey check failed." }, { status: 401 });

  await getDb()
    .orm.public.WebAuthnCredential.where({ id: stored.id })
    .update({ counter: verified.authenticationInfo.newCounter, lastUsedAt: new Date() });
  await clearChallenge();
  await startSession(stored.userId);

  const user = await getDb()
    .orm.public.User.where({ id: stored.userId })
    .select("role")
    .first();
  return Response.json({ ok: true, redirectTo: user?.role === "runner" ? "/runner" : "/bookings" });
}
