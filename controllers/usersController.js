const userModel = require("../models/userModel");
const categoryModel = require("../models/categoryModel");
const productModel = require("../models/productModel");
const brandModel = require("../models/brandModel");
const bannerModel = require("../models/bannerModel");
const walletModel = require("../models/walletModel")
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
const passport = require("passport");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");


//-----------------------------------------Filter --------------------------------------------------------------------------------------
const filter = async (req, res, next) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const brand = req.query.brand;

        const findCategory = category ? await categoryModel.findOne({ _id: category }) : null;
        const findBrand = brand ? await brandModel.findOne({ _id: brand }) : null;
        const brands = await brandModel.find({}).lean();

        const filter = {
            isBlocked: false,
            isDeleted: false,
            stock: { $gt: 0 },
        }

        if (findCategory) {
            filter.category = findCategory._id
        }

        if (findBrand) {
            filter.brand = findBrand._id;
        }

        let findProducts = await productModel.find(filter).lean();
        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const categories = await categoryModel.find({});

        let itemsPerPage = 6;
        let currentPage = Math.max(1, parseInt(req.query.page) || 1);
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages);

        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        const currentProduct = findProducts.slice(startIndex, endIndex);


        let userData = null;

        if (user) {
            userData = await userModel.findOne({ _id: user })
          
        }

        if (userData) {
            userData.searchHistory = userData.searchHistory || [];
            userData.searchHistory.push({
                category: findCategory ? findCategory._id : null,
                brand: findBrand ? findBrand._id : null,
                searchedOn: new Date(),
            });
            await userData.save();
        }

        req.session.filteredProducts = currentProduct;
        res.render('users/shop', {
            user: userData,
            products: currentProduct,
            categories: categories,
            brands: brands,
            totalPages,
            currentPage,
            selectedCategory: category || null,
            selectedBrand: brand || null,
        })

    } catch (error) {
        next(error);
    }
}
const filterPrice = async (req, res) => {
    try {
        const user = req.session.user;


        const userData = await userModel.findOne({ _id: user });
        const brands = await brandModel.find({}).lean();
        const category = await categoryModel.find({ isDeleted: false }).lean();
      
        let findProducts = await productModel.find({
            salesPrice: { $gt: req.query.gt, $lt: req.query.lt },
            isBlocked: false,
            stock: { $gt: 0 },
        }).lean()
        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        let itemsPerPage = 6;
        let currentPage = Math.max(1, parseInt(req.query.page) || 1);
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages);

        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        const currentProduct = findProducts.slice(startIndex, endIndex);

        req.session.filteredProducts = findProducts;

        res.render('users/shop', {
            user: userData,
            products: currentProduct,
            categories: category || [],
            brands: brands,
            totalPages,
            currentPage,
            selectedCategory: category || null,
            selectedBrand: brands || null,
        })
    } catch (error) {
        next(error);
    }
}

const search = async (req, res,next) => {
    try {
        const user = req.session.user;
        const userData = await userModel.findOne({ _id: user });
        const search = req.body.search || "";
        
    

        const brands = await brandModel.find({}).lean();
        const categories = await categoryModel.find({ isDeleted: false }).lean();
        const categoryIds = categories.map(category => category._id.toString());
       
        let searchResult = [];
       
       
        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
        
            searchResult = req.session.filteredProducts.filter(products =>
                products.name.toLowerCase().includes(search.toLowerCase())
            )
        } else {
           
            
            searchResult = await productModel.find({
             $and:[
               {isBlocked:false},
               {stock:{$gt:0}},
               {name: {$regex:'.*'+search+'.*',$options:"i"}}
             ]
            })
        }
           
            searchResult.sort((a,b) => new Date(b.createdOn) - new Date(a.createdOn));

            let itemsPerPage = 6;
            let currentPage = Math.max(1, parseInt(req.query.page) || 1);
            let totalPages = Math.ceil(searchResult.length / itemsPerPage);
            currentPage = Math.min(currentPage, totalPages);

            let startIndex = (currentPage - 1) * itemsPerPage;
            let endIndex = startIndex + itemsPerPage;

            const currentProduct = searchResult.slice(startIndex,endIndex);
            

            res.render('users/shop',{
                user : userData,
                products : currentProduct,
                categories : categories,
                brands : brands,
                totalPages,
                currentPage,
                count:searchResult.length,
                selectedCategory:null,
                selectedBrand:null,
                searchValue: search,

            })

    } catch (error) {
        next(error)
    }
}

