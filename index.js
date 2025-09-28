import express from "express";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cors from "cors";
import multer from "multer";
import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  PaymentFlow,
  MetaInfo,
} from "pg-sdk-node";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
dotenv.config();
// Middleware to parse JSON bodies
const app = express();
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
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

// --- ADD THIS DEBUG BLOCK ---
console.log("\n==============================================");
console.log("    CHECKING ENVIRONMENT CREDENTIALS");
console.log("==============================================");
console.log(
  `- Is CLIENT_ID loaded? \t-> ${process.env.CLIENT_ID ? "✅ Yes" : "❌ NO"}`
);
console.log(
  `- Is CLIENT_SECRET loaded? \t-> ${
    process.env.CLIENT_SECRET ? "✅ Yes" : "❌ NO"
  }`
);
console.log(
  `- Is CLIENT_VERSION loaded? \t-> ${
    process.env.CLIENT_VERSION ? "✅ Yes" : "❌ NO"
  }`
);
console.log("==============================================\n");
// --- END OF DEBUG BLOCK ---

// phonepe imports
const phonePeClient = new StandardCheckoutClient({
  env: Env.SANDBOX, // Use Env.PRODUCTION for live
  clientId: process.env.CLIENT_ID, // Your Merchant ID
  clientSecret: process.env.CLIENT_SECRET, // Your Salt Key
  clientVersion: process.env.CLIENT_VERSION, // Your Salt Index (as a string)
});

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


const client = StandardCheckoutClient.getInstance(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.CLIENT_VERSION,
  Env.PRODUCTION
);

// 2. Create Payment Route (Using the SDK)
app.post("/api/create-payment", async (req, res) => {
  try {
    const { amount, customerPhone, customerName } = req.body;

    const transactionId = `TXN_${randomUUID()}`;
    const userId = `USER_${randomUUID()}`;

    // Redirect URL after payment completion
    const redirectUrl = `https://sashastore.in/payment-status?transactionId=${transactionId}`;
    if (!amount || !customerPhone || !customerName) {
      return res.status(400).json({
        success: false,
        message: "Amount, name, and phone are required.",
      });
    }


    const metaInfo = MetaInfo.builder().udf1("udf1").udf2("udf2").build();
    const merchantOrderId = transactionId;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfo)
      .build();

    const response = await client.pay(request)
    if (response && response.redirectUrl) {
      console.log("Payment initiated successfully. Response:", response);
      res.status(200).json({
        success: true,
        transactionId: transactionId,
        redirectUrl: response.redirectUrl,
      });
    } else {
      console.error("PhonePe API call failed. Response:", response);
      res.status(500).json({
          success: false,
          message: response?.message || "Payment initiation failed.",
        });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
});



// 3. Payment Status Route (Webhook or Redirect Handling)
app.post("/api/payment-status", async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction ID is required." });
    }


    const response = await client.phonePeClient.checkStatus(transactionId);
    if (response && response.success) {
      console.log("Payment status retrieved successfully. Response:", response);
      res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      console.error("PhonePe API call failed. Response:", response);
      res.status(500).json({
        success: false,
        message: response?.message || "Failed to retrieve payment status.",
      });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
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
