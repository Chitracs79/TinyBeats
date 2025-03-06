const express = require('express');
const router = express.Router();

const multer  = require("multer");
const uploads = require("../helpers/multer"); // ✅ Correctly importing multer


const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController');
const categoryController = require('../controllers/categoryController');
const brandController = require('../controllers/brandController');
const productController = require('../controllers/productController');
const {userAuth,adminAuth} = require("../middlewares/auth");

// Error Management
router.get("/pageError",adminController.loadPageError);

// Login Management
router.get('/',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/dashboard',adminAuth,adminController.loadDashboard);
router.get('/logout',adminAuth,adminController.logout);

//Customer Management
router.get('/customer',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked);

//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post("/category/add", adminAuth, categoryController.addCategory);
router.post("/category/edit/:id", adminAuth, categoryController.updateCategory);
router.get("/category/delete/:id",adminAuth,categoryController.softDeleteCategory);

//brand Management
router.get('/brand',adminAuth,brandController.getBrandpage);
router.post("/brand/add", adminAuth,uploads.single("image"), brandController.addBrand);
router.get('/blockBrand',adminAuth,brandController.brandBlocked);
router.get('/unblockBrand',adminAuth,brandController.brandUnblocked);

// product Management
router.get('/products',adminAuth,productController.loadProductpage);
router.get('/addProduct',adminAuth,productController.addProductpage);
router.post("/addProduct",adminAuth, uploads.array("images", 4), productController.addProduct);
module.exports = router;