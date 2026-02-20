const { supabase } = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const BUCKET = "AINTHINAI";

const uploadToSupabase = async (file) => {
  const fileName = `itinerary-${Date.now()}-${uuidv4()}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype
    });

  if (error) throw new Error(error.message);

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
};

module.exports = { uploadToSupabase };
