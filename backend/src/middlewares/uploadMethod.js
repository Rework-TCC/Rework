const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.resolve(__dirname, "../../uploads/methods");
fs.mkdirSync(uploadDir, { recursive: true });
const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return cb(new Error("Tipo de arquivo não permitido."));
    }
    cb(null, true);
  }
}).single("arquivo");

function uploadMetodo(req, res, next) {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ mensagem: "O arquivo deve ter no máximo 2 MB." });
    }
    if (error) {
      return res.status(400).json({ mensagem: error.message || "Erro ao enviar arquivo." });
    }
    next();
  });
}

module.exports = { uploadMetodo };
