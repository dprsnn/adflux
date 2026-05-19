import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async adapter() {
      const pool = new pg.Pool({
        connectionString: process.env.DIRECT_URL,
      });
      return new PrismaPg(pool);
    },
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
