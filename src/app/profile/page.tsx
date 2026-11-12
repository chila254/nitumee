import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vehicleLabel } from "@/lib/vetting";
import { ProfileForm } from "./profile-form";

const runnerStatusCopy = {
  pending: { label: "Under review", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Not approved", className: "bg-stone-200 text-stone-600" },
} as const;

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const passkeys = await getDb()
    .orm.public.WebAuthnCredential.where({ userId: user.id })
    .orderBy((credential) => credential.createdAt.desc())
    .all();

  const runner = user.role === "runner" ? user.runnerProfile : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-stone-600">Signed in as {user.email}</p>
      </div>
      {runner && (
        <div className="card space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Runner account</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${runnerStatusCopy[runner.status].className}`}>
              {runnerStatusCopy[runner.status].label}
            </span>
          </div>
          <p className="text-stone-600">
            {vehicleLabel(runner.vehicleType)}
            {runner.plateNumber ? ` · ${runner.plateNumber}` : ""}
          </p>
          <p className="text-stone-600">Areas: {(runner.areas ?? []).join(", ")}</p>
          <p className="text-xs text-stone-500">Your national ID is only visible to Nitumee admins.</p>
        </div>
      )}
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
