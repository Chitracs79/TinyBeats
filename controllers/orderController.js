const Product = require('../models/productModel');
const User = require('../models/userModel');
const Cart = require("../models/cartModel"); 
const Address = require("../models/addressModel");
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');


const placeOrder =async (req,res) => {
    try {
       
       const  userId = req.session.user;
       const {addressId,paymentMethod} = req.body;
       

       const userData = await User.findById(userId);
        
       const cart = await Cart.findOne({ userId });
  

        const cartItems = cart.products.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
            price: item.totalPrice  
        }));
        console.log(cartItems);
       

        const totalPrice=cartItems.reduce((sum,item)=>sum + item.price,0);
        console.log('tota',totalPrice)
        let finalAmount = 0;
        if(totalPrice < 200){
          finalAmount=totalPrice - cart.discount + 50;
        } else {
          finalAmount = totalPrice - cart.discount;
        }
       

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
            discount:cart.discount,
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

        await Cart.findOneAndUpdate( { userId }, { $set: { products: [],discount:0 } } );
             
        return res.status(200).json({success:true,message:'Order Placed Successfully'})
    } catch (error) {
        
    }
    
}

const placeWalletOrder = async(req,res,next)=>{
  try{

  const userId = req.session.user;
  const {addressId,paymentMethod} = req.body;
       

       const userData = await User.findById(userId);
        
       const cart = await Cart.findOne({ userId });
  

        const cartItems = cart.products.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
            price: item.totalPrice  
        }));
       

        const totalPrice=cartItems.reduce((sum,item)=>sum + item.price,0);
        let finalAmount = 0;
        if(totalPrice < 200){
          finalAmount=totalPrice + 50- cart.discount;
        } else {
          finalAmount = totalPrice- cart.discount;
        }
        console.log(totalPrice);
        const invoiceDate = new Date();

        const wallet = await Wallet.findOne({userId:userId});
            if(!wallet){
                return res.status(400).json({success:false,message:"Wallet not found"});
            }  

            if(wallet.balance < finalAmount){
              return res.status(400).json({success:false,message:"Insufficient Balance"})
            }
            wallet.balance -= parseInt(finalAmount);
  
            wallet.transactions.push({ amount:finalAmount, type: "debit", description: "Deducted for purchase " });
    
            await wallet.save();

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
                discount:cart.discount,
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
    
            await Cart.findOneAndUpdate( { userId }, { $set: { products: [] ,discount:0} } );
            console.log("Final",finalAmount);     
            return res.status(200).json({success:true,message:'Order Placed Successfully'});
          } catch(error){
            next(error);
          }
}

const createOrder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    

    const userData = await User.findById(userId);
    const cart = await Cart.findOne({ userId });

    const cartItems = cart.products.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.totalPrice,
    }));

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    let finalAmount = totalPrice < 200 ? totalPrice + 50 - cart.discount : totalPrice- cart.discount;

    const options = {
      amount: finalAmount * 100, 
      currency: "INR",
      receipt: `txn_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    
    res.status(200).json({
      id: order.id, 
      amount: options.amount, 
      currency: options.currency,
    });
  } catch (error) {
    next(error);
  }
};


const verifyPayment = async (req, res, next) => {
  try {
   
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const { addressId, paymentMethod } = req.body;
    console.log(addressId,paymentMethod);
    const userId = req.session.user;
     
    
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

       const userData = await User.findById(userId);
        
       const cart = await Cart.findOne({ userId });
  

        const cartItems = cart.products.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
            price: item.totalPrice  
        }));
        console.log(cartItems);
       

        const totalPrice=cartItems.reduce((sum,item)=>sum + item.price,0);
        console.log('tota',totalPrice)
        let finalAmount = 0;
        if(totalPrice < 200){
          finalAmount=totalPrice + 50- cart.discount;
        } else {
          finalAmount = totalPrice- cart.discount;
        }
       

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
            discount:cart.discount,
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

        await Cart.findOneAndUpdate( { userId }, { $set: { products: [] ,discount:0} } );


    res.status(200).json({ success: true, message: "Payment successful" });
  } catch (error) {
    next(error);
  }
};

const loadConfirmation = async (req,res) => {
    try {

        const userId = req.session.user;

        const orderData = await User.findById(userId,{orders:1}).populate('orders');

        const data= orderData.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const orderId = data[0].orderId
        res.render('users/orderConfirmation',{orderId:orderId})
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
    
}

const orders = async (req,res,next) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const orders = await Order.find({userId:userId})
        .populate('orderedItems.product')
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalOrders = await Order.countDocuments({userId:userId});
        const totalPages = Math.ceil(totalOrders/limit);

        res.render('users/viewOrders',{
            order:{},
            user:user,
            orders:orders,
            currentPage:page,
            totalPages:totalPages,

        });
    } catch (error) {
        next(error);
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
    
       const order= await Order.findById(orderId)
      if(order.paymentMethod != "cod"){
       const wallet = await Wallet.findOne({userId:user});
            if(!wallet){
                return res.status(400).json({success:false,message:"Wallet not found"});
            }  

            wallet.balance += parseInt(order.finalAmount);
  
            wallet.transactions.push({ amount:order.finalAmount, type: "credit", description: "Order Cancellation Refund" });
    
            await wallet.save();
          }
        await Order.findOneAndUpdate(
          { _id: orderId },
          {$set: {status: "cancelled",cancelReason: reason,},},{ new: true });
          
    
        const orderedItems = order.orderedItems.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          }));
    
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

const requestReturn = async(req,res,next) =>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);

        const{orderId,returnReason,returnDescription} = req.body;
        const images = req.files.map((items) => items.filename);

        if(user.orders.includes(orderId)){
            const order = await Order.findByIdAndUpdate(orderId,{
                $set:{
                    status:'return requested',
                    returnReason:returnReason,
                    requestStatus:"pending",
                    returnDescription:returnDescription,
                    returnImage:images,
                }
            }) 
        } else {
            return res.status(400).json({success:false, message:"No order found!"});
        }
        
        res.status(200).json({success: true, message: "Return request successfull."})
    } catch (error) {
        next(error)
    }
}
const orderSearch = async(req,res,next) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const search= req.body.query;
        
    
        const orders = await Order.find({ orderId: search }).populate(
          "orderedItems.product"
        );
        if(orders){
         return res.render("users/viewOrders", { order: {}, user: user, orders: orders ,currentPage:0,totalPages:0});
        }else{
          return res.render("users/viewOrders", { order: {}, user: {}, orders: {},currentPage:0,totalPages:0 });
        }
        
      } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
      }
}

const cancelReturnRequest = async (req, res, next) => {
    try {
        const userId = req.session.user;
        const { orderId} = req.body;
    
    
        const user = await User.findById(userId);
    
        if (user.orders.includes(orderId)) {
          await Order.findByIdAndUpdate(orderId, {
            $set: {
              status: 'delivered',
              requestStatus: '',
              returnReason: '',
              returnDescription: '',
              returnImage: [],
            },
          });
          
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Order not Found" });
        }
    
        return res.status(200).json({ success: true, message: "return request cancelled" });
      } catch (error) {
        console.error(error);
        res.render("/pageNotFound");
      }
};


module.exports={
    loadConfirmation,
    placeOrder,
    orders,
    loadOrderDetails,
    cancelOrder,
    downloadInvoice,
    requestReturn,
    orderSearch,
    cancelReturnRequest,
    placeWalletOrder,
    createOrder,
    verifyPayment ,
}