/**
 * Quick test: Verify Gemini API via Google AI Studio works.
 * Run: npx ts-node src/test-deepseek.ts
 */
import 'dotenv/config';
import OpenAI from 'openai';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in .env');
    process.exit(1);
  }
  console.log(`✅ GEMINI_API_KEY found (${apiKey.slice(0, 8)}...)`);

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });

  console.log('\n📡 Calling gemini-3.6-flash via Google AI Studio...\n');

  try {
    const response = await client.chat.completions.create({
      model: 'gemini-3.6-flash',
      max_tokens: 200,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Reply concisely.',
        },
        {
          role: 'user',
          content: 'Summarize what a daily standup meeting is in 2 sentences.',
        },
      ],
    });

    const reply = response.choices[0]?.message?.content;
    const usage = response.usage;

    console.log('--- REPLY ---');
    console.log(reply);
    console.log('\n--- TOKEN USAGE ---');
    console.log(`  Prompt tokens:     ${usage?.prompt_tokens}`);
    console.log(`  Completion tokens: ${usage?.completion_tokens}`);
    console.log(`  Total tokens:      ${usage?.total_tokens}`);
    console.log(`\n--- MODEL ---`);
    console.log(`  Model: ${response.model}`);
    console.log(`  ID:    ${response.id}`);
    console.log('\n✅ Gemini API call successful!');
  } catch (error: any) {
    console.error('\n❌ API call failed:');
    console.error(`  Status: ${error.status}`);
    console.error(`  Message: ${error.message}`);
    if (error.error) {
      console.error(`  Error details:`, JSON.stringify(error.error, null, 2));
    }
    process.exit(1);
  }
}

main();
