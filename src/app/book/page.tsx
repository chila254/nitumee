import Image from "next/image";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { BookingForm } from "./booking-form";

export default async function BookPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "customer") redirect(user.role === "admin" ? "/admin" : "/runner");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="relative h-32 bg-stone-100 sm:h-40">
          <Image
            src="/images/market-stall.webp"
            alt="Fresh tomatoes, greens and onions stacked at a Nairobi market stall"
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            className="object-cover"
          />
        </div>
        <div className="space-y-2 p-5 sm:p-6">
          <h1 className="text-2xl font-bold">Book a shopping run</h1>
          <p className="text-sm text-stone-600">
            Give us your list and a slot, then pick a vetted runner or leave it open.
          </p>
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900">
            Safety first: we check every runner&apos;s name, national ID, phone and vehicle (with number plate) before
            they can take jobs.
          </p>
        </div>
      </div>
      <BookingForm defaultPhone={user.phone ?? ""} />
    </div>
  );
}
