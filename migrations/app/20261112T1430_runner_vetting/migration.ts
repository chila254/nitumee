#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4e3ce9b733129df5be9235548fdc60b09f2a7aaf23b69778f9457da67bd18caf/contract';
import endContract from '../../snapshots/4e3ce9b733129df5be9235548fdc60b09f2a7aaf23b69778f9457da67bd18caf/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7e330cd7dd48529e74516ca1dcb5b05050a9cba758dc79339ed70648796cf2b2/contract';
import startContract from '../../snapshots/7e330cd7dd48529e74516ca1dcb5b05050a9cba758dc79339ed70648796cf2b2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'RunnerStatus',
        members: ['pending', 'approved', 'rejected'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'VehicleType',
        members: ['bike', 'car', 'foot'],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('acceptedAt', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('respondBy', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Runner',
        column: col('approvedAt', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Runner',
        column: col('createdAt', 'timestamp(3)', {
          notNull: true,
          default: fn(sql`now()`),
          codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Runner',
        column: col('idNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Runner',
        column: col('plateNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Runner',
        column: col('status', '"RunnerStatus"', {
          notNull: true,
          default: lit('pending'),
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'RunnerStatus' } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Runner',
        column: col('vehicleType', '"VehicleType"', {
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'VehicleType' } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
