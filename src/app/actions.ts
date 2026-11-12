"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE,
  currentUser,
  normalizePhone,
  startSession,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { AREAS, nextAvailableSlot, slotBounds, parseSlotDay } from "@/lib/slots";

export type FormState = { error?: string; field?: string; ok?: boolean };

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "That password is too long.");

async function emailTaken(email: string, exceptUserId?: string) {
  const other = await getDb().orm.public.User.where({ email }).first();
  return other != null && other.id !== exceptUserId;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const password = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  const confirm = String(formData.get("confirm") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  if (name.length < 2) return { error: "Tell us your name so the runner can greet you.", field: "name" };
  if (!email.success) return { error: email.error.issues[0].message, field: "email" };
  if (phoneRaw && !phone) return { error: "Enter a valid Kenyan number, e.g. 0712 345 678.", field: "phone" };
  if (!password.success) return { error: password.error.issues[0].message, field: "password" };
  if (confirm !== password.data) return { error: "The two passwords do not match.", field: "confirm" };
  if (await emailTaken(email.data)) return { error: "An account with that email already exists. Sign in instead.", field: "email" };

  const user = await getDb().orm.public.User.create({
    name,
    email: email.data,
    phone,
    passwordHash: await hashPassword(password.data),
  });

  await startSession(user.id);
  redirect(user.role === "runner" ? "/runner" : "/bookings");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!email.success || password.length === 0) return { error: "Enter your email and password." };

  const user = await getDb().orm.public.User.where({ email: email.data }).first();
  // Same message for unknown email and wrong password so the form cannot be
  // used to discover which addresses have accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }

  await startSession(user.id);
  redirect(user.role === "runner" ? "/runner" : "/bookings");
}

/** Saves the delivery number (and name) from the profile card. */
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (name.length < 2) return { error: "Tell us your name so the runner can greet you.", field: "name" };
  if (!phone) return { error: "Enter a valid Kenyan number, e.g. 0712 345 678.", field: "phone" };

  await getDb().orm.public.User.where({ id: user.id }).update({ name, phone });
  revalidatePath("/profile");
  revalidatePath("/book");
  return { ok: true };
}

export async function removePasskey(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  await getDb().orm.public.WebAuthnCredential.where({ id, userId: user.id }).deleteAll();
  revalidatePath("/profile");
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
  /** Delivery number for this run; falls back to the profile number. */
  phone?: string;
};

export async function createBooking(_prev: FormState, payload: unknown): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0]) };

  const rawPhone = payload && typeof payload === "object" ? (payload as BookingInput).phone : undefined;
  const phoneRaw = typeof rawPhone === "string" ? rawPhone.trim() : "";
  const phone = phoneRaw ? normalizePhone(phoneRaw) : user.phone;
  if (!phone) return { error: "Add a delivery phone number so the runner can reach you.", field: "phone" };

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

  if (phone !== user.phone) {
    await getDb().orm.public.User.where({ id: user.id }).update({ phone });
  }

  const conflict = await getDb()
    .orm.public.Booking.where({
      customerId: user.id,
      slotStart: bounds.start,
      slotEnd: bounds.end,
    })
    .where((booking) => booking.status.neq("cancelled"))
    .first();
  if (conflict) return { error: "You already have a booking for that slot.", field: "slot" };

  const booking = await getDb().orm.public.Booking.create({
    customerId: user.id,
    area: parsed.data.area,
    slotStart: bounds.start,
    slotEnd: bounds.end,
    budgetKes: parsed.data.budget,
    notes: parsed.data.notes,
  });

  revalidatePath("/bookings");
  revalidatePath("/runner");
  redirect(`/bookings/${booking.id}`);
}

export async function cancelBooking(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  await getDb()
    .orm.public.Booking.where({ id, customerId: user.id })
    .where((booking) => booking.status.in(["pending", "accepted"]))
    .updateAll({ status: "cancelled" });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/runner");
}

