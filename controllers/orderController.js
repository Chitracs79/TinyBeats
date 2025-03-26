const Product = require('../models/productModel');
const User = require('../models/userModel');
const Cart = require("../models/cartModel"); 
const Address = require("../models/addressModel");
const Order = require('../models/orderModel');


const placeOrder =async (req,res) => {
    try {
        console.log('--------------------------------------');
       const  userId = req.session.user;
       const {addressId,paymentMethod} = req.body;
       

       const userData = await User.findById(userId);
        
       const cart = await Cart.findOne({ userId });
  

        const cartItems = cart.products.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
            price: item.totalPrice  
        }));
        console.log(cartItems)

        const totalPrice=cartItems.reduce((sum,item)=>sum+item.price,0);
        console.log(totalPrice)

        const finalAmount=totalPrice;

        const invoiceDate = new Date();
        const status = 'Processing';

        const orderModel= new Order({
            userId : userId,
            orderedItems:cartItems,
            totalPrice:totalPrice,
            finalAmount:finalAmount,
            address:addressId,
            invoiceDate:invoiceDate,
            status:status,
        });

        await orderModel.save();

        await User.findByIdAndUpdate(userId, { $push: { orders: orderModel._id } }, { new: true });





        // return res.redirect('/confirmation');
        return res.status(200).json({success:true,message:'hgvjhgv'})
    } catch (error) {
        
    }
    
}



const loadConfirmation = async (req,res) => {
    try {

        const userId = req.session.user;

        const orderData = await User.findById(userId,{orders:1}).populate('orders');

        const data= orderData.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(data)

        const orderId = data[0].orderId
        res.render('users/orderConfirmation',{orderId:orderId})
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
    
}

const orders = async (req,res) => {
    try {
        res.render('users/viewOrders',{order:{},user:{},orders:{}});
    } catch (error) {
        
    }
    
}



module.exports={
    loadConfirmation,
    placeOrder,
    orders
}