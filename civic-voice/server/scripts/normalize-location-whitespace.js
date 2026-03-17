import prisma from "../src/utils/prisma.js";

async function run() {
  const beforeUsers = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "User"
    WHERE country <> btrim(country)
       OR state <> btrim(state)
       OR district <> btrim(district)
       OR "cityVillage" <> btrim("cityVillage")
  `;

  const beforeProblems = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "Problem"
    WHERE country <> btrim(country)
       OR state <> btrim(state)
       OR district <> btrim(district)
       OR "cityVillage" <> btrim("cityVillage")
  `;

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET country = btrim(country),
        state = btrim(state),
        district = btrim(district),
        "cityVillage" = btrim("cityVillage")
    WHERE country <> btrim(country)
       OR state <> btrim(state)
       OR district <> btrim(district)
       OR "cityVillage" <> btrim("cityVillage");
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Problem"
    SET country = btrim(country),
        state = btrim(state),
        district = btrim(district),
        "cityVillage" = btrim("cityVillage")
    WHERE country <> btrim(country)
       OR state <> btrim(state)
       OR district <> btrim(district)
       OR "cityVillage" <> btrim("cityVillage");
  `);

  const afterUsers = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "User"
    WHERE country <> btrim(country)
       OR state <> btrim(state)
       OR district <> btrim(district)
       OR "cityVillage" <> btrim("cityVillage")
  `;

  const afterProblems = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "Problem"
    WHERE country <> btrim(country)
       OR state <> btrim(state)
       OR district <> btrim(district)
       OR "cityVillage" <> btrim("cityVillage")
  `;

  console.log("User rows needing trim before:", beforeUsers[0]?.count ?? 0);
  console.log("Problem rows needing trim before:", beforeProblems[0]?.count ?? 0);
  console.log("User rows needing trim after:", afterUsers[0]?.count ?? 0);
  console.log("Problem rows needing trim after:", afterProblems[0]?.count ?? 0);
}

run()
  .catch((error) => {
    console.error("Normalization failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
