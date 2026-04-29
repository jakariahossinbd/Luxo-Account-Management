const requiredSecret = process.env.SMS_SNAPSHOT_CRON_SECRET;
const baseUrl = (process.env.SMS_SNAPSHOT_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

if (!requiredSecret) {
  console.error('Missing SMS_SNAPSHOT_CRON_SECRET environment variable.');
  process.exit(1);
}

const statuses = ['customer-leds', 'pending', 'processing', 'delivery', 'canceled'];

async function run() {
  const response = await fetch(`${baseUrl}/api/admin/integrations/sms/snapshots/cron`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-snapshot-secret': requiredSecret,
    },
    body: JSON.stringify({ statuses }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    console.error('SMS snapshot cron failed:', payload?.error || `HTTP ${response.status}`);
    process.exit(1);
  }

  console.log('SMS snapshot cron completed.');
  console.log(JSON.stringify(payload.data, null, 2));
}

run().catch((error) => {
  console.error('SMS snapshot cron execution error:', error);
  process.exit(1);
});
