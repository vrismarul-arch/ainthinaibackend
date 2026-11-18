const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { uploadToSupabase } = require("../utils/uploadToSupabase");

// Helper to convert undefined or empty values to SQL NULL
const sanitize = (val) => (val !== undefined && val !== "" ? val : null);

//
// ================= SAVE ITINERARY =================
//
exports.saveItinerary = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { tourId, itinerary } = req.body;

    if (!tourId) {
      return res.status(400).json({ message: "tourId required" });
    }

    const parsed =
      typeof itinerary === "string" ? JSON.parse(itinerary) : itinerary;

    await connection.beginTransaction();

    // 🔥 DELETE OLD
    await connection.execute(`
      DELETE FROM itinerary_images WHERE activity_id IN (
        SELECT id FROM itinerary_activities WHERE day_id IN (
          SELECT id FROM itinerary_days WHERE tour_id=?
        )
      )`, [tourId]);

    await connection.execute(`
      DELETE FROM itinerary_activities WHERE day_id IN (
        SELECT id FROM itinerary_days WHERE tour_id=?
      )`, [tourId]);

    await connection.execute(
      "DELETE FROM itinerary_days WHERE tour_id=?",
      [tourId]
    );

    let fileIndex = 0;
    const finalItinerary = [];

    for (const day of parsed || []) {
      const dayId = uuidv4();
      const dayNumber = sanitize(day.day);

      await connection.execute(
        `INSERT INTO itinerary_days (id, tour_id, day_number)
         VALUES (?, ?, ?)`,
        [dayId, tourId, dayNumber]
      );

      const activitiesArr = [];

      for (const act of day.activities || []) {
        const activityId = uuidv4();

        const period = sanitize(act.period);
        const time = sanitize(act.time);
        const title = sanitize(act.title);
        const description = sanitize(act.description);

        await connection.execute(
          `INSERT INTO itinerary_activities
           (id, day_id, period, time, title, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            activityId,
            dayId,
            period,
            time,
            title,
            description
          ]
        );

        const imagesArr = [];

        // Existing images
        for (const url of act.images || []) {
          if (url) {
            await connection.execute(
              `INSERT INTO itinerary_images (id, activity_id, image_url)
               VALUES (?, ?, ?)`,
              [uuidv4(), activityId, url]
            );
            imagesArr.push(url);
          }
        }

        // New files ONLY for this activity
        if (req.files && req.files[fileIndex]) {
          const file = req.files[fileIndex];
          fileIndex++;

          const url = await uploadToSupabase(file);

          await connection.execute(
            `INSERT INTO itinerary_images (id, activity_id, image_url)
             VALUES (?, ?, ?)`,
            [uuidv4(), activityId, url]
          );

          imagesArr.push(url);
        }

        activitiesArr.push({
          period: act.period,
          time: act.time,
          title: act.title,
          description: act.description,
          images: imagesArr
        });
      }

      finalItinerary.push({
        day: day.day,
        activities: activitiesArr
      });
    }

    // 🔥 IMPORTANT: Update tours JSON
    await connection.execute(
      "UPDATE tours SET itinerary=? WHERE id=?",
      [JSON.stringify(finalItinerary), tourId]
    );

    await connection.commit();

    res.json({ message: "Itinerary saved successfully" });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

//
// ================= GET ITINERARY =================
//
exports.getItinerary = async (req, res) => {
  try {
    const { tourId } = req.params;

    const [days] = await db.execute(
      `SELECT * FROM itinerary_days
       WHERE tour_id=?
       ORDER BY day_number`,
      [tourId]
    );

    const result = [];

    for (const day of days) {
      const [activities] = await db.execute(
        `SELECT * FROM itinerary_activities
         WHERE day_id=?`,
        [day.id]
      );

      for (const act of activities) {
        const [images] = await db.execute(
          `SELECT image_url FROM itinerary_images
           WHERE activity_id=?`,
          [act.id]
        );

        act.images = images.map(img => img.image_url);
      }

      result.push({
        day: day.day_number,
        activities
      });
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};