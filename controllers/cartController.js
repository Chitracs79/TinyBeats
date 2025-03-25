const cartModel = require('../models/cartModel');
const userModel = require('../models/userModel');
const productModel = require("../models/productModel")
const brandModel = require("../models/brandModel");
const mongoose = require('mongoose');
const category = require("../models/categoryModel");

// getting cart
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user; // Get logged-in user ID
        const user = await userModel.findById(userId);
        console.log("TestUser", user);

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

        // Format cart data for EJS rendering
        const cartData = cart.products.filter(item => item.productId &&  item.productId.isBlocked === false)
        .map(item => ({
            productDetails: item.productId, // Correct access
            quantity: item.quantity
        }));
        let grandTotal = cart.products.filter(item => item.productId &&  item.productId.isBlocked === false)
        .reduce((acc, item) => {
            return acc + (item.productId?.salesPrice || 0) * item.quantity; // Prevent undefined error
        }, 0);

        res.render("users/cart", { data: cartData, grandTotal, user: user });


    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).send("Server Error");
    }
};

const addToCart = async (req, res) => {
    try {

        const userId = req.session.user;

        const { quantity } = req.body;
        const productId = req.params.productId;
        console.log("TestProductId", productId);

        const product = await productModel.findById(productId);
        console.log("TestProduct", product);
        if (!product || product.category.isDeleted) {
            return res.status(404).json({ message: "Product not found" });
        }
        console.log("ProductStock",product.stock);

        let cart = await cartModel.findOne({ userId });

        if (cart) {

            const itemIndex = cart.products.findIndex(item => item.productId.toString() === productId);

            if (itemIndex > -1) {
                if((cart.products[itemIndex].quantity + quantity) > product.stock){
                    return res.status(400).json({ success: false, message: `We have only ${product.stock} in stock` }) ; 
                }
                
                if (cart.products[itemIndex].quantity + quantity > 5) {
                    return res.status(400).json({ success: false, message: "You have reached the maximum limit for this product in your cart." })
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

        res.status(200).json({ success: true, message: "Product added to cart", cart });

    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal server error" });
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
            return res.status(404).json({ message: "Cart not found" });
        }

        // Find the specific item in the cart
        const specificItem = cart.products.find(item =>
            item.productId && item.productId._id.toString() === productId.toString()
        );

        if (!specificItem) {
            return res.status(404).json({ message: "Product not found in cart" });
        }

        // Update the quantity
        specificItem.quantity += count;

        // Ensure the quantity is at least 1
        if (specificItem.quantity < 1) {
            specificItem.quantity = 1;
        }

        // Save the updated cart
        await cart.save();

        // Prepare data for rendering
        const cartData = cart.products.map(item => ({
            productDetails: item.productId,
            quantity: item.quantity
        }));

        let grandTotal = cart.products.reduce((acc, item) => {
            return acc + ((item.productId?.salesPrice || 0) * item.quantity);
        }, 0);

        // Send a JSON response or render the cart page
        res.status(200).json({
            success: true,
            message: "Updated successfully",
            cartData,
            grandTotal
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const removeFromCart = async (req, res, next) => {
    try {
        const productId = req.query.productId;
        console.log("TestProductId", productId);

        const userId = req.session.user;
        const user = await userModel.findById(userId);

        const cart = await cartModel.findOne({ userId }).populate({
            path: "products.productId",
            populate: [
                { path: "brand", model: "brand" },
                { path: "category", model: "category" }
            ]
        });


        // Find the specific item in the cart

        await cartModel.updateOne(
            { userId },
            { $pull: { products: { productId: productId } } }
        );


        console.log("product removed successfully from cart");
        return res.status(200).json({ success: true, message: "Product removed successfully!" });
    } catch (error) {
        console.error("Error deleting product from cart", error);
        next(error);
    }
}

module.exports = {
    loadCart, addToCart, changeQuantity, removeFromCart,

}