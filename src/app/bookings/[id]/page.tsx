import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelBooking, currentUser } from "@/app/actions";
import { prisma } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { StatusBadge } from "@/components/status-badge";

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const booking = await prisma.booking.findFirst({
    where: { id, customerId: user.id },
    include: { runner: { include: { user: true } } },
  });
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
        <div>
          <h2 className="mb-1 text-sm text-stone-500">Your list</h2>
          <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-relaxed">{booking.notes}</p>
        </div>
        {cancellable && (
          <form action={cancelBooking.bind(null, booking.id)}>
            <button className="btn-secondary !border-red-200 !text-red-700 hover:!bg-red-50">Cancel booking</button>
          </form>
        )}
      </div>
    </div>
  );
}
