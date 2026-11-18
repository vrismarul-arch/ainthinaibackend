
const db = require("../config/db");
const { supabase } = require("../config/supabase");
const { randomUUID } = require("crypto");

const BUCKET_NAME = "AINTHINAI";

// =====================================
// HELPERS
// =====================================

const parseJSON = (value, fallback = []) => {
  if (!value) return fallback;

  if (Array.isArray(value) || typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getBooleanValue = (value) => {
  return value === true || value === 1 || value === "1" ? 1 : 0;
};

const uploadToSupabase = async (file, folder = "attractions") => {
  if (!file) return null;

  if (!file.buffer) {
    throw new Error(
      "Uploaded file buffer is missing. Configure multer with memoryStorage()."
    );
  }

  const extension = file.originalname.split(".").pop() || "jpg";
  const fileName = `${folder}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return data.publicUrl;
};

const getUploadedFiles = (req) => {
  const mainImage = req.files?.main_image?.[0] || null;
  const galleryImages = req.files?.gallery_images || [];

  return { mainImage, galleryImages };
};

const getGalleryArray = (value) => {
  const parsed = parseJSON(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

// =====================================
// CREATE ATTRACTION
// =====================================

exports.createTour = async (req, res) => {
  try {
    const {
      category_id,
      title,
      place,
      description,
      adult_price,
      child_price,
      amenities,
      activities,
      food,
      things_to_know,
      state,
      district,
      location,
      is_new,
    } = req.body;

    if (!category_id || !title) {
      return res.status(400).json({
        message: "Category and attraction title are required",
      });
    }

    const { mainImage, galleryImages } = getUploadedFiles(req);

    let mainImageUrl = null;
    const galleryImageUrls = [];

    if (mainImage) {
      mainImageUrl = await uploadToSupabase(mainImage);
    }

    for (const file of galleryImages) {
      const imageUrl = await uploadToSupabase(file, "attractions/gallery");
      galleryImageUrls.push(imageUrl);
    }

    const [sortRows] = await db.execute(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM tours"
    );

    const sortOrder = sortRows[0].next_order;

    const id = randomUUID();

    const [result] = await db.execute(
      `INSERT INTO tours (
        id,
        category_id,
        title,
        place,
        description,
        adult_price,
        child_price,
        amenities,
        activities,
        food,
        things_to_know,
        state,
        district,
        location,
        main_image,
        gallery_images,
        is_new,
        sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        category_id,
        title,
        place || "",
        description || "",
        adult_price || 0,
        child_price || 0,
        JSON.stringify(parseJSON(amenities)),
        JSON.stringify(parseJSON(activities)),
        JSON.stringify(parseJSON(food)),
        JSON.stringify(parseJSON(things_to_know)),
        state || "",
        district || "",
        location || "",
        mainImageUrl,
        JSON.stringify(galleryImageUrls),
        getBooleanValue(is_new),
        sortOrder,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Attraction created successfully",
      id,
      is_new: getBooleanValue(is_new),
      sort_order: sortOrder,
    });
  } catch (error) {
    console.error("CREATE TOUR ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create attraction",
      error: error.message,
    });
  }
};

// =====================================
// GET ALL ATTRACTIONS
// =====================================

