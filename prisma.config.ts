/** @type {import('prisma/config').PrismaConfig} */
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/bookquotr.db",
  },
};
