import type { Models } from "@/prisma/contract";

type BookingStatus = Models.public_Booking["status"];

const styles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  shopping: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-stone-200 text-stone-600",
};

const labels: Record<BookingStatus, string> = {
  pending: "Waiting for a runner",
  accepted: "Runner accepted",
  shopping: "Shopping now",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
