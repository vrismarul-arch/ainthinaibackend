const db = require("../config/db");
const { supabase } = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const BUCKET = "AINTHINAI";

// ---------- upload image ----------
const uploadImage = async (base64) => {
  if (!base64) return null;

  const fileName = `feature-${Date.now()}-${uuidv4()}.png`;
  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: "image/png"
    });

  if (error) throw new Error(error.message);

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
};

// ---------- extract path ----------
const extractPath = (url) => {
  if (!url) return null;
  return url.split(`${BUCKET}/`)[1];
};

// ---------- delete image ----------
const deleteImage = async (url) => {
  const path = extractPath(url);
  if (!path) return;

  await supabase.storage.from(BUCKET).remove([path]);
};

//
// ================= CREATE =================
//
exports.createFeature = async (req, res) => {
  try {
    const { type, title, description, imageBase64 } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: "type and title required" });
    }

    const imageUrl = await uploadImage(imageBase64);
    const id = uuidv4();

    await db.execute(
      `INSERT INTO features (id, type, title, description, image)
       VALUES (?, ?, ?, ?, ?)`,
      [id, type, title, description || null, imageUrl]
    );

    res.json({ message: "Feature created", id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//
// ================= GET BY TYPE =================
//
exports.getFeaturesByType = async (req, res) => {
  try {
    const { type } = req.params;

    const [rows] = await db.execute(
      `SELECT * FROM features
       WHERE type = ?
       ORDER BY created_at DESC`,
      [type]
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// ================= GET BY ID =================
//
exports.getFeatureById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT * FROM features WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Feature not found" });
    }

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// ================= UPDATE =================
//
exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageBase64 } = req.body;

    const [rows] = await db.execute(
      "SELECT image FROM features WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Feature not found" });
    }

    let imageUrl = rows[0].image;

    if (imageBase64) {
      await deleteImage(imageUrl);
      imageUrl = await uploadImage(imageBase64);
    }

    await db.execute(
      `UPDATE features
       SET title=?, description=?, image=?
       WHERE id=?`,
      [title, description || null, imageUrl, id]
    );

    res.json({ message: "Feature updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// ================= DELETE =================
//
exports.deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT image FROM features WHERE id=?",
      [id]
    );

    if (rows.length && rows[0].image) {
      await deleteImage(rows[0].image);
    }

    await db.execute("DELETE FROM features WHERE id=?", [id]);

    res.json({ message: "Feature deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
