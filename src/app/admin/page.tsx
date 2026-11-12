import { redirect } from "next/navigation";
import { approveRunner, rejectRunner, releaseExpiredOffers } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { vehicleLabel } from "@/lib/vetting";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(user.role === "runner" ? "/runner" : "/bookings");

  await releaseExpiredOffers();
  const now = new Date();

  const applications = await getDb()
    .orm.public.Runner.where({ status: "pending" })
    .include("user")
    .all();

  const waiting = await getDb()
    .orm.public.Booking.where({ status: "pending" })
    .orderBy((booking) => booking.createdAt.desc())
    .include("customer")
    .include("runner", (runner) => runner.include("user"))
    .limit(20)
    .all();

  const active = await getDb()
    .orm.public.Booking.where((booking) => booking.status.in(["accepted", "shopping"]))
    .orderBy((booking) => booking.slotStart.asc())
    .include("customer")
    .include("runner", (runner) => runner.include("user"))
    .limit(20)
    .all();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-stone-600">Vet runner applications and watch today&apos;s runs.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-stone-500">Runner applications</p>
          <p className="text-3xl font-bold">{applications.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Waiting for a runner</p>
          <p className="text-3xl font-bold">{waiting.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Active runs</p>
          <p className="text-3xl font-bold">{active.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Runner applications to vet</h2>
        {applications.length === 0 ? (
          <div className="card text-center text-stone-600">No applications waiting. Nice.</div>
        ) : (
          <ul className="space-y-3">
            {applications.map((application) => (
              <li key={application.userId} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{application.user.name}</p>
                    <p className="text-sm text-stone-500">{application.user.email}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Applied{" "}
                    {application.createdAt.toLocaleDateString("en-KE", {
                      timeZone: "Africa/Nairobi",
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-stone-500">Phone</dt>
                    <dd className="font-medium">{application.user.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">National ID</dt>
                    <dd className="font-medium">{application.idNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Vehicle</dt>
                    <dd className="font-medium">
                      {vehicleLabel(application.vehicleType)}
                      {application.plateNumber ? ` · ${application.plateNumber}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Areas</dt>
                    <dd className="font-medium">{(application.areas ?? []).join(", ")}</dd>
                  </div>
                </dl>
                <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
                  Check the name against the national ID and confirm the plate belongs to the vehicle before approving.
                </p>
                <div className="flex gap-2">
                  <form action={approveRunner.bind(null, application.userId)}>
                    <button className="btn !px-4 !py-2">Approve runner</button>
                  </form>
                  <form action={rejectRunner.bind(null, application.userId)}>
                    <button className="btn-secondary !px-4 !py-2">Reject</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Bookings waiting for a runner</h2>
        {waiting.length === 0 ? (
          <div className="card text-center text-stone-600">Nothing waiting right now.</div>
        ) : (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {waiting.map((booking) => (
              <li key={booking.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {booking.area} · KES {booking.budgetKes.toLocaleString("en-KE")}
                  </span>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
                <p className="text-xs text-stone-500">
                  {booking.customer.name} · {booking.customer.phone ?? "no phone"}
                  {booking.runner
                    ? ` · offered to ${booking.runner.user.name}${
                        booking.respondBy && booking.respondBy > now
                          ? ` until ${booking.respondBy.toLocaleTimeString("en-KE", {
                              timeZone: "Africa/Nairobi",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""
                      }`
                    : " · open to all runners"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Active runs</h2>
        {active.length === 0 ? (
          <div className="card text-center text-stone-600">No runs in progress.</div>
        ) : (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {active.map((booking) => (
              <li key={booking.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {booking.customer.name} · {booking.area}
                  </span>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
                <p className="text-xs text-stone-500">
                  Runner: {booking.runner?.user.name ?? "unassigned"}
                  {booking.runner?.plateNumber ? ` · ${booking.runner.plateNumber}` : ""}
                  {booking.runner ? ` · ${vehicleLabel(booking.runner.vehicleType)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
