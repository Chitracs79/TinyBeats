const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

// Define the upload directory
const uploadPath = path.join(__dirname, "../public/uploads/re-image");

// Ensure the directory exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Multer instance
const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB 
    fileFilter: fileFilter ,
});

// Export the multer instance
module.exports = upload;