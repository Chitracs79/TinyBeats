const userModel = require("../models/userModel");
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
const session = require('express-session');

// Function to generate a 6-digit OTP
function generateOtp(length = 6) {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

//Function to send Email Verification 
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail", // Use Gmail, Outlook, etc.
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL, //  email
                pass: process.env.NODEMAILER_PASSWORD, //  app password
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "OTP for password reset ",
            text: `Your OTP code is: ${otp}`,
            html: `<b>Your OTP code is: ${otp}</b>`
        });

        return info.accepted.length > 0

        // res.json({ message: "OTP sent successfully!", otp }); // Send OTP for testing (remove in production)

    } catch (error) {
        console.error("Sending Email", error);
        return false;
    }
}

const loadForgotPasswordPage = async (req,res) => {
    try {
        res.render('users/forgotPassword',{ user: null });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const forgotEmailValid = async(req,res) => {
    try {
    const {email} = req.body;
    console.log("Email entered is ",email);
    const findUser = await userModel.findOne({email:email});

    if(findUser){
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if(emailSent){
            req.session.userOtp = otp;
            req.session.email = email;
            res.render("users/verifyForgotPassOtp"); 
            console.log("OTP Send", otp) 

        } else {
            return res.json({success:false,message:"Failed to send OTP ,Please try again"});
        }
    } else {
        return res.redirect(`/forgotPassword?error=User does not exist`);
       
    }
    } catch (error) {
       res.redirect('/pageNotFound'); 
    }
}

// OTP Verification
const loadVerifyOtp = async (req, res) => {
    try {
        return res.render('users/verifyForgotPassOtp')
    } catch (error) {
        res.status(500).send("Internal server error");
    }
}
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        
        if(otp === req.session.userOtp) {
           res.json({success:true,redirectUrl:'/resetPassword'})
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }

    } catch (error) {
        console.log("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error " });
    }
}

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP is ", otp);
            res.status(200).json({ success: true, message: "OTP Resend Successfully" });
        } else {
            res.status(500).json({ succes: false, message: "Failed to resend OTP, Please try again" });
        }

    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error, Please try again" });

    }

}
//--------------------------loading reset password page---------------------------
 const loadResetPasswordPage = async(req,res)=>{
    try {
        res.render('users/resetPassword');
    } catch (error) {
        
        res.redirect('/pageNotFound');
    }
 }
//------------------------reset Password----------------------------------------------
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
}

const resetPassword = async(req,res) =>{
    try {
      const {password, confirmPassword} = req.body;
      console.log(password, confirmPassword);
      const email = req.session.email;
      if(password === confirmPassword){
        const passwordHash = await securePassword(password);
        await userModel.updateOne(
            {email:email},
            {$set:{password:passwordHash}}
        )
        res.redirect('/signin')
      } else {
        res.render('users/resetPassword', {message:"password doesnot match"});
      }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

module.exports ={
    loadForgotPasswordPage, 
    forgotEmailValid,
    loadVerifyOtp,
    verifyOtp,
    resendOtp,
    loadResetPasswordPage,
    resetPassword
}