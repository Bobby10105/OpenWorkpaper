import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "file:./prisma/data/dev.db",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
