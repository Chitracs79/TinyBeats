const wishlistModel = require("../models/wishlistModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel")
const mongoose = require('mongoose');
const category = require("../models/categoryModel");
const cartModel = require("../models/cartModel");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");

const wishlist = async(req,res,next)=>{
 
    try {
        
    const userId = req.session.user;
    const user  = await userModel.findById(userId);

    const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;


    const cart = await cartModel.findOne({ userId });
    const cartProductIds = cart ? cart.products.map((item) => item.productId) : [];

    const products = await productModel.find({_id:{$in:user.wishlist,$nin: cartProductIds },isBlocked:false})
    .populate("category")
    .populate("brand")
    .skip(skip)
    .limit(limit);

    const totalProducts = await productModel.countDocuments({_id:{$in:user.wishlist,$nin: cartProductIds },isBlocked:false});
        const totalPages = Math.ceil(totalProducts/limit);
   
    if(userId){
        res.render('users/wishlist',{
            user:user,
            wishlist:products,
            currentPage:page,
            totalPages:totalPages,
        })
    }


    } catch (error) {
       next(error);
    }

}

const addToWishlist = async(req,res,next)=>{
    try {
        const productId = req.body.productId;

        const userId = req.session.user;
        const user = await userModel.findById(userId);
        
        const cart = await cartModel.findOne({ userId }).populate({
            path: "products.productId",
            populate: [
                { path: "brand", model: "brand" },
                { path: "category", model: "category" }
            ]
        });

        let specificItem = null;
        if(cart && cart.products.length > 0){
             specificItem = cart.products.find(item =>
                item.productId && item.productId._id.toString() === productId.toString()
            );
        }
      

        if(specificItem){
           
            return res.status(StatusCodes.SUCCESS).json({status:false,message:"Product already in cart!"});
            
        } else if(user.wishlist.includes(productId)){
            return res.status(StatusCodes.SUCCESS).json({status:false,message:"Product already in wishlist!"});
        } 

        user.wishlist.push(productId);
        await user.save();

        return res.status(StatusCodes.SUCCESS).json({status:true,message:'Product added to wishlist'});
    } 
        catch (error) {
        console.log("Error adding products to wishlist",error);
        next(error);
    }
}

const removeFromWishlist = async(req,res,next)=>{
    try {
        const productId = req.query.productId;

        const userId = req.session.user;
        const user = await userModel.findById(userId);

        const index = user.wishlist.indexOf(productId);
         user.wishlist.splice(index,1);

         await user.save();
         console.log("product removed successfully from wishlist");
        return res.status(StatusCodes.SUCCESS).json({success:true, message: "Product removed successfully!" });
    } catch (error) {
        console.error("Error deleting product from wishlist", error);
        next(error);
    }
}
module.exports = {
    wishlist,addToWishlist,removeFromWishlist,
}