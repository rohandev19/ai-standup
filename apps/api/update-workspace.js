const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateWorkspace() {
  const ws = await prisma.workspace.findFirst();
  if (ws) {
    await prisma.workspace.update({
      where: { id: ws.id },
      data: {
        standupWindowStart: '09:00',
        standupWindowEnd: '21:00'
      }
    });
    console.log("Workspace updated successfully to 09:00 - 21:00");
  } else {
    console.log("No workspace found to update.");
  }
}

updateWorkspace().catch(console.error).finally(() => prisma.$disconnect());
