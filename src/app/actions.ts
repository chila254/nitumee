"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE,
  currentUser,
  isAdminEmail,
  normalizePhone,
  startSession,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { AREAS, nextAvailableSlot, slotBounds, parseSlotDay } from "@/lib/slots";
import { isArea, isVehicle, normalizeIdNumber, normalizePlate, type VehicleId } from "@/lib/vetting";

export type FormState = { error?: string; field?: string; ok?: boolean };

export type Role = "customer" | "runner" | "admin";

function homeFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "runner") return "/runner";
  return "/bookings";
}

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
  const role: Role = String(formData.get("role") ?? "customer") === "runner" ? "runner" : "customer";
  const runner = role === "runner";

  if (name.length < 2) return { error: "Tell us your name so the runner can greet you.", field: "name" };
  if (!email.success) return { error: email.error.issues[0].message, field: "email" };
  if (phoneRaw && !phone) return { error: "Enter a valid Kenyan number, e.g. 0712 345 678.", field: "phone" };
  if (!password.success) return { error: password.error.issues[0].message, field: "password" };
  if (confirm !== password.data) return { error: "The two passwords do not match.", field: "confirm" };

  let vehicleType: VehicleId | null = null;
  let plateNumber: string | null = null;
  let idNumber: string | null = null;
  let areas: string[] = [];

  if (runner) {
    if (!phone) return { error: "A phone number is required for runners — customers call it.", field: "phone" };
    const vehicleRaw = String(formData.get("vehicle") ?? "");
    if (!isVehicle(vehicleRaw)) return { error: "Choose how you will run errands.", field: "vehicle" };
    vehicleType = vehicleRaw;
    if (vehicleRaw !== "foot") {
      plateNumber = normalizePlate(String(formData.get("plate") ?? ""));
      if (!plateNumber) return { error: "Enter the number plate of your bike or car.", field: "plate" };
    }
    idNumber = normalizeIdNumber(String(formData.get("idNumber") ?? ""));
    if (!idNumber) return { error: "Enter your national ID number for vetting.", field: "idNumber" };
    areas = formData
      .getAll("areas")
      .map(String)
      .filter((area) => isArea(area));
    if (areas.length === 0) return { error: "Pick at least one area you can serve.", field: "areas" };
  }

  if (await emailTaken(email.data)) return { error: "An account with that email already exists. Sign in instead.", field: "email" };

  const admin = isAdminEmail(email.data);
  const user = await getDb().orm.public.User.create({
    name,
    email: email.data,
    phone,
    role: admin ? "admin" : runner ? "runner" : "customer",
    passwordHash: await hashPassword(password.data),
  });

  if (runner && !admin) {
    try {
      await getDb().orm.public.Runner.create({
        userId: user.id,
        areas,
        vehicleType,
        plateNumber,
        idNumber,
      });
    } catch {
      await getDb().orm.public.User.where({ id: user.id }).deleteAll();
      return { error: "Could not save your runner application. Try again.", field: "role" };
    }
  }

  await startSession(user.id);
  redirect(homeFor(user.role));
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

  let role = user.role;
  if (role !== "admin" && isAdminEmail(user.email)) {
    await getDb().orm.public.User.where({ id: user.id }).update({ role: "admin" });
    role = "admin";
  }

  await startSession(user.id);
  redirect(homeFor(role));
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
  /** Requested runner; empty leaves the booking open to the queue. */
  runnerId?: string;
};

