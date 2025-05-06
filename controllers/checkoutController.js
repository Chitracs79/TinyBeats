const userModel = require("../models/userModel");
const addressModel = require("../models/addressModel");
const productModel = require("../models/productModel");
const categoryModel= require("../models/categoryModel");
const cartModel = require("../models/cartModel");
const walletModel = require('../models/walletModel');
const Coupon = require("../models/couponModel");
const mongoose = require("mongoose");
const coupon = require("../models/couponModel");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");




const loadCheckoutPage = async (req, res) => {
  try {
      const userId = req.session.user;
      const user = await userModel.findById(userId);
      
        const coupons = await Coupon.find({isListed:true});
      
      const cart = await cartModel.findOne({ userId }).populate({
        path: "products.productId",
        populate: [{
            path: "brand",
            model: "brand"
        }, {
            path: "category",
            model: "category"
        }]
    });
   
      const wallet = await walletModel.findOne({ userId: userId });
        
    //   let transactions = [];
    //   if (wallet) {
    //       transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt);
    //   }

      const addressData = await addressModel.findOne({ userId: userId });

      if (!user) {
          return res.status(StatusCodes.NOT_FOUND).send("User not found");
      }

      // Adjust cart qty based on current product stock
      for (let item of cart.products) {
          if (item.productId && item.quantity > item.productId.stock) {
              item.quantity = item.productId.stock;
              if (item.quantity === 0) {
                 cart.products = cart.products.filter(cartItem => cartItem.productId.toString() !== item.productId.toString());
              }
          }
      }
      await cart.save();

      // Filtering
      const cartItems = cart.products
    .filter(item => 
        item.productId && 
        !item.productId.isBlocked && 
        item.productId.category && 
        !item.productId.category.isDeleted && 
        item.productId.stock > 0
    )
    .map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        totalPrice: item.productId.salesPrice * item.quantity,
    }));
  
      const subtotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
      let grandTotal = 0; 
      if(subtotal < 200){
        grandTotal = subtotal + 50;
      } else {
        grandTotal= subtotal;
      }
     
      if(cartItems.length > 0){
        res.render("users/checkout", {
            user,
            cartItems,
            subtotal,
            grandTotal,
            userAddress: addressData,
            wallet: wallet || { balance: 0 },
            coupons,
        });
      } else {
        res.redirect("/cart")
      }
      
  } catch (error) {
      console.error("Error in loadCheckoutPage:", error);
      res.redirect("/pageNotFound");
  }
};

const  loadCheckoutAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await userModel.findById(userId);
        const userAddress = await addressModel.findOne({userId:userId});
        const address = userAddress?.address?.[0] || {};
        res.render('users/checkoutAddress',{user:user, address: address});
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};



const saveCheckoutAddress = async (req, res) => {
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
                userAddress.address.push({ addressType, name, apartment, building, street, city,
                    landmark, state, country, zip, phone, altPhone });
                await userAddress.save();
             
            }

            res.redirect("/checkout");
        }


    } catch (error) {
        console.log("Error Adding address :", error);
        res.redirect('/pageNotFound');
    }
};
const applyCoupon = async(req,res,next)=>{
    try {
       
       const userId = req.session.user;
       const{couponCode, subtotal} = req.body;

       const coupon  = await Coupon.findOne({name:couponCode,isListed:true});

       if(!coupon){
        return res.json({success:false, message:Messages.INVALID_COUPON_CODE});
       }

       if(coupon.minimumPrice > subtotal){
        return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:Messages. COUPON_MINIMUM_PRICE(coupon.minimumPrice)});
       }

       if(coupon.usedBy.includes(userId)){
        return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:Messages.COUPON_USED_ALREADY});
       }

       let discount = 0;

      if (coupon.offerPrice) {
      discount = coupon.offerPrice;
      }

      else if (coupon.discountPercentage) {
      discount = (subtotal * coupon.discountPercentage) / 100;


      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
     }

       await cartModel.findOneAndUpdate({userId:userId},{$set:{discount:discount}},{new:true});
       res.status(StatusCodes.SUCCESS).json({success:true, message:Messages.COUPON_APPLIED, coupon});
       
    } catch (error) {
        next(error)
    }
}

const removeCoupon = async(req,res,next)=>{
    try {
        const userId = req.session.user;
        await cartModel.findOneAndUpdate({userId:userId},{$set:{discount:0}},{new:true});
        res.status(StatusCodes.SUCCESS).json({success:true,message:Messages.COUPON_REMOVED});
    } catch (error) {
        next(error);
    }
}

 

module.exports = {
    loadCheckoutPage,
    loadCheckoutAddressPage,
    saveCheckoutAddress,
    applyCoupon,removeCoupon,
    
  

};