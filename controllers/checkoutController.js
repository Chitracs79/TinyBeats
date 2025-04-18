const userModel = require("../models/userModel");
const addressModel = require("../models/addressModel");
const productModel = require("../models/productModel");
const categoryModel= require("../models/categoryModel");
const cartModel = require("../models/cartModel");
const walletModel = require('../models/walletModel');
const Coupon = require("../models/couponModel");
const mongoose = require("mongoose");
const coupon = require("../models/couponModel");




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
          return res.status(404).send("User not found");
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
      console.log(grandTotal);
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
        return res.json({success:false, message:'Invalid coupon code'});
       }

       if(coupon.minimumPrice > subtotal){
        return res.status(400).json({success:false,message:`you need to have items worth ${coupon.minimumPrice} to apply this coupon`});
       }

       if(coupon.usedBy.includes(userId)){
        return res.status(400).json({success:false,message:"You have already used this coupon."});
       }

       await cartModel.findOneAndUpdate({userId:userId},{$set:{discount:coupon.offerPrice}},{new:true});
       res.status(200).json({success:true, message:"Coupon applied", coupon});
       console.log(coupon);
    } catch (error) {
        next(error)
    }
}

const removeCoupon = async(req,res,next)=>{
    try {
        const userId = req.session.user;
        await cartModel.findOneAndUpdate({userId:userId},{$set:{discount:0}},{new:true});
        res.status(200).json({success:true,message:'Coupon removed successfully'});
    } catch (error) {
        next(error);
    }
}

const checkStock = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId).populate({
            path: "cart.productId",
            model: "Product"
        });

        if (!user || !user.cart.length) {
            return res.json({
                success: false,
                message: "Cart is empty"
            });
        }

        const stockChanges = user.cart.map(item => {
            const product = item.productId;
            const requestedQty = item.quantity;
            const availableQty = product.quantity;
            
            return {
                productId: product._id,
                stockChanged: requestedQty > availableQty,
                availableQty: availableQty,
                requestedQty: requestedQty
            };
        });

        // Update cart quantities if needed
        for (const item of stockChanges) {
            if (item.stockChanged) {
                await User.updateOne(
                    { 
                        _id: userId,
                        "cart.productId": item.productId 
                    },
                    {
                        $set: {
                            "cart.$.quantity": item.availableQty
                        }
                    }
                );
            }
        }

        res.json({
            success: true,
            items: stockChanges
        });
    } catch (error) {
        console.error("Error checking stock:", error);
        res.status(500).json({
            success: false,
            message: "Error checking stock availability"
        });
    }
};

module.exports = {
    loadCheckoutPage,
    loadCheckoutAddressPage,
    saveCheckoutAddress,
    applyCoupon,removeCoupon,
    checkStock,

};