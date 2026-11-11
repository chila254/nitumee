import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { StatusBadge } from "@/components/status-badge";

export default async function BookingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "runner") redirect("/runner");

  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    orderBy: { slotStart: "desc" },
    include: { runner: { include: { user: true } } },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <Link href="/book" className="btn !px-4 !py-2">
          New booking
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="card text-center text-stone-600">
          <p className="mb-3">You have no bookings yet.</p>
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
                    {booking.runner ? `Runner: ${booking.runner.user.name}` : "Waiting for a runner"}
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
