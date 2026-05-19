import { runCollection } from '../src/lib/services/collector';

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[collect-cli] start at ${startedAt}`);

  const summaries = await runCollection({ triggered_by: 'cron' });

  console.log(`[collect-cli] runs:`);
  for (const s of summaries) {
    console.log(
      `  ${s.source.padEnd(10)} ${s.status.padEnd(8)} collected=${s.events_collected} new=${s.events_new} updated=${s.events_updated}` +
      (s.error_message ? `  err=${s.error_message}` : ''),
    );
  }

  const allFailed = summaries.length > 0 && summaries.every((s) => s.status === 'failed');
  if (allFailed) {
    console.error('[collect-cli] all sources failed');
    process.exit(1);
  }
  console.log(`[collect-cli] done at ${new Date().toISOString()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[collect-cli] unexpected error:', err);
  process.exit(2);
});
