const db = require("../config/db");
const { supabase } = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const BUCKET = "AINTHINAI";

const uploadImage = async (file) => {

  const fileName = `category-${Date.now()}-${uuidv4()}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype
    });

  if (error) throw new Error(error.message);

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
};

const extractPath = (url) => {
  if (!url) return null;
  return url.split(`/${BUCKET}/`)[1];
};

const deleteImage = async (url) => {
  const path = extractPath(url);
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }
};

//
// ===== GET =====
//
exports.getCategories = async (req, res) => {

  const [rows] = await db.execute(
    "SELECT * FROM categories ORDER BY name"
  );

  res.json(rows);
};

//
// ===== CREATE =====
//
exports.createCategory = async (req, res) => {
  try {

    const id = uuidv4();
    const { name } = req.body;

    let image = null;

    if (req.file) {
      image = await uploadImage(req.file);
    }

    await db.execute(
      "INSERT INTO categories (id,name,image) VALUES (?,?,?)",
      [id, name, image]
    );

    res.json({ message: "Category created" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//
// ===== UPDATE =====
//
exports.updateCategory = async (req, res) => {
  try {

    const { id } = req.params;
    const { name } = req.body;

    const [rows] = await db.execute(
      "SELECT * FROM categories WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    let image = rows[0].image;

    if (req.file) {
      await deleteImage(image);
      image = await uploadImage(req.file);
    }

    await db.execute(
      "UPDATE categories SET name=?, image=? WHERE id=?",
      [name, image, id]
    );

    res.json({ message: "Updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//
// ===== DELETE =====
//
exports.deleteCategory = async (req, res) => {
  try {

    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT * FROM categories WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.json({ message: "Already deleted" });
    }

    await deleteImage(rows[0].image);

    await db.execute(
      "DELETE FROM categories WHERE id=?",
      [id]
    );

    res.json({ message: "Deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};