const clear = async(req,res)=>{
    try {
        const user = req.session.user;
        const userData = await userModel.findOne({ _id: user });

        const categories = await categoryModel.find({ isDeleted: false });
        const categoryIds = categories.map(category => category._id);

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const products = await productModel.find({
            isBlocked: false,
            category: { $in: categoryIds },
            stock: { $gt: 0 }
        }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalProducts = await productModel.countDocuments(
            {
                isBlocked: false,
                category: { $in: categoryIds },
                stock: { $gt: 0 }
            }
        )

        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await brandModel.find({
            isBlocked: false,
        })

        const categoriesWithIds = categories.map(category => ({
            _id: category._id,
            name: category.name,
        }))

        if(req.session.filteredProducts){
            req.session.filteredProducts = null;
        }
        res.render('users/shop',
            {
                user: userData,
                products: products,
                categories: categoriesWithIds,
                brands: brands,
                totalProducts: totalProducts,
                currentPage: page,
                totalPages: totalPages,
                selectedCategory: req.query.category || null,
                selectedBrand: req.query.brand || null,
            }
        )

    } catch (error) {
        next(error);
    }

}

const sort = async(req,res)=>{
    try {
        const sort = req.query.sort;
        

        const user = req.session.user;
        const userData = await userModel.findOne({ _id: user });

        const categories = await categoryModel.find({ isDeleted: false });
        const categoryIds = categories.map(category => category._id);

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        let products;
        
            if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
              products = req.session. filteredProducts;               
            } else {                              
             products =   await productModel.find({
                    isBlocked: false,
                    category: { $in: categoryIds },
                    stock: { $gt: 0 }
                    })              
            }    
            if(sort==="a-z"){
                products = products.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
            }  else if(sort === "z-a"){
                products = products.sort((a, b) => b.name.localeCompare(a.name, "en", { sensitivity: "base" }));
            } else if(sort === "low-high"){
                products = products.sort((a,b) => a.salesPrice - b.salesPrice );
            } else if(sort === "high-low"){
                products = products.sort((a,b) => b.salesPrice - a.salesPrice ); 
            }
        const totalProducts = await productModel.countDocuments(
            {
                isBlocked: false,
                category: { $in: categoryIds },
                stock: { $gt: 0 }
            }
        )

        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await brandModel.find({
            isBlocked: false,
        })

        const categoriesWithIds = categories.map(category => ({
            _id: category._id,
            name: category.name,
        }))

        res.render('users/shop',
            {
                user: userData,
                products: products,
                categories: categoriesWithIds,
                brands: brands,
                totalProducts: totalProducts,
                currentPage: page,
                totalPages: totalPages,
                selectedCategory: req.query.category || null,
                selectedBrand: req.query.brand || null,
                 searchValue: '',
            }
        )

    } catch (error) {
        next(error);
    }
}


const details = async(req,res,next)=>{
    try {
        const productId = req.query.id;
        const userId = req.session.user;
        const userData = await userModel.findById(userId);
        const product = await productModel.findById(productId)
                                    .populate("category")
                                    .populate("brand");
        

        if(!product || product.isBlocked){
            return res.redirect("/shop")
        }

        const cat = product.category._id;
       

        let products = await productModel.find({
            isBlocked: false,
            stock: { $gt: 0 },
            category : cat,
            _id:{$ne:productId}
        })
        products = products.splice(0,4); 
        
        
        res.render("users/productDetails",{

            user:userData,
            product : product,
            products:products,
        })

    } catch (error) {
        next(error);
    }
}

//--------------------------------------load shopping page-----------------------------------------------------------------------------
const loadShoppingPage = async (req, res, next) => {
    try {
        const user = req.session.user;
        const userData = await userModel.findOne({ _id: user });

        const categories = await categoryModel.find({ isDeleted: false });
        const categoryIds = categories.map(category => category._id);

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const products = await productModel.find({
            isBlocked: false,
            category: { $in: categoryIds },
            stock: { $gt: 0 }
        }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalProducts = await productModel.countDocuments(
            {
                isBlocked: false,
                category: { $in: categoryIds },
                stock: { $gt: 0 }
            }
        )

        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await brandModel.find({
            isBlocked: false,
        })

        const categoriesWithIds = categories.map(category => ({
            _id: category._id,
            name: category.name,
        }))

        res.render('users/shop',
            {
                user: userData,
                products: products,
                categories: categoriesWithIds,
                brands: brands,
                totalProducts: totalProducts,
                currentPage: page,
                totalPages: totalPages,
                selectedCategory: req.query.category || null,
                selectedBrand: req.query.brand || null,
            }
        )

    } catch (error) {
        next(error);
    }
}




// ----------------------------------------------------------------loading homepage---------------------------------------------------------------------
const loadHomePage = async (req, res) => {
    try {
        const userid = req.session.user || req.user; // Get user from session
        
        
        const today = new Date().toISOString();
        let banners = await bannerModel.find({
            startDate: { $lte: new Date(today) },
            endDate: { $gt: new Date(today) }
        })

       
        let categories = await categoryModel.find({});
        categories = categories.slice(0, 6);

        let products = await productModel.find({
            isBlocked: false,
            stock: { $gt: 0 }
        }).limit(10);
       
        products.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn))
       
        

        if (mongoose.isValidObjectId(userid)) {
            let userData = await userModel.findOne({ _id: userid }); 
            if(userData.isBlocked){
                userData = null;
            }
            return res.render("users/home", { user: userData, products: products, categories: categories, banners: banners || [] });
        } else {
            return res.render("users/home", { user: null, products: products, categories: categories, banners: banners || [] })
        }

    } catch (error) {
        console.error("Error loading home page:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server error");
    }
};


