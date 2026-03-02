const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("../config/db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails[0].value;
        const photo = profile.photos[0].value;

        const [rows] = await db.query(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );

        let user;

        if (rows.length === 0) {
          const [result] = await db.query(
            "INSERT INTO users (name, email, google_id, profile_pic, role) VALUES (?, ?, ?, ?, ?)",
            [name, email, googleId, photo, "user"]
          );

          user = {
            id: result.insertId,
            name,
            email,
            profile_pic: photo,
            role: "user",
          };
        } else {
          user = rows[0];
        }

        done(null, user);
      } catch (err) {
        console.error(err);
        done(err, null);
      }
    }
  )
);