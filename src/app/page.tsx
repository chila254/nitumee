import Image from "next/image";
import Link from "next/link";
import { AREAS, SLOTS } from "@/lib/slots";

const steps = [
  {
    title: "Share your list",
    body: "Write what you need — tomatoes, unga, diapers — set a budget in KES, then choose your area and a two-to-three hour slot.",
    image: "/images/grocery-list.webp",
    alt: "Hands typing a shopping list on a phone next to a basket of fresh vegetables",
  },
  {
    title: "We shop your list",
    body: "A nearby vetted runner takes your list to the market or supermarket, checks the prices and stays within budget.",
    image: "/images/shopping-aisle.webp",
    alt: "A runner in a teal cap reading a shopping list while carrying a basket of groceries in a supermarket aisle",
  },
  {
    title: "Pay on delivery",
    body: "Your runner brings everything to your door with the receipt. Check it, then pay with M-Pesa.",
    image: "/images/doorstep.webp",
    alt: "A runner handing paper bags of groceries to a smiling customer at her front door",
  },
];

const checks = [
  "Name checked against their national ID",
  "Phone number confirmed",
  "Vehicle and number plate recorded",
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="space-y-6">
          <span className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            Nairobi · Market &amp; supermarket runs
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            You&apos;re busy. <span className="text-accent">Nitumee</span> does the shopping.
          </h1>
          <p className="max-w-xl text-lg text-stone-600">
            Book a trusted runner for a time that suits you. They shop from your list, stay within budget and
            deliver to your door — while you get on with your day.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/book" className="btn">
              Book a shopping run
            </Link>
            <Link href="/login?role=runner" className="btn-secondary">
              Work as a runner
            </Link>
          </div>
          <p className="text-sm text-stone-500">
            Every runner is vetted before their first job — no strangers at your gate.
          </p>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-stone-200 bg-stone-100 shadow-sm">
          <Image
            src="/images/hero-market.webp"
            alt="A runner in a teal cap handing bags of fresh produce to a smiling customer at a Nairobi market"
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="grid items-stretch overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm sm:grid-cols-2">
        <div className="relative min-h-64">
          <Image
            src="/images/vetted-runner.webp"
            alt="A vetted Nitumee runner standing beside his motorcycle, helmet in hand"
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-3 p-6 sm:p-8">
          <p className="text-sm font-semibold text-accent">Vetted before their first run</p>
          <h2 className="text-2xl font-bold">The person at your gate is accountable.</h2>
          <p className="text-sm leading-relaxed text-stone-600">
            We check every runner&apos;s name, national ID, phone and vehicle — number plate included — before they
            can take a job.
          </p>
          <ul className="space-y-2 pt-1 text-sm text-stone-700">
            {checks.map((check) => (
              <li key={check} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-accent">
                  ✓
                </span>
                {check}
              </li>
            ))}
          </ul>
          <Link href="/login?role=runner" className="inline-block pt-2 text-sm font-semibold text-accent hover:underline">
            Apply to run with Nitumee →
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">How a run works</h2>
            <p className="text-sm text-stone-600">From your list to your doorstep in three steps.</p>
          </div>
          <Link href="/book" className="text-sm font-semibold text-accent hover:underline">
            Book a run →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <article key={step.title} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="relative aspect-[4/3] bg-stone-100">
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-accent shadow-sm">
                  {i + 1}
                </span>
              </div>
              <div className="space-y-1 p-5">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{step.body}</p>
              </div>
            </article>
          ))}
        </div>
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

      <section className="rounded-3xl bg-accent px-6 py-10 text-center text-white sm:px-10">
        <h2 className="text-2xl font-bold sm:text-3xl">Your list is ready. We&apos;ll take it from here.</h2>
        <p className="mx-auto mt-2 max-w-xl text-teal-50">
          Pick a slot and a budget — a vetted runner handles the market, the queue and the delivery.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-accent transition hover:bg-teal-50"
        >
          Book a shopping run
        </Link>
      </section>
    </div>
  );
}
