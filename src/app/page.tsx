import Link from "next/link";
import { AREAS, SLOTS } from "@/lib/slots";

const steps = [
  { title: "Tell us the list", body: "Write what you need — tomatoes, unga, diapers — and your budget in KES." },
  { title: "Pick a slot", body: "Choose your area, day and a two-to-three hour window that works for you." },
  { title: "We shop, you pay", body: "A nearby runner shops, sends photos of the items and delivers. Pay with M-Pesa." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-6 text-center">
        <span className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
          Nairobi · Market &amp; supermarket runs
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          You&apos;re busy. <span className="text-accent">Nitumee</span> does the shopping.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-stone-600">
          Book a trusted runner for a time that suits you. They shop from your list, stay within budget and
          deliver to your door — while you get on with your day.
        </p>
        <p className="mx-auto max-w-2xl rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Every runner is vetted before their first job: we check their name, national ID, phone and vehicle — plate
          included — so the person at your gate is accountable.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/book" className="btn">
            Book a shopping run
          </Link>
          <Link href="/login?role=runner" className="btn-secondary">
            Work as a runner
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="card">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
              {i + 1}
            </div>
            <h2 className="mb-1 font-semibold">{step.title}</h2>
            <p className="text-sm leading-relaxed text-stone-600">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">We cover</h2>
          <ul className="flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <li key={area} className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-700">
                {area}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Daily slots</h2>
          <ul className="space-y-1 text-sm text-stone-600">
            {SLOTS.map((slot) => (
              <li key={slot.id}>{slot.label}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
