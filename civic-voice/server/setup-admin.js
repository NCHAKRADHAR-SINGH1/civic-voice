import prisma from "./src/utils/prisma.js";
import { AuthMethod } from "@prisma/client";
import { getAdminAssignments } from "./src/utils/admin-access.js";

async function setupAdmin() {
  const assignments = getAdminAssignments();

  try {
    if (assignments.length === 0) {
      console.log("No ADMIN_ASSIGNMENTS configured.");
      return;
    }

    for (const assignment of assignments) {
      let user = await prisma.user.findFirst({
        where: { mobile: assignment.mobile },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            role: "ADMIN",
            adminAccessDisabledAt: null,
            ...assignment.location,
          },
        });
        console.log(`Updated admin: ${assignment.mobile} (${assignment.location.cityVillage})`);
      } else {
        user = await prisma.user.create({
          data: {
            mobile: assignment.mobile,
            authMethod: AuthMethod.MOBILE,
            role: "ADMIN",
            ...assignment.location,
          },
        });
        console.log(`Created admin: ${assignment.mobile} (${assignment.location.cityVillage})`);
      }
    }

    console.log("\nAdmin setup complete for all configured assignments.");
  } catch (error) {
    console.error("Error setting up admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
