import dotenv from "dotenv";
import { PrismaClient, AuthMethod, UserRole, ProblemStatus } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const adminMobile = process.env.SEED_ADMIN_MOBILE || "9999999999";

  const admin = await prisma.user.upsert({
    where: { mobile: adminMobile },
    update: { role: UserRole.ADMIN },
    create: {
      mobile: adminMobile,
      authMethod: AuthMethod.MOBILE,
      role: UserRole.ADMIN,
      country: "India",
      state: "Karnataka",
      district: "Bengaluru",
      cityVillage: "Bengaluru",
      locationUpdatedAt: new Date(),
    },
  });

  const citizen = await prisma.user.upsert({
    where: { mobile: "8888888888" },
    update: {},
    create: {
      mobile: "8888888888",
      authMethod: AuthMethod.MOBILE,
      country: "India",
      state: "Karnataka",
      district: "Bengaluru",
      cityVillage: "Bengaluru",
      locationUpdatedAt: new Date(),
    },
  });

  const issue1 = await prisma.problem.upsert({
    where: { id: "seed_issue_road_1" },
    update: {},
    create: {
      id: "seed_issue_road_1",
      title: "Potholes near market junction",
      description: "Large potholes are causing daily traffic jams and accidents near the junction.",
      category: "roads",
      country: "India",
      state: "Karnataka",
      district: "Bengaluru",
      cityVillage: "Bengaluru",
      departmentTag: "Roads and Infrastructure",
      status: ProblemStatus.IN_PROGRESS,
      userId: citizen.id,
    },
  });

  const issue2 = await prisma.problem.upsert({
    where: { id: "seed_issue_drainage_1" },
    update: {},
    create: {
      id: "seed_issue_drainage_1",
      title: "Blocked drainage after rain",
      description: "Drainage lines are blocked in our lane, causing waterlogging every evening.",
      category: "drainage",
      country: "India",
      state: "Karnataka",
      district: "Bengaluru",
      cityVillage: "Bengaluru",
      departmentTag: "Urban Drainage",
      status: ProblemStatus.REPORTED,
      userId: admin.id,
    },
  });

  await prisma.upvote.upsert({
    where: { userId_problemId: { userId: admin.id, problemId: issue1.id } },
    update: {},
    create: { userId: admin.id, problemId: issue1.id },
  });

  const existingComments = await prisma.comment.count({
    where: {
      problemId: { in: [issue1.id, issue2.id] },
      userId: { in: [admin.id, citizen.id] },
    },
  });

  if (existingComments === 0) {
    await prisma.comment.createMany({
      data: [
        { userId: admin.id, problemId: issue1.id, text: "Forwarding this to ward office for immediate action." },
        { userId: citizen.id, problemId: issue2.id, text: "This gets worse after every rain. Please prioritize." },
      ],
    });
  }

  console.log("Seed complete. Admin mobile:", adminMobile);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
