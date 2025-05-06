const Product = require('../models/productModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const Wallet = require('../models/walletModel');
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");


const loadOrderPage = async (req, res) => {
  try {
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

   
    let sortField = req.query.sortField || "createdAt";
    let sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

   
    let filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "userId.name": { $regex: search, $options: "i" } }
      ];
    }

   
    const orders = await Order.find(filter)
      .populate("userId")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/order", {
      orders,
      search,
      currentPage: page,
      totalPages,
      sortField,
      sortOrder,
      status: req.query.status || "all"
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.SUCCESS).send("Internal Server Error");
  }
};



const viewAdminOrderDetails = async(req,res)=>{
    try {
        
      
      
        const orderId = req.query.id;
       
        let orders = await Order.findById(orderId)
          .lean();
          const userId = orders.userId;       
        
        res.render("admin/adminOrderDetails", {
          order: orders,
          
        });
      } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
      }
}
const updateStatus = async(req,res)=>{
  try {
  
    const {orderId,status} = req.body;
    const  order = await Order.findByIdAndUpdate(orderId,{$set:{status:status}},{new:true});

    if(order){
      res.status(StatusCodes.SUCCESS).json({success:true,message:Messages.ORDER_UPDATED_SUCCESSFULLY});
    } else {
      res.status(StatusCodes.NOT_FOUND).json({success:false,message:Messages.ORDER_NOT_FOUND});
    }
    
  } catch (error) {
    
  }
}

const orderCancel = async(req,res)=>{
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

      if (order.paymentMethod != "cod" && order.paymentStatus != 'Failed') {
      let wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        wallet = new Wallet({ userId: order.userId , balance: 0, transactions: [] });
      }

      wallet.balance += parseInt(order.finalAmount);

      wallet.transactions.push({ amount: order.finalAmount, type: "credit", description: "Order Cancellation Refund",orderId:order._id });

      await wallet.save();
    }
    
    await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { status: "cancelled"} },
      { new: true }
    );

    const orderedItems = order.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { stock: orderedItems[i].quantity },
      });
    }

    return res
      .status(200)
      .json({ success: true, message:Messages.ORDER_CANCELLED_SUCCESSFULLY});
  } catch (error) {
    console.error(error);
    res.redirect("/pageError");
  }
}

const handleReturn = async(req,res,next)=>{
  try {
    const { action } = req.body;
    if (action === "approved") {
      const { orderId } = req.body;

      const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { requestStatus: action } },
        { new: true }
      );
      if (order) {
        return res
          .status(200)
          .json({ success: true, message:Messages.RETURN_SUCCESSFUL });
      } else {
        return res
          .status(400)
          .json({ success: false, message:Messages.ORDER_NOT_FOUND});
      }
    } else if (action === "rejected") {
      const { orderId, category, message } = req.body;

      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            requestStatus: action,
            rejectionCategory: category,
            rejectionReason: message,
          },
        },
        { new: true }
      );
      if (order) {
        return res
          .status(200)
          .json({ success: true, message:Messages.RETURN_REQUEST_REJECTED});
      } else {
        return res
          .status(400)
          .json({ success: false, message:Messages.ORDER_NOT_FOUND});
      }
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
}
const updateReturnStatus = async(req,res,next)=>{
  try {
    const { orderId,status} = req.body;
    if (status === "returning") {
    
      const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status: status,updatedAt:new Date()} },
        { new: true }
      );

      
      if (order) {
        return res
          .status(200)
          .json({ success: true, message:Messages.RETURN_SUCCESSFUL });
      } else {
        return res
          .status(400)
          .json({ success: false, message: Messages.ORDER_NOT_FOUND });
      }
    } else if (status === "returned") {
      
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status: status, updatedAt:new Date()          
          },
        },
        { new: true }
      );

      // await Order.findOneAndUpdate(
      //   { _id: orderId },
      //   { $set: { status: "returned"} },
      //   { new: true }
      // );
  
      const orderedItems = order.orderedItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }));
  
     
      for (let i = 0; i < orderedItems.length; i++) {
        await Product.findByIdAndUpdate(orderedItems[i].product, {
          $inc: { stock: orderedItems[i].quantity },
        });
      }

      const orderData = await Order.findById(orderId);
      const userId = orderData.userId;

      let wallet = await Wallet.findOne({ userId: userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += parseInt(orderData.finalAmount);

      wallet.transactions.push({
        amount:orderData.finalAmount,
        type: "credit",
        description: "Order return Refund",
        orderId:orderData._id,
      });

      await wallet.save();
      if (order) {
        return res
          .status(200)
          .json({ success: true, message: Messages.RETURNED_SUCCESSFULLY});
      } else {
        return res
          .status(400)
          .json({ success: false, message: Messages.ORDER_NOT_FOUND});
      }
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  } 
}
module.exports = {
    loadOrderPage,viewAdminOrderDetails,updateStatus,orderCancel,handleReturn,updateReturnStatus,
}