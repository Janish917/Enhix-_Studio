require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const User = require("./models/User");

// Turn off Mongoose query buffering globally so operations fail/fallback immediately when disconnected
mongoose.set('bufferCommands', false);

const dbFilePath = path.join(__dirname, "db.json");

// Read local JSON file db
function readLocalDB() {
  try {
    if (!fs.existsSync(dbFilePath)) {
      fs.writeFileSync(dbFilePath, JSON.stringify({ users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbFilePath, "utf8"));
  } catch (err) {
    return { users: [] };
  }
}

// Write local JSON file db
function writeLocalDB(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write to local db:", err);
  }
}

// UserDB proxy that falls back to db.json when MongoDB is disconnected
const UserDB = {
  async findOne({ email }) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await User.findOne({ email });
      } catch (err) {
        console.error("MongoDB findOne failed, falling back to local DB:", err);
      }
    }
    const db = readLocalDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt
    };
  },

  async findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await User.findById(id);
      } catch (err) {
        console.error("MongoDB findById failed, falling back to local DB:", err);
      }
    }
    const db = readLocalDB();
    const user = db.users.find(u => u._id === id);
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt
    };
  },

  async create({ username, email, password }) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await User.create({ username, email, password });
      } catch (err) {
        console.error("MongoDB create failed, falling back to local DB:", err);
      }
    }
    const db = readLocalDB();
    const id = "local-user-" + Math.random().toString(36).substr(2, 9);
    const newUser = {
      _id: id,
      username,
      email,
      password,
      createdAt: new Date()
    };
    db.users.push(newUser);
    writeLocalDB(db);
    return newUser;
  }
};

const app = express();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Connection Error:", err.message));

const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "ENHIX API",
    health: "/api/health",
    message: "Backend is running. Use /api/health to verify MongoDB."
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime()
  });
});

// Upload Folder
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Rate Limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    ok: false,
    message: "Too many login attempts. Try again later."
  }
});

// Multer Setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);

    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// Upload API
app.post("/api/upload", (req, res) => {

  upload.single("media")(req, res, function (err) {

    if (err instanceof multer.MulterError) {

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          ok: false,
          message: "File too large"
        });
      }

      return res.status(400).json({
        ok: false,
        message: "Upload failed"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No file uploaded"
      });
    }

    res.json({
      ok: true,
      filename: req.file.filename
    });

  });

});

// Map to temporarily hold registration details: email -> { username, email, password (hashed), otp, expiresAt }
const pendingRegistrations = new Map();

// REGISTER
app.post("/api/auth/register", async (req, res) => {

  try {

    const { username, email, password } = req.body;

    const existingUser = await UserDB.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isDemoMode = process.env.DEMO_OTP_MODE === "true";
    let otp;

    if (isDemoMode) {
      otp = "112233";
    } else {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Save pending registration details
    pendingRegistrations.set(email, {
      username,
      email,
      password: hashedPassword,
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes validity
    });

    if (isDemoMode) {
      return res.status(200).json({
        ok: true,
        message: "Development / Demo Mode Enabled",
        demoOtp: "112233"
      });
    } else {
      // Revert to normal email OTP behavior (using Resend API)
      const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: "ENHIX Verification Code",
            html: `<p>Your ENHIX verification code is <strong>${otp}</strong></p>`
          })
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("Resend API returned error:", errText);
          throw new Error("SMTP provider error");
        }
      } catch (err) {
        console.error("Failed to send verification email:", err);
        return res.status(500).json({
          ok: false,
          message: "Failed to send verification email. Please try again."
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Verification code sent to your email."
      });
    }

  } catch (err) {

    res.status(500).json({
      ok: false,
      message: err.message
    });

  }

});

// VERIFY OTP
app.post("/api/auth/verify-otp", async (req, res) => {

  try {

    const { email, otp } = req.body;
    const isDemoMode = process.env.DEMO_OTP_MODE === "true";

    const pending = pendingRegistrations.get(email);
    if (!pending || pending.expiresAt < Date.now()) {
      return res.status(400).json({
        ok: false,
        message: "Verification session expired or not found."
      });
    }

    const expectedOtp = isDemoMode ? "112233" : pending.otp;

    if (otp !== expectedOtp) {
      return res.status(400).json({
        ok: false,
        message: "Invalid verification code."
      });
    }

    // OTP verified, create user in DB
    const existingUser = await UserDB.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: "User already exists"
      });
    }

    const newUser = await UserDB.create({
      username: pending.username,
      email: pending.email,
      password: pending.password
    });

    // Remove from pending store
    pendingRegistrations.delete(email);

    const token = `jwt-token-${newUser._id}`;

    res.status(200).json({
      ok: true,
      message: "Registration completed successfully.",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (err) {

    res.status(500).json({
      ok: false,
      message: err.message
    });

  }

});

// LOGIN
app.post("/api/auth/login", loginLimiter, async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await UserDB.findOne({ email });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Incorrect email entered"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        ok: false,
        message: "Incorrect password"
      });
    }

    const token = `jwt-token-${user._id}`;

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {

    res.status(500).json({
      ok: false,
      message: err.message
    });

  }

});

// VERIFY TOKEN
const verifyToken = async (req, res, next) => {

  const bearer = req.headers.authorization;

  if (!bearer) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized"
    });
  }

  const token = bearer.split(" ")[1];

  const userId = token.replace("jwt-token-", "");

  const user = await UserDB.findById(userId);

  if (!user) {
    return res.status(401).json({
      ok: false,
      message: "Invalid session"
    });
  }

  req.user = user;

  next();

};

// PROFILE
app.get("/api/users/profile", verifyToken, async (req, res) => {

  res.json({
    ok: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email
    }
  });

});

// MEDIA LIST
app.get("/api/media", (req, res) => {

  fs.readdir(uploadDir, (err, files) => {

    if (err) {
      return res.status(500).json({
        ok: false,
        message: "Cannot read uploads"
      });
    }

    const media = files.map(file => ({
      filename: file
    }));

    res.json(media);

  });

});

// SERVE MEDIA
app.get("/api/media/:filename", (req, res) => {

  const filePath = path.join(uploadDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.sendFile(filePath);

});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ENHIX backend running on port ${PORT}`);
  if (allowedOrigins.length) {
    console.log("CORS allowed origins:", allowedOrigins.join(", "));
  }
});