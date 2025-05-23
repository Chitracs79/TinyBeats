const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const profileController = require('../controllers/profileController');
const wishlistController = require('../controllers/wishlistController');
const cartController = require('../controllers/cartController');
const checkoutController = require('../controllers/checkoutController');
const orderController = require('../controllers/orderController');
const walletController = require('../controllers/walletController');
const retryPaymentController = require('../controllers/retryPaymentController');
const passport = require('passport');
const {userAuth,redirect,isBlocked} = require("../middlewares/auth");
const multer  = require("multer");
const uploads = require("../helpers/multer"); 


// HomePage
router.get('/',isBlocked, userController.loadHomePage);

//ShopPage
router.get('/shop',userAuth,userController.loadShoppingPage);
router.get('/filter',userAuth,userController.filter);
router.get('/filterPrice',userAuth,userController.filterPrice);
router.post('/search',userAuth,userController.search);
router.get('/clear',userAuth,userController.clear);
router.get('/sort',userAuth,userController.sort);
router.get('/details',userAuth,userController.details);

//loading signup page
router.get('/signup',redirect,userController.loadSignupPage)
router.post('/signup',userController.signup);
//loading signin page
 router.get('/signin', redirect,userController.loadSigninPage);
router.post('/signin',userController.signin);


//OTP verification page
router.get("/verifyOtp", userController.loadVerifyOtp);
router.post("/verifyOtp", userController.verifyOtp);
router.post('/resendOtp',userController.resendOtp)

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/signup" }),
    redirect,
    userController.googleSession, 
  );


//Profile management
router.get('/forgotPassword',profileController.loadForgotPasswordPage);
router.post('/forgotEmailValid', profileController.forgotEmailValid);


router.get('/userProfile',userAuth,profileController.loadProfilePage);
router.post('/uploadProfile',userAuth,uploads.single('profileImage'),profileController.uploadProfile);
router.get('/editProfile',userAuth,profileController.loadEditProfilePage);
router.put('/changeEmail',userAuth,profileController.changeEmail);
router.get('/changePassword',userAuth,profileController.loadChangePassword);
router.post('/changePassword',userAuth,profileController.changePassword);
router.post('/EmailValid', userAuth, profileController.emailValid);

//wishlist management
router.get('/wishlist',userAuth,wishlistController.wishlist);
router.post('/wishlist',userAuth,wishlistController.addToWishlist);
router.delete('/wishlist',userAuth,wishlistController.removeFromWishlist);

//Cart management
router.post('/cart/:productId',userAuth,cartController.addToCart);
router.get('/cart',userAuth,cartController.loadCart);
router.put('/cart',userAuth,cartController.changeQuantity);
router.delete('/cart',userAuth,cartController.removeFromCart);
router.get('/cart/validateCheckout',userAuth, cartController.validateCheckout);

// Forgot Password OTP verification page
router.get("/verifyForgotPassOtp", profileController.loadverifyForgotPassOtp);
router.post("/verifyForgotPassOtp",profileController.verifyForgotPassOtp);
router.post('/resendOtp',profileController.resendOtp)

//Reset Password
router.get('/resetPassword',profileController.loadResetPasswordPage);
router.post('/resetPassword',profileController.resetPassword);

//Address Management
router.get("/address",userAuth,profileController.loadAddressPage);
router.get('/addAddress',userAuth,profileController.loadAddAddressPage);
router.post('/addAddress',userAuth,profileController.addAddressPage);
router.get('/editAddress', userAuth, profileController.loadEditAddress);
router.put('/editAddress',userAuth,profileController.editAddress);
router.delete('/deleteAddress',userAuth,profileController.deleteAddress);


//checkout
router.get('/checkout',userAuth,checkoutController.loadCheckoutPage)
router.get('/checkoutAddress',userAuth,checkoutController.loadCheckoutAddressPage)
router.post('/checkoutAddress',userAuth,checkoutController.saveCheckoutAddress)
router.post('/applyCoupon',userAuth,checkoutController.applyCoupon);
router.delete('/removeCoupon',userAuth,checkoutController.removeCoupon);

//orders
router.get('/confirmation',userAuth,orderController.loadConfirmation);
router.post('/placeOrder',userAuth,orderController.placeOrder);
router.post('/placeWalletOrder',userAuth,orderController.placeWalletOrder);
router.get('/orders',userAuth,orderController.orders);
router.get('/orderDetails',userAuth,orderController.loadOrderDetails);
router.put('/cancelProduct',userAuth,orderController.cancelProduct);
router.put('/cancelOrder',userAuth,orderController.cancelOrder);
router.get('/downloadInvoice',userAuth,orderController.downloadInvoice);
router.post("/return", userAuth, uploads.array('images', 3), orderController.requestReturn);
router.post('/orderSearch',userAuth,orderController.orderSearch);
router.put('/cancelReturnRequest',userAuth,orderController.cancelReturnRequest)


//wallet
router.get('/wallet',userAuth,walletController.loadWallet);

router.post("/wallet/createOrder", userAuth,walletController.createOrder);
router.post("/wallet/verifyPayment",userAuth, walletController.verifyPayment);
router.put("/wallet/withdrawMoney",userAuth,walletController.withdrawMoney);

//razorPay
router.post("/order/createOrder",userAuth,orderController.createOrder)
router.post("/order/verifyPayment",userAuth,orderController.verifyPayment);

//retry payment
router.get("/paymentFailure",userAuth,retryPaymentController .loadPaymentFailure)
router.get("/retryPayment",userAuth,retryPaymentController .loadRetryPayment)
router.put("/retryPayment/cod",userAuth,retryPaymentController .retryPaymentCod)
router.put('/retryPayment/wallet',userAuth,retryPaymentController.retryPaymentWallet)
router.post('/retryPayment/online',userAuth,retryPaymentController.retryPaymentOnline)
router.post('/retryPayment/verifyPayment',userAuth,retryPaymentController.verifyPayment)

//logout routing
router.get('/logout',userAuth,userController.logout);

//loading pageNotFoundPage
router.get('/pageNotFound',userAuth,userController.loadPageNotFound)

module.exports = router;