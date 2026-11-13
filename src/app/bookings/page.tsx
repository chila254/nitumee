import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { StatusBadge } from "@/components/status-badge";

export default async function BookingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "runner") redirect("/runner");

  const bookings = await getDb()
    .orm.public.Booking.where({ customerId: user.id })
    .orderBy((booking) => booking.slotStart.desc())
    .include("runner", (runner) => runner.include("user"))
    .limit(50)
    .all();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <Link href="/book" className="btn !px-4 !py-2">
          New booking
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 text-center text-stone-600">
          <Image
            src="/images/empty-basket.webp"
            alt="An empty woven shopping basket on a kitchen table"
            width={900}
            height={675}
            sizes="176px"
            className="h-28 w-44 rounded-xl object-cover"
          />
          <p>Nothing in the basket yet — you have no bookings.</p>
          <Link href="/book" className="btn">
            Book your first shopping run
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link href={`/bookings/${booking.id}`} className="card flex flex-wrap items-center justify-between gap-3 transition hover:border-stone-300">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{booking.area}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
                  <p className="truncate text-sm text-stone-500">
                    {booking.runner
                      ? booking.status === "pending"
                        ? `Offered to ${booking.runner.user.name}`
                        : `Runner: ${booking.runner.user.name}`
                      : "Waiting for a runner"}
                  </p>
                </div>
                <span className="font-semibold text-accent">KES {booking.budgetKes.toLocaleString("en-KE")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