const OFFER_WINDOW_MS = 10 * 60 * 1000;

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

  const rawRunnerId = payload && typeof payload === "object" ? (payload as BookingInput).runnerId : undefined;
  const runnerId = typeof rawRunnerId === "string" ? rawRunnerId.trim() : "";
  let offerUntil: Date | null = null;

  if (runnerId) {
    const runner = await getDb()
      .orm.public.Runner.where({ userId: runnerId, status: "approved", active: true })
      .first();
    if (!runner || !(runner.areas ?? []).includes(parsed.data.area)) {
      return { error: "That runner is no longer available in this area. Pick another or leave it open.", field: "runner" };
    }
    const slotBookings = await getDb()
      .orm.public.Booking.where({ slotStart: bounds.start })
      .where((booking) => booking.status.in(["pending", "accepted", "shopping"]))
      .all();
    if (slotBookings.some((booking) => booking.runnerId === runnerId)) {
      return { error: "That runner is already booked for this slot.", field: "runner" };
    }
    offerUntil = new Date(Math.min(Date.now() + OFFER_WINDOW_MS, bounds.start.getTime()));
  }

  const booking = await getDb().orm.public.Booking.create({
    customerId: user.id,
    runnerId: offerUntil ? runnerId : null,
    respondBy: offerUntil,
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

/** Approved runners free in this area and slot, best rated first. */
export type RunnerOption = {
  userId: string;
  name: string;
  rating: number;
  vehicleType: string | null;
  isNew: boolean;
};

export async function listRunnerOptions(input: {
  area?: string;
  day?: string;
  slot?: string;
}): Promise<RunnerOption[]> {
  const user = await currentUser();
  if (!user) return [];
  if (!input.area || !isArea(input.area) || !input.day || !input.slot) return [];

  const day = parseSlotDay(input.day);
  const bounds = day && slotBounds(day, input.slot);
  if (!bounds || bounds.start.getTime() <= Date.now()) return [];

  const runners = await getDb()
    .orm.public.Runner.where({ status: "approved", active: true })
    .include("user")
    .all();
  const inArea = runners.filter((runner) => (runner.areas ?? []).includes(input.area!));
  if (inArea.length === 0) return [];

  const slotBookings = await getDb()
    .orm.public.Booking.where({ slotStart: bounds.start })
    .where((booking) => booking.status.in(["pending", "accepted", "shopping"]))
    .all();
  const busy = new Set(slotBookings.map((booking) => booking.runnerId).filter((id): id is string => !!id));

  return inArea
    .filter((runner) => !busy.has(runner.userId))
    .map((runner) => ({
      userId: runner.userId,
      name: runner.user.name,
      rating: runner.rating,
      vehicleType: runner.vehicleType,
      isNew: runner.rating === 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
}

/** Releases offers whose 10-minute window passed back to the open queue. */
export async function releaseExpiredOffers() {
  await getDb()
    .orm.public.Booking.where({ status: "pending" })
    .where((booking) => booking.respondBy.lt(new Date()))
    .updateAll({ runnerId: null, respondBy: null });
}

export async function acceptBooking(id: string) {
  const user = await currentUser();
  if (!user || user.role !== "runner") redirect("/login");

  await getDb()
    .orm.public.Booking.where({ id, runnerId: user.id, status: "pending" })
    .where((booking) => booking.respondBy.gte(new Date()))
    .updateAll({ status: "accepted", acceptedAt: new Date(), respondBy: null });

  revalidatePath("/runner");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}

export async function declineBooking(id: string) {
  const user = await currentUser();
  if (!user || user.role !== "runner") redirect("/login");

  await getDb()
    .orm.public.Booking.where({ id, runnerId: user.id, status: "pending" })
    .updateAll({ runnerId: null, respondBy: null });

  revalidatePath("/runner");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}

export async function claimBooking(id: string) {
  const user = await currentUser();
  if (!user || user.role !== "runner") redirect("/login");
  const profile = user.runnerProfile;
  if (!profile || profile.status !== "approved") redirect("/runner");

  const booking = await getDb()
    .orm.public.Booking.where({ id, status: "pending" })
    .where((booking) => booking.runnerId.isNull())
    .first();
  if (!booking || !(profile.areas ?? []).includes(booking.area)) return;

  await getDb()
    .orm.public.Booking.where({ id, status: "pending" })
    .where((booking) => booking.runnerId.isNull())
    .updateAll({ runnerId: user.id, status: "accepted", acceptedAt: new Date() });

  revalidatePath("/runner");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}

export async function startShopping(id: string) {
  const user = await currentUser();
  if (!user || user.role !== "runner") redirect("/login");

  await getDb()
    .orm.public.Booking.where({ id, runnerId: user.id, status: "accepted" })
    .updateAll({ status: "shopping" });

  revalidatePath("/runner");
  revalidatePath(`/bookings/${id}`);
}

export async function markDelivered(id: string) {
  const user = await currentUser();
  if (!user || user.role !== "runner") redirect("/login");

  await getDb()
    .orm.public.Booking.where({ id, runnerId: user.id, status: "shopping" })
    .updateAll({ status: "delivered" });

  revalidatePath("/runner");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function approveRunner(userId: string) {
  await requireAdmin();
  await getDb()
    .orm.public.Runner.where({ userId, status: "pending" })
    .updateAll({ status: "approved", active: true, approvedAt: new Date() });

  revalidatePath("/admin");
  revalidatePath("/runner");
  revalidatePath("/book");
}

export async function rejectRunner(userId: string) {
  await requireAdmin();
  await getDb()
    .orm.public.Runner.where({ userId, status: "pending" })
    .updateAll({ status: "rejected", active: false });

  revalidatePath("/admin");
  revalidatePath("/runner");
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

