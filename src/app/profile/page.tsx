import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const passkeys = await getDb()
    .orm.public.WebAuthnCredential.where({ userId: user.id })
    .orderBy((credential) => credential.createdAt.desc())
    .all();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-stone-600">Signed in as {user.email}</p>
      </div>
      <ProfileForm
        name={user.name}
        phone={user.phone}
        passkeys={passkeys.map((p) => ({
          id: p.id,
          deviceName: p.deviceName,
          createdAt: p.createdAt.toISOString(),
          lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
