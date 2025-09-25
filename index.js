const express = require("express");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();
// Middleware to parse JSON bodies
const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(cors());
const allowedOrigins = ["http://localhost:5173", "https://sashastore.in"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "express-uploads", // Optional: folder name in Cloudinary
    // allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'svg'], // Optional: allowed image formats
    // transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: transformations
  },
});

var upload = multer({ storage });
// Define the upload route
// 'image' is the name of the field in the form-data
// app.post("/upload", upload.single("image"), (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     console.log("Cloudinary upload result:", JSON.stringify(req.file, null, 2));

//     res.json({
//       success: true,
//       message: "Image uploaded successfully!",
//       data: {
//         url: req.file.path || req.file.secure_url,
//         public_id: req.file.filename || req.file.public_id,
//         size: req.file.size || null,
//         mimetype: req.file.mimetype || null,
//         format: req.file.format || null,
//       },
//     });
//   } catch (error) {
//     console.error("Upload error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error uploading file",
//       error: error.message, // ✅ return real error as JSON
//     });
//   }
// });

app.post("/api/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.log("Cloudinary Config:", {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_CLOUD_KEY ? "loaded" : "missing",
        api_secret: process.env.CLOUDINARY_CLOUD_SECRET ? "loaded" : "missing",
      });
      console.error("Upload error (multer/cloudinary):", err);
      return res.status(500).json({
        success: false,
        message: "Error uploading file",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    console.log("Cloudinary upload result:", JSON.stringify(req.file, null, 2));

    res.json({
      success: true,
      message: "Image uploaded successfully!",
      data: {
        url: req.file.path || req.file.secure_url,
        public_id: req.file.filename || req.file.public_id,
        size: req.file.size || null,
        mimetype: req.file.mimetype || null,
      },
    });
  });
});

/**
 * ==============================================================================
 * SERVER INITIALIZATION
 * ==============================================================================
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Authenticate with Shiprocket when the server starts
  // getShiprocketToken();
});
