import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { setChallenge, webauthnContext } from "@/lib/auth";

// Discoverable passkeys: no email needed, the authenticator picks the account.
export async function POST() {
  const { rpID } = await webauthnContext();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  await setChallenge({ kind: "login", challenge: options.challenge }, 5 * 60);
  return Response.json(options);
}
