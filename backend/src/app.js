const express = require("express");
const session = require("express-session");
const path = require("path");
const routes = require("./routes");

// Configura a API e publica os arquivos estáticos do protótipo.
const app = express();
const frontendPath = path.resolve(__dirname, "../../frontend");
const uploadsPath = path.resolve(__dirname, "../uploads");

app.use(express.json());
app.use(
  session({
    name: "rework.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);
app.use("/uploads", express.static(uploadsPath));
app.use("/api", routes);
app.use(express.static(frontendPath));

module.exports = app;
