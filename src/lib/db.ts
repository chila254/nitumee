import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "@/prisma/contract";
import contractJson from "@/prisma/contract.json";

export const contract = contractFromJson<Contract>(contractJson);
export type Db = PostgresClient<Contract>;

const globalForDb = globalThis as unknown as {
  nitumeeDb?: Db;
};

/** Prisma Compute wires its `service.load().db.client` here so the app and the
 *  platform share one pool; everywhere else the client comes from DATABASE_URL. */
export function setDatabaseClient(client: Db) {
  globalForDb.nitumeeDb = client;
}

export function getDb(): Db {
  globalForDb.nitumeeDb ??= postgres({
    contract,
    url: process.env.DATABASE_URL,
  });
  return globalForDb.nitumeeDb;
}
