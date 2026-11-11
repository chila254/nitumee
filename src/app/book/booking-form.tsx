"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { createBooking, type BookingInput, type FormState } from "@/app/actions";
import { AREAS, SLOTS, firstAvailableSlot, slotAvailable, upcomingDays } from "@/lib/slots";

const initial: FormState = {};

export function BookingForm({ defaultPhone = "" }: { defaultPhone?: string }) {
  const [state, action, pending] = useActionState(createBooking, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const days = upcomingDays(7);

  const [day, setDay] = useState(days[0].value);
  const [slot, setSlot] = useState(() => firstAvailableSlot(days[0].value) ?? SLOTS[0].id);

  useEffect(() => {
    if (state.field === "slot") {
      const next = firstAvailableSlot(day);
      if (next) setSlot(next);
    }
  }, [state, day]);

  function changeDay(value: string) {
    setDay(value);
    if (!slotAvailable(value, slot)) setSlot(firstAvailableSlot(value) ?? slot);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Send a snapshot object rather than the live FormData: React resets FormData-backed
    // forms after an action returns without redirecting, which would wipe the customer's list.
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload: BookingInput = {
      area: String(data.get("area") ?? ""),
      day,
      slot,
      budget: String(data.get("budget") ?? ""),
      notes: String(data.get("notes") ?? ""),
      phone: String(data.get("phone") ?? ""),
    };
    startTransition(() => action(payload));
  }

  return (
    <form ref={formRef} onSubmit={submit} className="card space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium">
          Area
          <select name="area" className="field" defaultValue={AREAS[0]}>
            {AREAS.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Day
          <select name="day" value={day} onChange={(e) => changeDay(e.target.value)} className="field">
            {days.map((d) => (
              <option key={d.value} value={d.value} disabled={!firstAvailableSlot(d.value)}>
                {d.label}
                {!firstAvailableSlot(d.value) ? " (fully booked)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Time slot</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SLOTS.map((s) => {
            const available = slotAvailable(day, s.id);
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition has-checked:border-accent has-checked:bg-accent/5 ${
                  available ? "border-stone-300 bg-white" : "pointer-events-none border-stone-200 bg-stone-50 text-stone-400"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="slot"
                    value={s.id}
                    checked={slot === s.id}
                    onChange={() => setSlot(s.id)}
                    disabled={!available}
                    className="accent-teal-700"
                  />
                  {s.label}
                </span>
                {!available && <span className="text-xs">Unavailable</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium">
          Budget (KES)
          <input name="budget" type="number" min={200} step={50} defaultValue={2000} className="field" required />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Delivery phone
          <input
            name="phone"
            className="field"
            defaultValue={defaultPhone}
            placeholder="0712 345 678"
            inputMode="tel"
            autoComplete="tel"
          />
          <span className="block text-xs font-normal text-stone-400">
            {defaultPhone ? "From your profile — change it here for this run." : "The runner calls this number."}
          </span>
        </label>
      </div>

      <label className="block space-y-1 text-sm font-medium">
        Shopping list and notes
        <textarea
          name="notes"
          rows={5}
          className="field"
          placeholder={"2 kg tomatoes, 1 packet unga (Jogoo), 1 litre milk...\nCall when you reach the gate."}
          required
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button className="btn w-full" disabled={pending}>
        {pending ? "Booking…" : "Confirm booking"}
      </button>
      <p className="text-center text-xs text-stone-500">
        No payment now. You pay the runner by M-Pesa after they share the receipt.
      </p>
    </form>
  );
}
