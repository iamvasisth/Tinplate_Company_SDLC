const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware");
const { getDocuments, getDocumentById, createDocument, deleteDocument, downloadDocument } = require("../controllers/documentController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../../uploads/documents");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

router.get("/documents", authMiddleware, getDocuments);
router.get("/documents/:id", authMiddleware, getDocumentById);
router.get("/documents/:id/download", authMiddleware, downloadDocument);
router.post("/documents", authMiddleware, upload.single('file'), createDocument);
router.delete("/documents/:id", authMiddleware, deleteDocument);

module.exports = router;
