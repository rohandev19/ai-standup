const { Queue } = require('bullmq');

async function test() {
  const queue = new Queue('test-queue', {
    connection: {
      host: 'crisp-oarfish-109976.upstash.io',
      port: 6379,
      password: 'gQAAAAAAAa2YAAIgcDEwYWE4ODhkZTQ3ZDk0Njk1YTI4NDQzNDdhM2E1MjllMg',
      tls: {}
    }
  });

  console.log("Adding job...");
  try {
    await queue.add('test-job', { data: 'hello' });
    console.log("Job added successfully!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await queue.close();
  }
}
test();
