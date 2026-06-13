const pool = require("../config/db");

const ensureDocumentTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        related_module VARCHAR(100),
        related_record_id INTEGER,
        file_name VARCHAR(255),
        file_path TEXT,
        file_type VARCHAR(100),
        file_size INTEGER,
        notes TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensureDocumentTable error:", err);
  }
};
ensureDocumentTable();

const getDocuments = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM documents WHERE user_id = $1 AND is_deleted = false ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ documents: result.rows });
  } catch (err) {
    console.error("GET DOCUMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getDocumentById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM documents WHERE id = $1 AND user_id = $2 AND is_deleted = false",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ document: result.rows[0] });
  } catch (err) {
    console.error("GET DOCUMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createDocument = async (req, res) => {
  const { document_name, category, related_module, related_record_id, notes } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const file_name = req.file.originalname;
  const file_type = req.file.mimetype;
  const file_size = req.file.size;
  const file_path = req.file.path; // Saved by multer

  try {
    const result = await pool.query(
      `INSERT INTO documents (user_id, document_name, category, related_module, related_record_id, file_name, file_path, file_type, file_size, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, document_name, category, related_module, related_record_id || null, file_name, file_path, file_type, file_size, notes]
    );
    res.json({ message: "Document saved", document: result.rows[0] });
  } catch (err) {
    console.error("CREATE DOCUMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const downloadDocument = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM documents WHERE id = $1 AND user_id = $2 AND is_deleted = false",
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    
    const doc = result.rows[0];
    if (!doc.file_path) {
      return res.status(404).json({ message: "Physical file not found for this metadata record" });
    }

    res.download(doc.file_path, doc.file_name);
  } catch (err) {
    console.error("DOWNLOAD DOCUMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE documents SET is_deleted = true WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error("DELETE DOCUMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getDocuments, getDocumentById, createDocument, downloadDocument, deleteDocument };
