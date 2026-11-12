// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import nitumeeContractJson from "./src/prisma/contract.json" with { type: "json" };
import nitumeeService from "./service.mjs";

export default module("nitumee", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(nitumeeContractJson), config: "./prisma.config.ts" }));
  provision(nitumeeService, { deps: { db: database } });
});
