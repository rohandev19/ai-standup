const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { StandupsService } = require('./src/standups/standups.service');
const { EventEmitter2 } = require('@nestjs/event-emitter');

async function testSubmit() {
  const ws = await prisma.workspace.findFirst();
  const user = await prisma.user.findFirst();
  
  if (!ws || !user) {
    console.log("No workspace or user found");
    return;
  }
  console.log("Found workspace and user. Submitting standup...");

  // Mock queue and event emitter
  const aiBlockerQueue = { add: async (...args: any[]) => console.log("Queue add:", args) };
  const eventEmitter = new EventEmitter2();
  eventEmitter.on('standup.submitted', (payload: any) => console.log('Event emitted:', payload));

  const service = new StandupsService(prisma, aiBlockerQueue as any, eventEmitter);
  
  try {
    const res = await service.submitStandup(ws.id, user.id, "test", "test", "test");
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
testSubmit();
