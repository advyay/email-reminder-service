import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { dbConnect } from "../config/db";
import { ObjectId } from "mongodb";
import { sendWMessage } from "../config/twilioClient";
import { twTemp } from "../utils/twilioTemplates";

dayjs.extend(utc);
dayjs.extend(timezone);

export const sendUpcomingReminders = async () => {
  const db = await dbConnect();
  const now = dayjs();

  const oneDayLater = now.add(1, "day");

  // Query all event registers that match the timing window
  const events = await db
    .collection("events")
    .find({
      $or: [
        {
          startDateTime: { $lte: now.toDate() },
          endDateTime: { $gte: now.toDate() },
        },
        {
          startDateTime: { $lte: oneDayLater.toDate() },
          endDateTime: { $gte: oneDayLater.toDate() },
        },
      ],
    })
    .toArray();

  if (!events.length) {
    console.log("📭 No events found.");
    return;
  }

  console.log(`📅 Found ${events.length} events. Processing reminders...`);

  await Promise.all(
    events.map(async (ev) => {
      try {
        const eventRegisterDB = db.collection("eventregisters");

        const today = dayjs(now).tz(ev.timeZone);
        const tomorrow = dayjs(today).add(1, "day");

        const todayDate = today.format("YYYY-MM-DD");
        const tomorrowDate = tomorrow.format("YYYY-MM-DD");

        const oneHourLater = today.add(1, "hour");
        const oneHourLaterTime = oneHourLater.format("HH:mm");

        const eventEnquiries = await eventRegisterDB
          .find({
            eventId: ev._id,
            $or: [
              {
                date: todayDate,
                startTime: { $lte: oneHourLaterTime },
                endTime: { $gt: oneHourLaterTime },
                reminderSentHourBefore: false,
              },
              {
                date: tomorrowDate,
                startTime: { $lte: oneHourLaterTime },
                endTime: { $gt: oneHourLaterTime },
                reminderSentDayBefore: false,
              },
            ],
          })
          .toArray();

        let todayUsers: ObjectId[] = [];
        let tomorrowUsers: ObjectId[] = [];

        console.log(oneHourLaterTime);
        console.log(
          `🔔 Event "${ev.title}": Found ${eventEnquiries.length} registrations to remind.`
        );

        await Promise.all(
          eventEnquiries.map(async (eq) => {
            try {
              await sendWMessage({
                to: eq.countryCode + eq.phone,
                contendSid: twTemp.reminder,
                body: {
                  1: `${eq.fName} ${eq.lName || ""}`,
                  2: ev.location,
                  3: eq.date,
                  4: eq.startTime,
                  6: eq.referredBy,
                  8: ev.title,
                },
              });
              console.log(
                `📱 Reminder sent to ${eq.fName} ${eq.lName || ""} for event "${
                  ev.title
                }" on ${eq.date} at ${eq.startTime}.`
              );

              if (eq.date === todayDate) {
                todayUsers.push(eq._id);
              } else {
                tomorrowUsers.push(eq._id);
              }
            } catch (err) {
              console.log("Error at event quiries: ", err);
            }
          })
        );

        // 1️⃣ Update users in todayUsers
        if (todayUsers.length) {
          const todayResult = await eventRegisterDB.updateMany(
            { _id: { $in: todayUsers } },
            { $set: { reminderSentHourBefore: true } }
          );
          console.log(
            `✅ Updated ${todayResult.modifiedCount} users (todayUsers)`
          );
        }

        // 2️⃣ Update users in tomorrowUsers
        if (tomorrowUsers.length) {
          const tomorrowResult = await eventRegisterDB.updateMany(
            { _id: { $in: tomorrowUsers } },
            { $set: { reminderSentDayBefore: true } }
          );
          console.log(
            `✅ Updated ${tomorrowResult.modifiedCount} users (tomorrowUsers)`
          );
        }
      } catch (error) {
        console.error("Error at events loop: ", error);
      }
    })
  );
};
