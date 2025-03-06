const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const profileContoller = require('../controllers/profileController');
const passport = require('passport');



// loading homepage
router.get('/', userController.loadHomePage)

//loading signup page
router.get('/signup',userController.loadSignupPage)
router.post('/signup',userController.signup);

//OTP verification page
router.get("/verifyOtp", userController.loadVerifyOtp);
router.post("/verifyOtp", userController.verifyOtp);
router.post('/resendOtp',userController.resendOtp)

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/signup" }),
    (req, res) => {
      res.redirect("/"); // Redirect after successful login
    }
  );
//loading signin page
router.get('/signin',userController.loadSigninPage);
router.post('/signin',userController.signin);

//profile management
router.get('/forgotPassword',profileContoller.loadForgotPasswordPage);
router.post('/forgotEmailValid', profileContoller.forgotEmailValid);

// Forgot Password OTP verification page
router.get("/verifyForgotPassOtp", profileContoller.loadVerifyOtp);
router.post("/verifyForgotPassOtp", profileContoller.verifyOtp);
router.post('/resendOtp',profileContoller.resendOtp)

//Reset Password
router.get('/resetPassword',profileContoller.loadResetPasswordPage);
router.post('/resetPassword',profileContoller.resetPassword);

//logout routing
router.get('/logout',userController.logout);

//loading pageNotFoundPage
router.get('/pageNotFound',userController.loadPageNotFound)

module.exports = router;