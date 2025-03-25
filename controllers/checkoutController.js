const userModel = require("../models/userModel");
const addressModel = require("../models/addressModel");
const productModel = require("../models/productModel");
const categoryModel= require("../models/categoryModel");
const cartModel = require("../models/cartModel");
const mongoose = require("mongoose");

// const Coupon = require("../../models/couponModel");
// const Wallet = require("../../models/walletModel");

const loadCheckoutPage = async (req, res) => {
  try {
      const userId = req.session.user;
      const user = await userModel.findById(userId);

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
    console.log(cart);
    //   const wallet = await Wallet.findOne({ userId: userId });
        
    //   let transactions = [];
    //   if (wallet) {
    //       transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt);
    //   }

      const addressData = await addressModel.findOne({ userId: userId });

      if (!user) {
          return res.status(404).send("User not found");
      }

      // Adjust cart quantities based on current product stock
      for (let item of cart.products) {
          if (item.productId && item.quantity > item.productId.stock) {
              item.quantity = item.productId.stock;
              if (item.quantity === 0) {
                 cart.products = cart.products.filter(cartItem => cartItem.productId.toString() !== item.productId.toString());
              }
          }
      }
      await cart.save();

      // Filter out blocked products, unlisted categories, and products with quantity <= 0
      const cartItems = cart.products
    .filter(item => 
        item.productId && 
        !item.productId.isBlocked && 
        item.productId.category && 
        !item.productId.category.isDeleted && // Fixed condition
        item.productId.stock > 0
    )
    .map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        totalPrice: item.productId.salesPrice * item.quantity,
    }));

       console.log(cartItems);   
      const subtotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
      const shippingCharge = 0; // Free shipping
      const grandTotal = subtotal + shippingCharge;

      res.render("users/checkout", {
          user,
          cartItems,
          subtotal,
          shippingCharge,
          grandTotal,
          userAddress: addressData,
          wallet:null,
        //   wallet: wallet || { balance: 0, refundAmount: 0, totalDebited: 0 },
      });
  } catch (error) {
      console.error("Error in loadCheckoutPage:", error);
      res.redirect("/pageNotFound");
  }
};

const  loadCheckoutAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await userModel.findById(userId);
        res.render('users/checkoutAddress',{user:user});
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
            console.log(req.body);
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
                console.log("Address Saved!");
            } else {
                userAddress.address.push({ addressType, name, apartment, building, street, city, landmark, state, country, zip, phone, altPhone });
                await userAddress.save();
                console.log("Appended Address saved!")
            }

            res.redirect("/checkout");
        }


    } catch (error) {
        console.log("Error Adding address :", error);
        res.redirect('/pageNotFound');
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;
        const userId = req.session.user;

        const coupon = await Coupon.findOne({ name: couponCode, isList: true });

        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code' });
        }

        if (new Date() > coupon.expireOn) {
            return res.json({ success: false, message: 'Coupon has expired' });
        }

        if (subtotal < coupon.minimumPrice) {
            return res.json({ success: false, message: `Minimum purchase amount should be ₹${coupon.minimumPrice}` });
        }

        if (coupon.userId.includes(userId)) {
            return res.json({ success: false, message: 'You have already used this coupon' });
        }

        res.json({ success: true, coupon: coupon });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon' });
    }
};


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
   
    applyCoupon,
    checkStock,

};