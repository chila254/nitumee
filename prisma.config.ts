import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig, prisma7Schema } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: defineConfig({
    contract: prisma7Schema("prisma/schema.prisma"),
    output: "src/prisma",
    db: {
      connection: process.env["DATABASE_URL"],
    },
  }),
});