// ------------------------------------------loading signup page----------------------------------------------------------------------------
const loadSignupPage = async (req, res) => {
    try {
        // const { tab } = req.query; // tab=signin or signup
        res.render('users/signup', { tab: 'signup' });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server error");
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
        const { name, email, phone, password, confirmPassword , referral} = req.body;

        if (password !== confirmPassword) {
            return res.render('users/signup', { message: "Password doesnot match" });
        }

        const findUser = await userModel.findOne({ email });
     
        if (findUser) {
            return res.render('users/signup', { message: "User with this email already exist" });
        }
        if(referral && referral.trim()){
        const referralCode = referral.toUpperCase();
        const referredUser = await userModel.findOne({referralCode:referralCode})
            if(!referredUser){
            return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:"Invalid referral code."})
             }
         }
        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error")
        }
      
        //session handling
        req.session.userOtp = otp;
        req.session.otpCreatedAt = Date.now();
        req.session.userData = { name, email, phone, password,referral };

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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal server error");
    }
}

function generateReferralCode(input) {

    if (!input || typeof input !== 'string') return null;
  
  
    const base = input.substring(0, 5).toUpperCase();
  
  
    const randomNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
    return `${base}${randomNumber}`;
  }
const verifyOtp = async (req, res) => {
    try {
        
        const { otp } = req.body;
        console.log("Otp Verified:",otp);
        const otpCreatedAt = req.session.otpCreatedAt;

        const now = Date.now();
        if (!otpCreatedAt || now - otpCreatedAt > 60 * 1000) {
            return res.status(StatusCodes.SUCCESS).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);
        
            let referral=req.session.userData.referral
            referral = referral.toUpperCase();
            let referredUser
            if(referral && referral.trim()){
            referredUser = await userModel.findOne({referralCode:referral});
            
            let wallet = await walletModel.findOne({ userId:referredUser._id});
                  if (!wallet) {
                    wallet = new walletModel({ userId:referredUser._id, balance: 0, transactions: [] });
                  }
              
                  wallet.balance += 100;
            
                  wallet.transactions.push({ amount:500, type: "credit", description: "Referral Reward" });
              
                  await wallet.save();
                }
      
      
            const referralCode =  generateReferralCode(user.name);
              

            const saveUserData = new userModel({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                googleId: undefined,
                referralCode,
                referredBy: referredUser?.name,
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
           
            res.json({ success: true, redirectUrl: "/" })
        } else {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid OTP, Please try again" });
        }

    } catch (error) {
        console.log("Error Verifying OTP", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error " });
    }
}

const resendOtp = async (req, res) => {
    try {
         const { email } = req.session.userData;
       
        if (!email) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;
        req.session.otpCreatedAt = Date.now();

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP is ", otp);
            res.status(StatusCodes.SUCCESS).json({ success: true, message: "OTP Resend Successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ succes: false, message: "Failed to resend OTP, Please try again" });
        }

    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error, Please try again" });

    }

}




// ---------------------------------loading signin page----------------------------------------------------------
const loadSigninPage = async (req, res) => {

    try {
        res.render('users/signup', { tab: 'signin' });
    }
    catch (error) {
        res.redirect("/pageNotFound");
    }
}

const signin = async (req, res) => {
    try {

        const { email, password } = req.body;
      
        const findUser = await userModel.findOne({ email: email });
        
        if (!findUser) {
            return res.render("users/signin", { message: "Invalid Credentials" });
        }
        if (findUser.isBlocked) {
            return res.render("users/signin", { message: "Cannot login with this email" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("users/signin", { message: "Invalid Credentials" })
        }
        req.session.user = findUser._id;
      

        return res.redirect("/");
    } catch (error) {
        console.error("login error", error);
        res.render("users/signin", { message: "Login failed, Please try again later." })
    }
}


// ----------------------------------------------------------------
//setting up logout

const logout = async (req, res) => {
    try {

        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error", err);
                return res.redirect('pageNotFound');
            }
            return res.redirect('/');
        })

    } catch (error) {
        console.log("Logout Error", error);
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

const googleSession = async (req, res) => {

    req.session.user = req.user._id;
    res.redirect("/");
}


module.exports = {
    loadHomePage,
    loadShoppingPage, filter, filterPrice, 
    search,clear,sort,details,
    loadPageNotFound,
    loadSignupPage, signup,
    loadVerifyOtp, verifyOtp, resendOtp,
    loadSigninPage,signin,
    logout, googleSession,

}