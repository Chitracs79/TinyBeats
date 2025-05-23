const userModel = require("../models/userModel");
const addressModel = require("../models/addressModel");
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const StatusCodes = require('../helpers/StatusCodes');
const Messages = require('../helpers/Message');

// Functn to generate a 6-digit OTP
function generateOtp(length = 6) {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

//Functn to send Email Verification 
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail", 
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL, 
                pass: process.env.NODEMAILER_PASSWORD, 
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

    } catch (error) {
        console.error("Sending Email", error);
        return false;
    }
}

const loadForgotPasswordPage = async (req, res) => {
    try {
        res.render('users/forgotPassword', { user: null });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await userModel.findOne({ email: email });

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("users/verifyForgotPassOtp");
                console.log("OTP Send from FEV", otp)

            } else {
                return res.json({ success: false, message: Messages.OTP_SEND_FAILED});
            }
        } else {
            return res.redirect(`/forgotPassword?error=User does not exist`);

        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

//--------------------------- OTP Verification----------------------------------------------------------
const loadverifyForgotPassOtp = async (req, res) => {
    try {
        return res.render('users/verifyForgotPassOtp')
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal server error");
    }
}
const verifyForgotPassOtp = async (req, res, next) => {
    try {
       
        const { otp } = req.body;
        console.log(otp);

        if (otp === req.session.userOtp) {
            req.session.resetAllowed = true;
             
            res.json({ success: true, redirectUrl: '/resetPassword' })
        } else {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.OTP_INVALID });
        }

    } catch (error) {
        next(error);
    }
}
//----------------------------------Resend OTP-----------------------------------------------------------
const resendOtp = async (req, res,next) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: Messages.EMAIL_NOT_FOUND });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP is ", otp);
            res.status(StatusCodes.SUCCESS).json({ success: true, message: Messages.OTP_RESEND_SUCCESSFULL});
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ succes: false, message: Messages.OTP_RESEND_FAILED});
        }

    } catch (error) {
      next(error);
    }

}
//--------------------------loading reset password page---------------------------
const loadResetPasswordPage = async (req, res) => {
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

const resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const email = req.session.email;

        if (password === confirmPassword) {
            const passwordHash = await securePassword(password);
            await userModel.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            )

            res.redirect('/signin')
        } else {
            res.render('users/resetPassword', { message: "password doesnot match" });
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const loadProfilePage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (mongoose.isValidObjectId(userId)) {
            const userData = await userModel.findOne({ _id: userId });
            const addressData = await addressModel.findOne({ userId: userId });
            res.render("users/userProfile", {
                user: userData,
                userAddress: addressData,
            });
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const uploadProfile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).send("No file uploaded.");
        }
        const updatedUser = await userModel.findByIdAndUpdate(
            req.session.user,
            { profileImage: '/uploads/re-image/' + req.file.filename },
            { new: true }
        );
        
        
        if (!updatedUser) {
            return next(new Error("User not found."));
        }
        res.redirect('/userProfile');

    } catch (error) {
        next(error);
    }
}


const loadEditProfilePage = async (req, res, next) => {
    try {
        const userId = req.session.user;
        if (mongoose.isValidObjectId(userId)) {
            const userData = await userModel.findOne({ _id: userId });
            const addressData = await addressModel.findOne({ userId: userId });
            res.render("users/editProfile", {
                user: userData,
                userAddress: addressData,
            });
        }
    } catch (error) {
        next(error);
    }
}


const changeEmail = async (req, res) => {
    try {
        const userid = req.session.user;
        const { currentEmail, newEmail } = req.body;

        const user = await userModel.findById(userid);
      ;

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
        }

        if (user.email !== currentEmail) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email doesnot match" });
        }

        user.email = newEmail;
        await user.save();
        res.status(StatusCodes.SUCCESS).json({ message: "Email updated successfully" });
    } catch (error) {
        console.log("Error updating user email");
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update email" });
    }
}

const loadChangePassword = async (req, res) => {
    try {
        res.render('users/changePassword');
    } catch (error) {
        res.redirect('pageNotFound');
    }
}


const changePassword = async (req, res) => {
    try {
        const { currentPassword, password, confirmPassword } = req.body;
      
        const userId = req.session.user;
      
        const user = await userModel.findById(userId);
        const match = await bcrypt.compare(currentPassword,user.password);

        if(!match){
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Incorrect current password" });
        }

        if (password !== confirmPassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Passwords do not match" });
        }

        const passwordHash = await securePassword(password);
        await userModel.updateOne({ _id: userId }, { $set: { password: passwordHash } });

        res.status(StatusCodes.SUCCESS).json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
    }
}


const emailValid = async (req, res) => {
    try {
        const { email } = req.body;

        const findUser = await userModel.findOne({ email: email });
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("users/verifyForgotPassOtp");
                console.log("OTP Send", otp)

            } else {
                return res.json({ success: false, message: "Failed to send OTP ,Please try again" });
            }
        } else {
            return res.redirect(`/forgotPassword?error=User does not exist`);

        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}


const loadAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (mongoose.isValidObjectId(userId)) {
            const userData = await userModel.findOne({ _id: userId });
            const addressData = await addressModel.findOne({ userId: userId });
            res.render("users/address", {
                user: userData,
                userAddress: addressData,
            });
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const loadAddAddressPage = async (req, res,next) => {
    try {
        const userId = req.session.user;

        res.render('users/addAddress', { user: userId });
    } catch (error) {
        next(error);
    }
}

//-----------------------------------Add address----------------------------------------------------

const addAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;

        if (mongoose.isValidObjectId(userId)) {
            const userData = await userModel.findOne({ _id: userId });
            const { addressType, name, apartment, building, street, city, landmark, state, country, zip, phone, altPhone } = req.body;
          
            const userAddress = await addressModel.findOne({ userId: userData._id });
            if (!userAddress) {
                const newAddress = new addressModel({
                    userId: userData._id,
                    address: [{
                        addressType,
                        name,
                        apartment,
                        building,
                        street,
                        city,
                        landmark,
                        state,
                        country,
                        zip,
                        phone,
                        altPhone
                    }]
                });
                await newAddress.save();
            
            } else {
                userAddress.address.push({ addressType, name, apartment, building, street, city, landmark, state, country, zip, phone, altPhone });
                await userAddress.save();
             
            }

            res.redirect("/address");
        }


    } catch (error) {
        console.log("Error Adding address :", error);
        res.redirect('/pageNotFound');
    }
}
//-------------------------------load Edit Address Page--------------------------------------------

const loadEditAddress = async (req, res) => {
    try {
        const addressId = req.query.id;

        const user = req.session.user;


        if (mongoose.isValidObjectId(addressId)) {
            const currentAddress = await addressModel.findOne({ "address._id": addressId });

            if (!currentAddress) {
                return res.status(StatusCodes.NOT_FOUND).send("Address not found");
            }

            const addressData = currentAddress.address.find(addr => addr._id == addressId);
          
            if (!addressData) {
                return res.status(StatusCodes.NOT_FOUND).send("Address not found");
            }

            res.render('users/editAddress', { user, address: addressData });

        }
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

//-------------------------------Edit Address------------------------------------------------------
const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id; 
        const user = req.session.user;   
        const updatedData = req.body;   

        if (!addressId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Address ID is required" });
        }

        if (!mongoose.isValidObjectId(addressId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid address ID" });
        }

        if (!updatedData || Object.keys(updatedData).length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "No update data provided" });
        }

        // Find the user address document
        const addressDocument = await addressModel.findOne({ "address._id": addressId });

        if (!addressDocument) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Address not found" });
        }

        // Update the specific address inside the array
        const updatedAddress = await addressModel.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$.addressType": updatedData.addressType,
                    "address.$.name": updatedData.name,
                    "address.$.apartment": updatedData.apartment,
                    "address.$.building": updatedData.building,
                    "address.$.street": updatedData.street,
                    "address.$.city": updatedData.city,
                    "address.$.landmark": updatedData.landmark,
                    "address.$.state": updatedData.state,
                    "address.$.country": updatedData.country,
                    "address.$.zip": updatedData.zip,
                    "address.$.phone": updatedData.phone,
                    "address.$.altPhone": updatedData.altPhone,
                }
            }
        );

        if (updatedAddress.modifiedCount === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "No changes were made" });
        }

        console.log("Address updated successfully");
        res.status(StatusCodes.SUCCESS).json({ message: "Address updated successfully!" });

    } catch (error) {
        console.error(" Error editing address:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};

//------------------------Delete Address--------------------------------------------------------------

const deleteAddress = async(req,res,next)=>{
    try {
        
        const addressId = req.query.id;
        
        if (!addressId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Address ID is required" });
        }
        const updatedDocument = await addressModel.findOneAndUpdate(
            {"address._id":addressId},
            {$pull:{address:{_id:addressId}}},
            {new:true},
        )
        
        if (!updatedDocument) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Address not found" });
        }

        console.log("Address deleted successfully");
        res.status(StatusCodes.SUCCESS).json({ message: "Address deleted successfully!" });


    } catch (error) {
        console.error(" Error deleting address:", error);
        next(error);
    }
}


//------------------------Exporting modules---------------------------------------------------------
module.exports = {
    loadForgotPasswordPage,
    forgotEmailValid,
    loadverifyForgotPassOtp,
    verifyForgotPassOtp,
    resendOtp,
    loadResetPasswordPage,
    resetPassword,
    loadProfilePage, uploadProfile,
    loadEditProfilePage, changeEmail,
    loadChangePassword, changePassword, emailValid,
    loadAddressPage, loadAddAddressPage, addAddressPage,
    loadEditAddress, editAddress,deleteAddress,

}