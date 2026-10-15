const express = require("express");
const path = require("path");
const routes = require("./routes");

// Configura a API e publica os arquivos estáticos do protótipo.
const app = express();
const frontendPath = path.resolve(__dirname, "../../frontend");
const uploadsPath = path.resolve(__dirname, "../uploads");

app.use(express.json());
app.use("/uploads", express.static(uploadsPath));
app.use("/api", routes);
app.use(express.static(frontendPath));

module.exports = app;
