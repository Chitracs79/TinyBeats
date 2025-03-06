const userModel = require("../models/userModel");
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');






// ----------------------------------------------------------------
//loading homepage
const loadHomePage = async (req, res) => {
    try {
        const userid = req.session.user; // Get user from session
     
        if ( mongoose.isValidObjectId(userid)) {
            console.log("Querying user with ID:", userid);
            const userData = await userModel.findOne({ _id: userid }); // Fetch user data from DB
            console.log("User in home page from database is ",userData);
            return res.render("users/home", { user: userData }); //  Pass `user` to the template
        } 
        
        return res.render("users/home", { user: null }); // Still pass `user` (to avoid 'undefined' error)
        
    } catch (error) {
        console.error("Error loading home page:", error);
        return res.status(500).send("Server error");
    }
};


// ----------------------------------------------------------------
//loading signup page
const loadSignupPage = async (req, res) => {
    try {
        return res.render('users/signup')
    } catch (error) {
        res.status(500).send("Server errror");
    }
}

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
            subject: "Verify OTP ",
            text: `Your OTP code is: ${otp}`,
            html: `<b>Your OTP code is: ${otp}</b>`
        });

        return info.accepted.length > 0

        // res.json({ message: "OTP sent successfully!", otp }); // Send OTP for testing (remove in production)
    } catch (error) {
        console.error("Error Sending Email", error);
        return false;
    }
}
//signup page 
const signup = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('users/signup', { message: "Password doesnot match" });
        }

        const findUser = await userModel.findOne({ email });
        console.log(findUser)
        if (findUser) {
           return res.render('users/signup', { message: "User with this email already exist" });
        } 
            const otp = generateOtp();

            const emailSent = await sendVerificationEmail(email, otp);
    
            if (!emailSent) {
                return res.json("email-error")
            }
    
            //session handling
            req.session.userOtp = otp;
            req.session.userData = { name, email, phone, password };
    
            res.render("users/verifyOtp");
            console.log("OTP Send", otp) 
        

        

    } catch (error) {

        console.error("Signup Page Error: Saving user");
        res.redirect("pageNotFound");
    }
}

// ----------------------------------------------------------------

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
}

// OTP Verification
const loadVerifyOtp = async (req, res) => {
    try {
        return res.render('users/verifyOtp')
    } catch (error) {
        res.status(500).send("Internal server error");
    }
}
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        
        if(otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);

            const saveUserData = new userModel({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                googleId: undefined
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            console.log("req.session.user =>", req.session.user);
            res.json({ success: true, redirectUrl: "/" })
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




// ----------------------------------------------------------------
//loading signin page
const loadSigninPage = async (req, res) => {
    try {
        // console.log(req.session.user);
        // if (req.session.user) {
        //     res.render('users/signin')
        // } else {
        //     res.redirect("/")
        // }

        try {
            return res.render('users/signin')
        } catch (error) {
            res.status(500).send("Server errror");
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const signin = async(req,res) => {
    try {
       
        const {email,password} = req.body;
        console.log(email);
        const findUser = await userModel.findOne({email : email});
        // console.log(findUser);
        if(!findUser){
            return res.render("users/signin",{message:"User not found"});
        }
        if(findUser.isBlocked){
            return res.render("users/signin",{message:"User is blocked by admin. Please contact admin"});   
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("users/signin",{message:"Incorrect Password"})
        }
        req.session.user = findUser._id;
        console.log("User stored in session",req.session.user);
        
        return res.redirect("/");
    } catch (error) {
        console.error("login error",error);
        res.render("users/signin", {message:"Login failed, Please try again later."})
    }
}


// ----------------------------------------------------------------
//setting up logout

const logout = async(req,res)=>{
    try {
        
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction errro",err);
                return res.redirect('pageNotFound');
            }
            return res.redirect('/');
        })

    } catch (error) {
        console.log("Logout Error",error);
        res.redirect('/pageNotFound');
    }
}



// ----------------------------------------------------------------
//loading pagenotfound page
const loadPageNotFound = async (req, res) => {
    try {
        res.render('users/pageNotFound');
    } catch (error) {
        redirect('/pageNotFound');
    }
}

module.exports = {
    loadHomePage,
    loadPageNotFound,
    loadSignupPage, signup,
    loadVerifyOtp, verifyOtp, resendOtp,
    loadSigninPage,signin,
    logout

}