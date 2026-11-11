import { redirect } from "next/navigation";
import { currentUser } from "@/app/actions";
import { prisma } from "@/lib/db";
import { formatSlot } from "@/lib/slots";
import { StatusBadge } from "@/components/status-badge";

export default async function RunnerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { status: { in: ["pending", "accepted"] }, slotStart: { gte: new Date() } },
    orderBy: { slotStart: "asc" },
    include: { customer: true },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Open shopping runs</h1>
        <p className="text-sm text-stone-600">
          Accepted runs show whoever claimed them first. Claiming and in-app chat arrive in the next milestone.
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="card text-center text-stone-600">No open runs right now. Check back later.</div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {booking.area} · KES {booking.budgetKes.toLocaleString("en-KE")}
                </span>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-stone-600">{formatSlot(booking.slotStart, booking.slotEnd)}</p>
              <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm">{booking.notes}</p>
              <p className="text-xs text-stone-500">Customer: {booking.customer.name}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm text-stone-500">
        Want to run errands for Nitumee? Email <a href="mailto:hello@nitumee.com" className="text-accent hover:underline">hello@nitumee.com</a>
      </p>
    </div>
  );
}
