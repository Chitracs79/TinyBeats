const Product = require('../models/productModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const userModel = require('../models/userModel');
const Address = require('../models/addressModel');


const loadOrderPage = async(req,res)=>{
   try {
    const orders = await Order.find().populate('userId').sort({createdAt:-1})
    res.render('admin/order',{orders:orders,search:"",currentPage:1,totalPages:1});
   } catch (error) {
    
   }
}

const viewAdminOrderDetails = async(req,res)=>{
    try {
        
      
      
        const orderId = req.query.id;
       
        let orders = await Order.findById(orderId)
          .populate("orderedItems.product")
          .populate("userId")
          .lean();
          const userId = orders.userId;
          const addressDoc = await Address.findOne({ userId:userId }).lean();
         

          const userAddress = addressDoc.address.find(addr => addr._id.toString() === orders.address.toString());
          
  
          orders.address= userAddress;
    
       
        
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
      res.status(200).json({success:true,message:"Order updated successfully!"});
    } else {
      res.status(400).json({success:false,message:"Order not found"});
    }
    
  } catch (error) {
    
  }
}

const orderCancel = async(req,res)=>{
  try {
    const { orderId } = req.body;
    console.log(orderId);

    const order = await Order.findById(orderId);

    await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { status: "cancelled"} },
      { new: true }
    );

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
    console.error(error);
    res.redirect("/pageError");
  }
}

module.exports = {
    loadOrderPage,viewAdminOrderDetails,updateStatus,orderCancel
}