import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { currentUser, setChallenge, webauthnContext } from "@/lib/auth";

export async function POST() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const { rpID, rpName } = await webauthnContext();
  const existing = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });

  await setChallenge({ kind: "register", challenge: options.challenge, userId: user.id }, 5 * 60);
  return Response.json(options);
}
