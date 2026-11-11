"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AREAS, nextAvailableSlot, slotBounds, parseSlotDay } from "@/lib/slots";

const OTP_COOKIE = "n_otp";
const SESSION_COOKIE = "n_session";
const OTP_TTL_MS = 5 * 60 * 1000;

function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s-]/g, "");
  if (/^\+?254\d{9}$/.test(digits)) digits = `0${digits.slice(-9)}`;
  else if (/^[17]\d{8}$/.test(digits)) digits = `0${digits}`;
  return /^0[17]\d{8}$/.test(digits) ? digits : null;
}

export type FormState = { error?: string; field?: string; ok?: boolean };

export async function requestOtp(_prev: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  if (!phone) return { error: "Enter a valid Kenyan number, e.g. 0712 345 678." };
  if (name.length < 2) return { error: "Tell us your name so the runner can greet you." };

  const code = String(randomInt(100000, 1000000));
  const jar = await cookies();
  jar.set(OTP_COOKIE, JSON.stringify({ phone, name, code, expires: Date.now() + OTP_TTL_MS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: OTP_TTL_MS / 1000,
    path: "/",
  });

  // TODO: send via Africa's Talking once AT_API_KEY is set.
  console.log(`[otp] ${phone} -> ${code}`);
  return { ok: true };
}

export async function verifyOtp(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  const jar = await cookies();
  const pending = jar.get(OTP_COOKIE)?.value;
  if (!pending) return { error: "Request a new code." };

  let otp: { phone: string; name: string; code: string; expires: number };
  try {
    otp = JSON.parse(pending);
  } catch {
    return { error: "Request a new code." };
  }
  if (otp.expires < Date.now()) return { error: "That code expired. Request a new one." };
  if (code !== otp.code) return { error: "Wrong code. Check the SMS and try again." };

  const user = await prisma.user.upsert({
    where: { phone: otp.phone },
    update: { name: otp.name },
    create: { phone: otp.phone, name: otp.name },
  });

  jar.delete(OTP_COOKIE);
  jar.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(user.role === "runner" ? "/runner" : "/bookings");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

const bookingSchema = z.object({
  area: z.enum(AREAS, { message: "Choose a delivery area." }),
  day: z.string().min(1, "Choose a day."),
  slot: z.string().min(1, "Choose a time slot."),
  budget: z.coerce
    .number({ message: "Enter a budget in KES." })
    .int()
    .min(200, "Budget must be at least KES 200.")
    .max(200000, "That budget is too high — contact us for large orders."),
  notes: z.string().trim().min(3, "Describe what you need.").max(1000, "Keep the list under 1000 characters."),
});

export type BookingInput = {
  area: string;
  day: string;
  slot: string;
  budget: string;
  notes: string;
};

export async function createBooking(_prev: FormState, payload: unknown): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0]) };

  const day = parseSlotDay(parsed.data.day);
  const bounds = day && slotBounds(day, parsed.data.slot);
  if (!bounds) return { error: "Pick a day and a time slot.", field: "slot" };
  if (bounds.start.getTime() <= Date.now()) {
    const next = nextAvailableSlot();
    return {
      error: `That slot has already started. ${next ? `Try ${next.dayLabel}, ${next.slotLabel}.` : "Pick a later day."}`,
      field: "slot",
    };
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      customerId: user.id,
      status: { not: "cancelled" },
      slotStart: bounds.start,
      slotEnd: bounds.end,
    },
  });
  if (conflict) return { error: "You already have a booking for that slot.", field: "slot" };

  const booking = await prisma.booking.create({
    data: {
      customerId: user.id,
      area: parsed.data.area,
      slotStart: bounds.start,
      slotEnd: bounds.end,
      budgetKes: parsed.data.budget,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/bookings");
  revalidatePath("/runner");
  redirect(`/bookings/${booking.id}`);
}

export async function cancelBooking(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  await prisma.booking.updateMany({
    where: {
      id,
      customerId: user.id,
      status: { in: ["pending", "accepted"] },
    },
    data: { status: "cancelled" },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/runner");
}

export async function currentUser() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, include: { runnerProfile: true } });
}
