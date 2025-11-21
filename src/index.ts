import * as cron from "node-cron";
import { sendUpcomingReminders } from "./services/reminderService";

console.log("🕒 Event Reminder Service started...");

// Run every 10 minutes (you can adjust as needed)
cron.schedule("*/10 * * * *", async () => {
  console.log("🔔 Checking for upcoming events...");
  try {
    await sendUpcomingReminders();
    console.log("✅ Reminder job completed successfully");
  } catch (error) {
    console.error("❌ Error running reminder job:", error);
  }
});
