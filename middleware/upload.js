const multer = require("multer");

/**
 * Configura o multer para receber uploads em memória (buffer).
 * Limite de 5MB, aceita apenas imagens.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Use JPEG, PNG ou WEBP."));
    }
  },
});

module.exports = { upload };
