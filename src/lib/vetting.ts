import { AREAS } from "@/lib/slots";

export const VEHICLES = [
  { id: "bike", label: "Motorbike" },
  { id: "car", label: "Car" },
  { id: "foot", label: "On foot" },
] as const;

export type VehicleId = (typeof VEHICLES)[number]["id"];

export function isVehicle(value: string): value is VehicleId {
  return VEHICLES.some((vehicle) => vehicle.id === value);
}

export function vehicleLabel(value: string | null | undefined): string {
  return VEHICLES.find((vehicle) => vehicle.id === value)?.label ?? "On foot";
}

export function isArea(value: string): boolean {
  return (AREAS as readonly string[]).includes(value);
}

/** Accepts the common Kenyan plate shapes, formatted without spaces. */
export function normalizePlate(raw: string): string | null {
  const plate = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return plate.length >= 4 && plate.length <= 9 ? plate : null;
}

export function normalizeIdNumber(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{5,10}$/.test(digits) ? digits : null;
}
