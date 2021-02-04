const path = require("path");
const multer = require("multer");
const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * création d'objet de configuration de multer
 */
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    //destination pour explique ou enregistrer les fichiers
    callback(null, path.join(__dirname, "../tmp")); // null pour dire qu'il n ya pas eu d'erreurs
  },
  filename: (req, file, callback) => {
    const name = file.originalname;
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name);
  },
});

module.exports = multer({ storage: storage }).single("file");
