/** @type {import('prisma/config').PrismaConfig} */
const config = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/bookquotr.db",
  },
};

export default config;
