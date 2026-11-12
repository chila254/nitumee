import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getDb } from "@/lib/db";
import { clearChallenge, currentUser, readChallenge, webauthnContext } from "@/lib/auth";

type Pending = { kind: "register"; challenge: string; userId: string };

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const pending = await readChallenge<Pending>();
  if (!pending || pending.kind !== "register" || pending.userId !== user.id) {
    return Response.json({ error: "That passkey setup expired. Try again." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { response?: RegistrationResponseJSON; deviceName?: string }
    | null;
  if (!body?.response) return Response.json({ error: "Missing passkey response." }, { status: 400 });

  const { rpID, origin } = await webauthnContext();
  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Passkey check failed." }, { status: 400 });
  }
  if (!verified.verified || !verified.registrationInfo) {
    return Response.json({ error: "Passkey check failed." }, { status: 400 });
  }

  const { credential } = verified.registrationInfo;
  await getDb().orm.public.WebAuthnCredential.upsert({
    create: {
      id: credential.id,
      userId: user.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceName: body.deviceName?.trim().slice(0, 60) || "Passkey",
    },
    update: {},
  });

  await clearChallenge();
  return Response.json({ ok: true });
}
