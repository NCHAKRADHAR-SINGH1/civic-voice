import prisma from "./src/utils/prisma.js";
import { AuthMethod } from "@prisma/client";

async function setupOwner() {
  const ownerPhone = "+918888888888";

  try {
    const existing = await prisma.user.findFirst({ where: { mobile: ownerPhone } });

    const owner = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: "OWNER",
            country: "India",
            state: "Maharashtra",
            district: "Mumbai",
            cityVillage: "Mumbai",
          },
        })
      : await prisma.user.create({
          data: {
            mobile: ownerPhone,
            authMethod: AuthMethod.MOBILE,
            role: "OWNER",
            country: "India",
            state: "Maharashtra",
            district: "Mumbai",
            cityVillage: "Mumbai",
          },
        });

    console.log(`Owner account ready: ${owner.mobile}`);
  } catch (error) {
    console.error("Failed to set up owner:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupOwner();