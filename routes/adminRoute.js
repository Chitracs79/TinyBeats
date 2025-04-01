const express = require('express');
const router = express.Router();

const multer  = require("multer");
const uploads = require("../helpers/multer"); 


const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController');
const categoryController = require('../controllers/categoryController');
const brandController = require('../controllers/brandController');
const productController = require('../controllers/productController');
const bannerController = require('../controllers/bannerController');
const adminOrderController = require('../controllers/adminOrderController');
const couponController = require('../controllers/couponController');
const {userAuth,adminAuth} = require("../middlewares/auth");

// Error Management
router.get("/pageError",adminAuth,adminController.loadPageError);

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
router.post("/addCategoryOffer",categoryController.addCategoryOffer);
router.delete("/removeCategoryOffer",categoryController.removeCategoryOffer);

//brand Management
router.get('/brand',adminAuth,brandController.getBrandpage);
router.post("/brand/add", adminAuth,uploads.single("image"), brandController.addBrand);
router.get('/blockBrand',adminAuth,brandController.brandBlocked);
router.get('/unblockBrand',adminAuth,brandController.brandUnblocked);

// product Management
router.get('/products',adminAuth,productController.loadProductpage);
router.get('/addProduct',adminAuth,productController.addProductpage);
router.post("/addProduct",adminAuth, uploads.array('images',5), productController.addProduct);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);
router.get('/editProduct',productController.loadEditProductPage);
router.post('/product',uploads.array('images',5),productController.editProduct);
router.delete('/deleteImage',productController.deleteSingleImage);
router.get('/blockProduct',adminAuth,productController.productBlocked);
router.get('/unblockProduct',adminAuth,productController.productUnblocked);
router.get('/products/delete/:id',adminAuth,productController.softDeleteProducts)

//banner Management
router.get('/banner',adminAuth,bannerController.loadBannerpage);
router.post('/banner/add',adminAuth,uploads.single("image"),bannerController.addBanner);
router.get("/banner/delete",adminAuth, bannerController.deleteBanner);

//order Management
router.get('/order',adminOrderController.loadOrderPage);
router.get('/adminOrders',adminOrderController.viewAdminOrderDetails);
router.put('/updateStatus',adminOrderController.updateStatus);
router.put('/orderCancel',adminOrderController.orderCancel);
router.put('/handleReturn',adminOrderController.handleReturn);
router.put('/updateReturnStatus',adminOrderController.updateReturnStatus);

//coupon Management
router.get('/coupon',couponController.loadCouponPage);
router.post('/coupon',couponController.addCoupon);
router.put('/coupon',couponController.editCoupon);
router.delete('/coupon',couponController.deleteCoupon);
//inventory Management
router.get('/inventory',productController.loadInventory);
router.patch('/inventory',productController.updateInventory);

module.exports = router;