const express  = require("express");
const multer   = require("multer");
const { verifyToken }   = require("../middlewares/authMiddleware");
const { uploadSingle, uploadMany, deleteFile } = require("../controllers/uploadController");

const router  = express.Router();
const storage = multer.memoryStorage();
const imageFilter = (req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};
const limits = { fileSize: 10 * 1024 * 1024 }; // 10 MB

const uploadOne  = multer({ storage, fileFilter: imageFilter, limits }).single("file");
const uploadManyMw = multer({ storage, fileFilter: imageFilter, limits }).array("files", 10);

router.post("/single", verifyToken, uploadOne,     uploadSingle);
router.post("/many",   verifyToken, uploadManyMw,  uploadMany);
router.delete("/",     verifyToken,                deleteFile);

module.exports = router;
