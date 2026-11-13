import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelBooking } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { vehicleLabel } from "@/lib/vetting";
import { StatusBadge } from "@/components/status-badge";

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const booking = await getDb()
    .orm.public.Booking.where({ id, customerId: user.id })
    .include("runner", (runner) => runner.include("user"))
    .first();
  if (!booking) notFound();

  const cancellable = booking.status === "pending" || booking.status === "accepted";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/bookings" className="text-sm text-stone-500 hover:text-stone-900">
        ← All bookings
      </Link>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Shopping run · {booking.area}</h1>
          <StatusBadge status={booking.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">When</dt>
            <dd className="font-medium">{formatSlot(booking.slotStart, booking.slotEnd)}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Budget</dt>
            <dd className="font-medium">KES {booking.budgetKes.toLocaleString("en-KE")}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Runner</dt>
            <dd className="font-medium">{booking.runner ? booking.runner.user.name : "Not assigned yet"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Booked</dt>
            <dd className="font-medium">
              {booking.createdAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" })}
            </dd>
          </div>
        </dl>
        {booking.runner && booking.status === "pending" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            We&apos;ve asked <strong>{booking.runner.user.name}</strong> to take this run
            {booking.respondBy
              ? `, and they have until ${booking.respondBy.toLocaleTimeString("en-KE", {
                  timeZone: "Africa/Nairobi",
                  hour: "2-digit",
                  minute: "2-digit",
                })} to accept`
              : ""}
            . If they can&apos;t, it goes back to other vetted runners in {booking.area}.
          </p>
        ) : booking.runner ? (
          <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            <p>
              <strong>{booking.runner.user.name}</strong> is your runner ·{" "}
              <span className="rounded-full bg-teal-700 px-2 py-0.5 text-xs font-medium text-white">Vetted by Nitumee</span>
            </p>
            <p className="mt-1 text-xs text-teal-800">
              {vehicleLabel(booking.runner.vehicleType)}
              {booking.runner.plateNumber ? ` · plate ${booking.runner.plateNumber}` : ""} · name and national ID checked
              before approval.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
            We&apos;re matching you with a vetted runner. Every runner&apos;s name, national ID and vehicle are checked
            before they can take jobs.
          </p>
        )}
        <div>
          <h2 className="mb-1 text-sm text-stone-500">Your list</h2>
          <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-relaxed">{booking.notes}</p>
        </div>
        {booking.status === "delivered" && (
          <div className="flex items-center gap-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
            <Image
              src="/images/grocery-bag.webp"
              alt="A paper bag filled with fresh groceries"
              width={800}
              height={1200}
              sizes="72px"
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
            <p>
              <strong>Delivered.</strong> We hope everything on your list arrived safely. Your receipt is with the
              runner if you need to check anything.
            </p>
          </div>
        )}
        {cancellable && (
          <form action={cancelBooking.bind(null, booking.id)}>
            <button className="btn-secondary !border-red-200 !text-red-700 hover:!bg-red-50">Cancel booking</button>
          </form>
        )}
      </div>
    </div>
  );
}
