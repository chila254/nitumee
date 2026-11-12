import { redirect } from "next/navigation";
import {
  acceptBooking,
  claimBooking,
  declineBooking,
  markDelivered,
  releaseExpiredOffers,
  startShopping,
} from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { vehicleLabel } from "@/lib/vetting";
import { StatusBadge } from "@/components/status-badge";

export default async function RunnerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  if (user.role !== "runner") redirect("/bookings");

  const profile = user.runnerProfile;
  if (!profile) redirect("/");
  const areas = profile.areas ?? [];

  if (profile.status !== "approved") {
    const rejected = profile.status === "rejected";
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card space-y-3">
          <h1 className="text-2xl font-bold">{rejected ? "Application not approved" : "Application under review"}</h1>
          <p className="text-sm text-stone-600">
            {rejected
              ? "Our team could not approve your runner application."
              : "Thanks for applying. A person reviews every runner before they can take jobs — usually within a day."}
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Vehicle</dt>
              <dd className="font-medium">
                {vehicleLabel(profile.vehicleType)}
                {profile.plateNumber ? ` · ${profile.plateNumber}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Areas</dt>
              <dd className="font-medium">{areas.join(", ")}</dd>
            </div>
          </dl>
          {rejected ? (
            <p className="text-sm text-stone-600">
              Questions? Email{" "}
              <a className="text-accent hover:underline" href="mailto:hello@nitumee.com">
                hello@nitumee.com
              </a>
              .
            </p>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your national ID stays private — only Nitumee admins can see it.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Offers whose 10-minute window lapsed go back to the open queue.
  await releaseExpiredOffers();
  const now = new Date();

  const requests = await getDb()
    .orm.public.Booking.where({ runnerId: user.id, status: "pending" })
    .where((booking) => booking.slotStart.gt(now))
    .orderBy((booking) => booking.slotStart.asc())
    .include("customer")
    .all();

  const openAll = await getDb()
    .orm.public.Booking.where({ status: "pending" })
    .where((booking) => booking.runnerId.isNull())
    .where((booking) => booking.slotStart.gt(now))
    .orderBy((booking) => booking.slotStart.asc())
    .include("customer")
    .limit(50)
    .all();
  const open = openAll.filter((booking) => areas.includes(booking.area));

  const mine = await getDb()
    .orm.public.Booking.where({ runnerId: user.id })
    .where((booking) => booking.status.in(["accepted", "shopping"]))
    .orderBy((booking) => booking.slotStart.asc())
    .include("customer")
    .all();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Runner queue</h1>
        <p className="text-sm text-stone-600">
          You are approved for {areas.join(", ")} · {vehicleLabel(profile.vehicleType)}
          {profile.plateNumber ? ` ${profile.plateNumber}` : ""}
        </p>
      </div>

      {requests.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Requests for you</h2>
          <p className="text-sm text-stone-600">A customer picked you. Accept within ten minutes or it goes to the queue.</p>
          <ul className="space-y-3">
            {requests.map((booking) => (
              <li key={booking.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {booking.area} · KES {booking.budgetKes.toLocaleString("en-KE")}
                  </span>
                  {booking.respondBy && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Respond by{" "}
                      {booking.respondBy.toLocaleTimeString("en-KE", {
                        timeZone: "Africa/Nairobi",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
                <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm">{booking.notes}</p>
                <p className="text-xs text-stone-500">
                  Customer: {booking.customer.name} · {booking.customer.phone ?? "phone in booking"}
                </p>
                <div className="flex gap-2">
                  <form action={acceptBooking.bind(null, booking.id)}>
                    <button className="btn !px-4 !py-2">Accept run</button>
                  </form>
                  <form action={declineBooking.bind(null, booking.id)}>
                    <button className="btn-secondary !px-4 !py-2">Decline</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Your runs</h2>
          <ul className="space-y-3">
            {mine.map((booking) => (
              <li key={booking.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {booking.area} · KES {booking.budgetKes.toLocaleString("en-KE")}
                  </span>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
                <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm">{booking.notes}</p>
                <p className="text-xs text-stone-500">
                  Customer: {booking.customer.name} · {booking.customer.phone ?? "phone in booking"}
                </p>
                <form action={(booking.status === "accepted" ? startShopping : markDelivered).bind(null, booking.id)}>
                  <button className="btn !px-4 !py-2">{booking.status === "accepted" ? "Start shopping" : "Mark delivered"}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Open runs in your areas</h2>
        {open.length === 0 ? (
          <div className="card text-center text-stone-600">No open runs right now. Check back later.</div>
        ) : (
          <ul className="space-y-3">
            {open.map((booking) => (
              <li key={booking.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {booking.area} · KES {booking.budgetKes.toLocaleString("en-KE")}
                  </span>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
                <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm">{booking.notes}</p>
                <p className="text-xs text-stone-500">Customer: {booking.customer.name}</p>
                <form action={claimBooking.bind(null, booking.id)}>
                  <button className="btn-secondary !px-4 !py-2">Take this run</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
