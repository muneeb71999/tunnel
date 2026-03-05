export async function register() {
  // Only run the scheduler on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const CAMPAIGN_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const WARMING_INTERVAL = 30 * 60 * 1000; // 30 minutes
    const BASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL
      ? `http://localhost:${process.env.PORT || 3000}`
      : "http://localhost:3000";
    const CRON_SECRET = process.env.CRON_SECRET || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }

    // Wait for the server to be ready before starting cron jobs
    setTimeout(() => {
      console.log("[Scheduler] Starting campaign and warming cron jobs");

      // Process active campaigns every 5 minutes
      setInterval(async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/cron/campaigns`, { headers });
          const data = await res.json();
          if (data.processed > 0) {
            console.log(`[Cron] Processed ${data.processed} campaigns:`, data.results);
          }
        } catch (error) {
          console.error("[Cron] Campaign processing failed:", error);
        }
      }, CAMPAIGN_INTERVAL);

      // Process warming emails every 30 minutes
      setInterval(async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/cron/warming`, { headers });
          const data = await res.json();
          if (data.processed > 0) {
            console.log(`[Cron] Processed ${data.processed} warming accounts:`, data.results);
          }
        } catch (error) {
          console.error("[Cron] Warming processing failed:", error);
        }
      }, WARMING_INTERVAL);
    }, 10000); // 10 second delay to let the server start
  }
}
