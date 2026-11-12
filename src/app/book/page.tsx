import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { BookingForm } from "./booking-form";

export default async function BookPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "customer") redirect(user.role === "admin" ? "/admin" : "/runner");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Book a shopping run</h1>
        <p className="text-sm text-stone-600">
          Give us your list and a slot, then pick a vetted runner or leave it open.
        </p>
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900">
          Safety first: we check every runner&apos;s name, national ID, phone and vehicle (with number plate) before
          they can take jobs.
        </p>
      </div>
      <BookingForm defaultPhone={user.phone ?? ""} />
    </div>
  );
}
