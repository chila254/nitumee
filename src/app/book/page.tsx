import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { BookingForm } from "./booking-form";

export default async function BookPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Book a shopping run</h1>
        <p className="text-sm text-stone-600">
          Give us your list and a slot. The first runner available in your area will take it.
        </p>
      </div>
      <BookingForm defaultPhone={user.phone ?? ""} />
    </div>
  );
}