exports.getTours = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT *
       FROM tours
       ORDER BY sort_order ASC, created_at DESC`
    );

    const tours = rows.map((tour) => ({
      ...tour,
      is_new: Number(tour.is_new) || 0,
      amenities: parseJSON(tour.amenities),
      activities: parseJSON(tour.activities),
      food: parseJSON(tour.food),
      things_to_know: parseJSON(tour.things_to_know),
      gallery_images: getGalleryArray(tour.gallery_images),
    }));

    res.status(200).json(tours);
  } catch (error) {
    console.error("GET TOURS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch attractions",
      error: error.message,
    });
  }
};

// =====================================
// GET SINGLE ATTRACTION
// =====================================

exports.getTourById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT * FROM tours WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Attraction not found",
      });
    }

    const tour = rows[0];

    res.status(200).json({
      ...tour,
      is_new: Number(tour.is_new) || 0,
      amenities: parseJSON(tour.amenities),
      activities: parseJSON(tour.activities),
      food: parseJSON(tour.food),
      things_to_know: parseJSON(tour.things_to_know),
      gallery_images: getGalleryArray(tour.gallery_images),
    });
  } catch (error) {
    console.error("GET TOUR ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch attraction",
      error: error.message,
    });
  }
};

// =====================================
// UPDATE ATTRACTION
// =====================================

exports.updateTour = async (req, res) => {
  try {
    const { id } = req.params;

    const [existingRows] = await db.execute(
      "SELECT * FROM tours WHERE id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: "Attraction not found",
      });
    }

    const existing = existingRows[0];

    const {
      category_id,
      title,
      place,
      description,
      adult_price,
      child_price,
      amenities,
      activities,
      food,
      things_to_know,
      state,
      district,
      location,
      is_new,
    } = req.body;

    const { mainImage, galleryImages } = getUploadedFiles(req);

    // Keep old main image if no new image is uploaded.
    let mainImageUrl = existing.main_image;

    if (mainImage) {
      mainImageUrl = await uploadToSupabase(mainImage);
    }

    // Keep existing gallery images and append new uploads.
    let galleryImageUrls = getGalleryArray(existing.gallery_images);

    for (const file of galleryImages) {
      const imageUrl = await uploadToSupabase(
        file,
        "attractions/gallery"
      );

      galleryImageUrls.push(imageUrl);
    }

    const updatedIsNew =
      is_new !== undefined
        ? getBooleanValue(is_new)
        : Number(existing.is_new) || 0;

    await db.execute(
      `UPDATE tours SET
        category_id = ?,
        title = ?,
        place = ?,
        description = ?,
        adult_price = ?,
        child_price = ?,
        amenities = ?,
        activities = ?,
        food = ?,
        things_to_know = ?,
        state = ?,
        district = ?,
        location = ?,
        main_image = ?,
        gallery_images = ?,
        is_new = ?
      WHERE id = ?`,
      [
        category_id ?? existing.category_id,
        title ?? existing.title,
        place ?? existing.place,
        description ?? existing.description,
        adult_price ?? existing.adult_price,
        child_price ?? existing.child_price,
        JSON.stringify(
          amenities !== undefined
            ? parseJSON(amenities)
            : parseJSON(existing.amenities)
        ),
        JSON.stringify(
          activities !== undefined
            ? parseJSON(activities)
            : parseJSON(existing.activities)
        ),
        JSON.stringify(
          food !== undefined
            ? parseJSON(food)
            : parseJSON(existing.food)
        ),
        JSON.stringify(
          things_to_know !== undefined
            ? parseJSON(things_to_know)
            : parseJSON(existing.things_to_know)
        ),
        state ?? existing.state,
        district ?? existing.district,
        location ?? existing.location,
        mainImageUrl,
        JSON.stringify(galleryImageUrls),
        updatedIsNew,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Attraction updated successfully",
      id,
      is_new: updatedIsNew,
    });
  } catch (error) {
    console.error("UPDATE TOUR ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update attraction",
      error: error.message,
    });
  }
};

// =====================================
// TOGGLE NEW ATTRACTION STATUS
// =====================================

exports.toggleNewAttraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_new } = req.body;

    if (![0, 1, "0", "1", true, false].includes(is_new)) {
      return res.status(400).json({
        message: "Invalid attraction status",
      });
    }

    const status = getBooleanValue(is_new);

    const [result] = await db.execute(
      "UPDATE tours SET is_new = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute(
        "SELECT id FROM tours WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Attraction not found",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "New Attraction status updated",
      id,
      is_new: status,
    });
  } catch (error) {
    console.error("TOGGLE NEW ATTRACTION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update attraction status",
      error: error.message,
    });
  }
};

// =====================================
// REORDER ATTRACTIONS
// =====================================

exports.reorderTours = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        message: "orderedIds must be a non-empty array",
      });
    }

    const uniqueIds = [...new Set(orderedIds.map(String))];

    if (uniqueIds.length !== orderedIds.length) {
      return res.status(400).json({
        message: "Duplicate attraction IDs are not allowed",
      });
    }

    const placeholders = uniqueIds.map(() => "?").join(",");

    const [existingRows] = await db.execute(
      `SELECT id FROM tours WHERE id IN (${placeholders})`,
      uniqueIds
    );

    if (existingRows.length !== uniqueIds.length) {
      return res.status(400).json({
        message: "One or more attraction IDs are invalid",
      });
    }

    const caseStatements = uniqueIds
      .map(() => "WHEN ? THEN ?")
      .join(" ");

    const caseParams = [];

    uniqueIds.forEach((id, index) => {
      caseParams.push(id, index + 1);
    });

    const updateSql = `
      UPDATE tours
      SET sort_order = CASE id
        ${caseStatements}
        ELSE sort_order
      END
      WHERE id IN (${placeholders})
    `;

    await db.execute(updateSql, [
      ...caseParams,
      ...uniqueIds,
    ]);

    res.status(200).json({
      success: true,
      message: "Attraction order updated successfully",
    });
  } catch (error) {
    console.error("REORDER TOURS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reorder attractions",
      error: error.message,
    });
  }
};

// =====================================
// DELETE ATTRACTION
// =====================================

exports.deleteTour = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "DELETE FROM tours WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Attraction not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Attraction deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TOUR ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete attraction",
      error: error.message,
    });
  }
};
