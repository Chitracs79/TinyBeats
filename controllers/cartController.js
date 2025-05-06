const cartModel = require('../models/cartModel');
const userModel = require('../models/userModel');
const productModel = require("../models/productModel")
const brandModel = require("../models/brandModel");
const mongoose = require('mongoose');
const category = require("../models/categoryModel");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user; // Get logged-in user ID
        const user = await userModel.findById(userId);
     

        // Fetch the cart for the user & populate product details
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

        if (!cart || cart.products.length === 0) {
            return res.render("users/cart", { data: [], grandTotal: 0, user: req.session.user });
        }
        if(cart.discount > 0){
            await cartModel.findOneAndUpdate({userId},{$set:{discount:0}});
        }
        
        const cartData = cart.products.filter(item => item.productId &&  item.productId.isBlocked === false)
        .map(item => ({
            productDetails: item.productId, 
            quantity: item.quantity
        }));
        let grandTotal = cart.products.filter(item => item.productId &&  item.productId.isBlocked === false)
        .reduce((acc, item) => {
            return acc + (item.productId?.salesPrice || 0) * item.quantity; 
        }, 0);

        res.render("users/cart", { data: cartData, grandTotal, user: user });


    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server Error");
    }
};

const addToCart = async (req, res) => {
    try {

        const userId = req.session.user;

        const { quantity } = req.body;
        const productId = req.params.productId;
       

        const product = await productModel.findById(productId);
       
        if (!product || product.category.isDeleted) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.PRODUCT_NOT_FOUND });
        }
      

        let cart = await cartModel.findOne({ userId });

        if (cart) {

            const itemIndex = cart.products.findIndex(item => item.productId.toString() === productId);

            if (itemIndex > -1) {
                if((cart.products[itemIndex].quantity + quantity) > product.stock){
                    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.ONLY_STOCK_AVAILABLE(product.stock) }) ; 
                }
                
                if (cart.products[itemIndex].quantity + quantity > 5) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.MAX_CART_LIMIT_REACHED })
                } else {
                    cart.products[itemIndex].quantity += quantity;
                    cart.products[itemIndex].totalPrice =
                        cart.products[itemIndex].quantity * cart.products[itemIndex].price;
                }
            } else {
               
                cart.products.push({
                    productId,
                    quantity,
                    price: product.salesPrice,
                    totalPrice: quantity * product.salesPrice,
                });
            }
        } else {
           
            cart = new cartModel({
                userId,
                products: [
                    {
                        productId,
                        quantity,
                        price: product.salesPrice,
                        totalPrice: quantity * product.salesPrice,
                    },
                ],
            });
        }

        await cart.save();

        const userCart = await userModel.findOne({ _id: userId }, { cart: 1 });

        if (!userCart || userCart.cart.length === 0) {
            await userModel.findByIdAndUpdate(userId, { $set: { cart: [cart._id] } }, { new: true });
        }

        res.status(StatusCodes.SUCCESS).json({ success: true, message:Messages.PRODUCT_ADDED_TO_CART, cart });

    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message:Messages.INTERNAL_SERVER_ERROR });
    }
};

const changeQuantity = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, count } = req.body;

        const cart = await cartModel.findOne({ userId }).populate({
            path: "products.productId",
            populate: [
                { path: "brand", model: "brand" },
                { path: "category", model: "category" }
            ]
        });

        if (!cart) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.CART_NOT_FOUND });
        }

        //  specific item in the cart
        const specificItem = cart.products.find(item =>
            item.productId && item.productId._id.toString() === productId.toString()
        );

        if (!specificItem) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.PRODUCT_NOT_IN_CART });
        }

        // Update the quantity
        specificItem.quantity += count;
        specificItem.totalPrice = specificItem.quantity * specificItem.price;
       
        if (specificItem.quantity < 1) {
            specificItem.quantity = 1;
        }

      
        await cart.save();

       
        const cartData = cart.products.map(item => ({
            productDetails: item.productId,
            quantity: item.quantity
        }));

        let grandTotal = cart.products.reduce((acc, item) => {
            return acc + ((item.productId?.salesPrice || 0) * item.quantity);
        }, 0);

        
        res.status(StatusCodes.SUCCESS).json({
            success: true,
            message:  "Updated successfully",
            cartData,
            grandTotal
        });

    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message:Messages.INTERNAL_SERVER_ERROR });
    }
};

const removeFromCart = async (req, res, next) => {
    try {
        const productId = req.query.productId;
        

        const userId = req.session.user;
        const user = await userModel.findById(userId);

        const cart = await cartModel.findOne({ userId }).populate({
            path: "products.productId",
            populate: [
                { path: "brand", model: "brand" },
                { path: "category", model: "category" }
            ]
        });


        await cartModel.updateOne(
            { userId },
            { $pull: { products: { productId: productId } } }
        );

        return res.status(StatusCodes.SUCCESS).json({ success: true, message: Messages.PRODUCT_REMOVED });
    } catch (error) {
        console.error("Error deleting product from cart", error);
        next(error);
    }
}

const validateCheckout = async (req, res, next) => {
    try {
      const userId = req.session.user;
      const cart = await cartModel.findOne({ userId }).populate("products.productId");
  
      if (!cart || !cart.products.length) {
        return res.status(400).json({ status: false, message:Messages.CART_EMPTY });
      }
  
      for (let item of cart.products) {
        const product = item.productId;
        if (!product || product.isBlocked || product.stock < item.quantity) {
          return res.status(400).json({
            status: false,
            message: `The product "${product?.name || 'Unknown'}" has only ${product.stock} items in stock. Please adjust quantity.`,
          });
        }
      }
  
      return res.status(200).json({ status: true });
  
    } catch (error) {
      next(error);
    }
  };
  
module.exports = {
    loadCart, 
    addToCart, 
    changeQuantity, 
    removeFromCart,
    validateCheckout

}