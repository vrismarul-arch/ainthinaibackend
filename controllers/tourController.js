const db = require("../config/db");
const { supabase } = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const BUCKET = "AINTHINAI";

const parseJSON = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

//
// ===== FEATURE MAP =====
//
const mapFeatures = async (ids = []) => {
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await db.execute(
    `SELECT id,title,description,image,type
     FROM features WHERE id IN (${placeholders})`,
    ids
  );

  return rows;
};

//
// ===== LOAD ITINERARY =====
//
const loadItinerary = async (tourId) => {

  const [days] = await db.execute(
    `SELECT * FROM itinerary_days WHERE tour_id=? ORDER BY day_number`,
    [tourId]
  );

  const result = [];

  for (const day of days) {

    const [acts] = await db.execute(
      `SELECT * FROM itinerary_activities WHERE day_id=?`,
      [day.id]
    );

    for (const act of acts) {

      const [imgs] = await db.execute(
        `SELECT image_url FROM itinerary_images WHERE activity_id=?`,
        [act.id]
      );

      act.images = imgs.map(i => i.image_url);
    }

    result.push({
      day: day.day_number,
      activities: acts
    });
  }

  return result;
};

//
// ===== IMAGE =====
//
const uploadImage = async (file) => {

  const fileName = `tour-${Date.now()}-${uuidv4()}`;

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

const deleteImages = async (urls = []) => {
  const paths = urls.map(extractPath).filter(Boolean);
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
};

//
// ===== CREATE TOUR =====
//
//
// ===== CREATE TOUR =====
//
exports.createTour = async (req, res) => {
  try {
    const body = req.body;
    const files = req.files || {};
    const id = uuidv4();

    const clean = (v) => (v === undefined || v === "" ? null : v);

    // Upload main image
    let mainImage = null;
    if (files.main_image) {
      mainImage = await uploadImage(files.main_image[0]);
    }

    // Upload gallery images
    let gallery = [];
    if (files.gallery_images) {
      for (const file of files.gallery_images) {
        gallery.push(await uploadImage(file));
      }
    }

    await db.execute(
      `INSERT INTO tours
      (id,category_id,title,place,state,district,description,location,
       adult_price,child_price,main_image,gallery_images,
       amenities,activities,food,things_to_know)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        clean(body.category_id),
        clean(body.title),
        clean(body.place),
        clean(body.state),
        clean(body.district),
        clean(body.description),
        clean(body.location),
        clean(body.adult_price),
        clean(body.child_price),
        clean(mainImage),
        JSON.stringify(gallery),
        JSON.stringify(parseJSON(clean(body.amenities))),
        JSON.stringify(parseJSON(clean(body.activities))),
        JSON.stringify(parseJSON(clean(body.food))),
        JSON.stringify(parseJSON(clean(body.things_to_know)))
      ]
    );

    res.json({ message: "Tour created", id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//
// ===== UPDATE TOUR =====
//
exports.updateTour = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const files = req.files || {};

    const [rows] = await db.execute("SELECT * FROM tours WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Tour not found" });

    const tour = rows[0];
    const clean = (v) => (v === undefined || v === "" ? null : v);

    let mainImage = tour.main_image;
    let gallery = parseJSON(tour.gallery_images);

    if (files.main_image) {
      await deleteImages([tour.main_image]);
      mainImage = await uploadImage(files.main_image[0]);
    }

    if (files.gallery_images) {
      for (const file of files.gallery_images) {
        gallery.push(await uploadImage(file));
      }
    }

    await db.execute(
      `UPDATE tours SET
        category_id=?,title=?,place=?,state=?,district=?,description=?,location=?,
        adult_price=?,child_price=?,main_image=?,gallery_images=?,
        amenities=?,activities=?,food=?,things_to_know=?
       WHERE id=?`,
      [
        clean(body.category_id),
        clean(body.title),
        clean(body.place),
        clean(body.state),
        clean(body.district),
        clean(body.description),
        clean(body.location),
        clean(body.adult_price),
        clean(body.child_price),
        clean(mainImage),
        JSON.stringify(gallery),
        JSON.stringify(parseJSON(clean(body.amenities))),
        JSON.stringify(parseJSON(clean(body.activities))),
        JSON.stringify(parseJSON(clean(body.food))),
        JSON.stringify(parseJSON(clean(body.things_to_know))),
        id
      ]
    );  

    res.json({ message: "Tour updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===== DELETE TOUR =====
//
exports.deleteTour = async (req, res) => {
  try {

    const { id } = req.params;

    const [rows] = await db.execute("SELECT * FROM tours WHERE id=?", [id]);
    if (!rows.length) return res.json({ message: "Already deleted" });

    const tour = rows[0];
    const gallery = parseJSON(tour.gallery_images);

    await deleteImages([tour.main_image, ...gallery]);

    await db.execute("DELETE FROM tours WHERE id=?", [id]);

    res.json({ message: "Tour deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//
// ===== GET ALL (WITH CATEGORY NAME) =====
//
exports.getTours = async (req, res) => {
  try {

    const [rows] = await db.execute(`
      SELECT t.*, c.name AS category_name
      FROM tours t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC
    `);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// ===== GET BY ID =====
//
exports.getTourById = async (req, res) => {
  try {

    const [rows] = await db.execute(`
      SELECT t.*, c.name AS category_name
      FROM tours t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id=?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Tour not found" });
    }

    const t = rows[0];

    const itinerary = await loadItinerary(t.id);

    res.json({
      ...t,
      amenities: await mapFeatures(parseJSON(t.amenities)),
      activities: await mapFeatures(parseJSON(t.activities)),
      food: await mapFeatures(parseJSON(t.food)),
      things_to_know: await mapFeatures(parseJSON(t.things_to_know)),
      gallery_images: parseJSON(t.gallery_images),
      itinerary
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};