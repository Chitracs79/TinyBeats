const Product = require('../models/productModel');
const User = require('../models/userModel');
const Cart = require("../models/cartModel"); 
const Address = require("../models/addressModel");
const Order = require('../models/orderModel');
const userModel = require('../models/userModel');


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

        const finalAmount=totalPrice + 50;

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
            paymentMethod:paymentMethod,
        });

        await orderModel.save();

        await User.findByIdAndUpdate(userId, { $push: { orders: orderModel._id } }, { new: true });

        const orderedItems = cart.products.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
 
        }));
        for(let i=0;i<orderedItems.length;i++){
            await Product.findByIdAndUpdate(orderedItems[i].product,{$inc:{stock:-orderedItems[i].quantity}});
        }

        await Cart.findOneAndUpdate( { userId }, { $set: { products: [] } } );
        
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
        const userId = req.session.user;
        const user = await User.findById(userId);
        const orders = await Order.find({userId:userId}).populate('orderedItems.product');




        res.render('users/viewOrders',{order:{},user:user,orders:orders});
    } catch (error) {
        
    }
    
}

const loadOrderDetails = async(req,res,next) =>{
    try {

        const userId = req.session.user;
        const user = await User.findById(userId);
        const orderId=req.query.orderId;

        let orders = await Order.findOne({orderId:orderId}).populate('orderedItems.product').lean();
        
        const addressDoc = await Address.findOne({ userId:userId }).lean();


        const userAddress = addressDoc.address.find(addr => addr._id.toString() === orders.address.toString());
        

        orders.address= userAddress;
        console.log(orders)



        res.render("users/orderDetails", {
            order:orders,
            user:user,
          })
    } catch (error) {
        console.error(error);
        next(error)
    }
}

const cancelOrder = async(req,res,next) => {
    try {
        const user= req.session.user;
        const { orderId, reason } = req.body;
        console.log(orderId, reason);
    
       const order= await Order.findById(orderId)
    
        await Order.findOneAndUpdate(
          { _id: orderId },
          {$set: {status: "cancelled",cancelReason: reason,},},{ new: true });
    
    
        const orderedItems = order.orderedItems.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          }));
    
    
          console.log(orderedItems);
          for (let i = 0; i < orderedItems.length; i++) {
            await Product.findByIdAndUpdate(orderedItems[i].product, {
              $inc: { stock: orderedItems[i].quantity },
            });
          }
    
    
        return res
          .status(200)
          .json({ success: true, message: "Order cancelled successfully" });
      } catch (error) {
        next(error);
      }
}

const downloadInvoice =async(req,res,next) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId)

        const orderId=req.query.orderId;
        
        let order = await Order.findOne({orderId:orderId}).populate('orderedItems.product').lean();
        
        const addressDoc = await Address.findOne({ userId: userId }).lean();
        
        const userAddress = addressDoc.address.find((addr) => addr._id.toString() === order.address.toString());
     
        order.address = userAddress

        res.render('users/invoice',{order:order,user:user});

    } catch (error) {
       next(error);
    }
}
module.exports={
    loadConfirmation,
    placeOrder,
    orders,
    loadOrderDetails,
    cancelOrder,
    downloadInvoice,
}