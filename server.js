// nDAO BEATS — Audio Storage Server
// Stores user audio files keyed by XPR Network WebAuth wallet account

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_DIR = path.join(__dirname, "storage");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(__dirname, { index: "index.html" }));

// Validate wallet account name (XPR Network accounts are 1-12 chars, a-z1-5.)
function isValidWallet(name) {
  return typeof name === "string" && /^[a-z1-5.]{1,13}$/.test(name);
}

// Validate filename (only safe chars: alphanumeric, hyphen, underscore, dot)
function isValidFilename(name) {
  return typeof name === "string" && /^[a-zA-Z0-9_\-. ]{1,128}$/.test(name) &&
    [".wav", ".mp3", ".mid"].some(ext => name.toLowerCase().endsWith(ext));
}

// multer: store uploads in memory first, then write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter(req, file, cb) {
    const allowed = ["audio/wav", "audio/wave", "audio/mpeg", "audio/mp3",
                     "audio/midi", "audio/x-midi", "application/octet-stream"];
    cb(null, true); // allow all, validate by extension
  }
});

// POST /api/audio/upload
// Body: multipart — wallet (string), file (binary), filename (string)
app.post("/api/audio/upload", upload.single("file"), (req, res) => {
  const { wallet, filename } = req.body;

  if (!isValidWallet(wallet)) {
    return res.status(400).json({ error: "Invalid wallet account name" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const safeName = (filename || req.file.originalname || "audio").replace(/[^a-zA-Z0-9_\-. ]/g, "_").slice(0, 128);
  const ext = path.extname(safeName).toLowerCase();
  if (![".wav", ".mp3", ".mid"].includes(ext)) {
    return res.status(400).json({ error: "Only .wav, .mp3, .mid files are accepted" });
  }

  const walletDir = path.join(STORAGE_DIR, wallet);
  if (!fs.existsSync(walletDir)) fs.mkdirSync(walletDir, { recursive: true });

  const destPath = path.join(walletDir, safeName);

  try {
    fs.writeFileSync(destPath, req.file.buffer);
    const stats = fs.statSync(destPath);
    res.json({
      ok: true,
      wallet,
      filename: safeName,
      size: stats.size,
      saved: new Date().toISOString()
    });
  } catch (err) {
    console.error("[STORAGE] Write error:", err);
    res.status(500).json({ error: "Failed to save file" });
  }
});

// GET /api/audio/list/:wallet
app.get("/api/audio/list/:wallet", (req, res) => {
  const { wallet } = req.params;
  if (!isValidWallet(wallet)) return res.status(400).json({ error: "Invalid wallet" });

  const walletDir = path.join(STORAGE_DIR, wallet);
  if (!fs.existsSync(walletDir)) return res.json({ wallet, files: [] });

  try {
    const files = fs.readdirSync(walletDir)
      .filter(f => [".wav", ".mp3", ".mid"].includes(path.extname(f).toLowerCase()))
      .map(f => {
        const st = fs.statSync(path.join(walletDir, f));
        return { filename: f, size: st.size, modified: st.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({ wallet, files });
  } catch (err) {
    res.status(500).json({ error: "Failed to list files" });
  }
});

// GET /api/audio/file/:wallet/:filename
app.get("/api/audio/file/:wallet/:filename", (req, res) => {
  const { wallet, filename } = req.params;
  if (!isValidWallet(wallet) || !isValidFilename(filename)) {
    return res.status(400).json({ error: "Invalid wallet or filename" });
  }

  const filePath = path.join(STORAGE_DIR, wallet, filename);
  if (!filePath.startsWith(STORAGE_DIR)) return res.status(403).json({ error: "Forbidden" });

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = { ".wav": "audio/wav", ".mp3": "audio/mpeg", ".mid": "audio/midi" };
  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(filePath);
});

// DELETE /api/audio/file/:wallet/:filename
app.delete("/api/audio/file/:wallet/:filename", (req, res) => {
  const { wallet, filename } = req.params;
  if (!isValidWallet(wallet) || !isValidFilename(filename)) {
    return res.status(400).json({ error: "Invalid wallet or filename" });
  }

  const filePath = path.join(STORAGE_DIR, wallet, filename);
  if (!filePath.startsWith(STORAGE_DIR)) return res.status(403).json({ error: "Forbidden" });

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true, deleted: filename });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

app.listen(PORT, () => {
  console.log(`[nDAO BEATS] Storage server running on http://localhost:${PORT}`);
  console.log(`[nDAO BEATS] Files stored in: ${STORAGE_DIR}`);
});
