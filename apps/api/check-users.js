const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspace.findFirst();
  console.log(ws);
}
main().finally(() => prisma.$disconnect());
