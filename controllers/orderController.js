const Product = require('../models/productModel');
const User = require('../models/userModel');
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const Coupon = require('../models/couponModel');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const StatusCodes = require('../helpers/StatusCodes');
const Messages = require('../helpers/Message');

const generateOrderId = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const dateString = `${yyyy}${mm}${dd}`;
  return `ORD${dateString}-${randomNumber}`;
};

const placeOrder = async (req, res, next) => {
  try {

    const userId = req.session.user;
    const { addressId, paymentMethod, couponCode } = req.body;

    const addressData = await Address.findOne(
      { userId: userId, "address._id": addressId },
      { "address.$": 1 } 
    ).lean();

    if (!addressData || !addressData.address || addressData.address.length === 0) {
      throw new Error("Address not found");
    }

    const selectedAddress = addressData.address[0];

    const userData = await User.findById(userId);

    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || !cart.products.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.CART_EMPTY});
    }
    
    let cartItems = [];
    for (let item of cart.products) {
      const product = item.productId;
    
      if (!product || product.isBlocked || product.stock < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:Messages.CART_PRODUCT_UNAVAILABLE,
        });
      }
    
      cartItems.push({
        product: product,
        quantity: item.quantity,
        price: item.totalPrice,
      });
    }


    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    let finalAmount = totalPrice < 1000 ? totalPrice + 50 - cart.discount : totalPrice - cart.discount;

    if(finalAmount >= 1000){
      return res.json({success: false,message:Messages.COD_LIMIT_EXCEEDED})
    }

    const invoiceDate = new Date();
    const status = 'Processing';
    const orderId = generateOrderId();

    const orderModel = new Order({
      orderId,
      userId: userId,
      orderedItems: cartItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: selectedAddress,
      invoiceDate: invoiceDate,
      status: status,
      paymentStatus:"Pending",
      paymentMethod: paymentMethod,
      discount: cart.discount,
    });

    await orderModel.save();

    if (couponCode) {
      await Coupon.findOneAndUpdate({ name: couponCode }, { $addToSet: { usedBy: userId } });
    }

    await User.findByIdAndUpdate(userId, { $push: { orders: orderModel._id } }, { new: true });

    const orderedItems = cart.products.map(item => ({
      product: item.productId,
      quantity: item.quantity,

    }));
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product, { $inc: { stock: -orderedItems[i].quantity } });
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { products: [], discount: 0 } });

    return res.status(StatusCodes.SUCCESS).json({ success: true, message:Messages.ORDER_PLACED })
  } catch (error) {
    next(error)
  }
 
}

const placeWalletOrder = async (req, res, next) => {
  try {

    const userId = req.session.user;
    const { addressId, paymentMethod, couponCode } = req.body;


    const addressData = await Address.findOne(
      { userId: userId, "address._id": addressId },
      { "address.$": 1 } // Project only the matching address in the array
    ).lean();

    if (!addressData || !addressData.address || addressData.address.length === 0) {
      throw new Error("Address not found");
    }

    const selectedAddress = addressData.address[0];

    const userData = await User.findById(userId);

    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || !cart.products.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.CART_EMPTY});
    }
    
    let cartItems = [];
    for (let item of cart.products) {
      const product = item.productId;
    
      if (!product || product.isBlocked || product.stock < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Some products in your cart have limited stock or are unavailable. Please update your cart before placing the order.",
        });
      }
    
      cartItems.push({
        product: product,
        quantity: item.quantity,
        price: item.totalPrice,
      });
    }


    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    let finalAmount = totalPrice < 1000 ? totalPrice + 50 - cart.discount : totalPrice - cart.discount;


    const invoiceDate = new Date();

    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.WALLET_NOT_FOUND });
    }

    if (wallet.balance < finalAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.INSUFFICIENT_WALLET_BALANCE})
    }
    wallet.balance -= parseInt(finalAmount);

    

    if (couponCode) {
      await Coupon.findOneAndUpdate({ name: couponCode }, { $addToSet: { usedBy: userId } });
    }

    const status = 'Processing';
    const orderId = await generateOrderId();

    const orderModel = new Order({
      userId: userId,
      orderedItems: cartItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: selectedAddress,
      invoiceDate: invoiceDate,
      status: status,
      paymentStatus:"Success",
      paymentMethod: paymentMethod,
      discount: cart.discount,
      orderId
    });

    const savedOrder = await orderModel.save();

    wallet.transactions.push({ amount: finalAmount, type: "debit", description: "Deducted for purchase ",orderId:savedOrder._id });

    await wallet.save();

    await User.findByIdAndUpdate(userId, { $push: { orders: orderModel._id } }, { new: true });

    const orderedItems = cart.products.map(item => ({
      product: item.productId,
      quantity: item.quantity,

    }));
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product, { $inc: { stock: -orderedItems[i].quantity } });
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { products: [], discount: 0 } });
   
    return res.status(StatusCodes.SUCCESS).json({ success: true, message:Messages.ORDER_PLACED});
  } catch (error) {
    next(error);
  }
}

const createOrder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const {addressId,paymentMethod,couponCode}=req.body;


    const userData = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || !cart.products.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.CART_EMPTY});
    }
    
    let cartItems = [];
    for (let item of cart.products) {
      const product = item.productId;
    
      if (!product || product.isBlocked || product.stock < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: Messages.CART_PRODUCT_UNAVAILABLE,
        });
      }
    
      cartItems.push({
        product: product,
        quantity: item.quantity,
        price: item.totalPrice,
      });
    }

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    let finalAmount = totalPrice < 1000 ? totalPrice + 50 - cart.discount: totalPrice - cart.discount;
   
    const options = {
      amount: finalAmount * 100, 
      currency: "INR",
      receipt: `txn_${Date.now()}`,
    };

    const orderedItems = await Promise.all(
      cart.products.map(async (item) => {
        const product = await Product.findById(item.productId).lean();
    
        return {
          product: {
            _id: product._id,
            name: product.name,
            image: product.image,
            salesPrice: product.salesPrice
          },
          quantity: item.quantity,
          price:item.totalPrice
        };
      })
    );



    const order = await razorpay.orders.create(options);

    const addressData = await Address.findOne(
      { userId: userId, "address._id": addressId },
      { "address.$": 1 } 
    ).lean();
    
    if (!addressData || !addressData.address || addressData.address.length === 0) {
      throw new Error("Address not found");
    }
    
    const selectedAddress = addressData.address[0]; 

    const invoiceDate = new Date();
    const orderId = await generateOrderId();

    const orderSchema = new Order({
      userId: userId,
      orderedItems: orderedItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: selectedAddress,
      invoiceDate: invoiceDate,
      paymentMethod: paymentMethod,
      discount:cart.discount,
      razorpayOrderId:order.id,
      orderId,
      paymentStatus:'Pending',
    });
    await orderSchema.save();

    if(couponCode){
      await Coupon.findOneAndUpdate(
        { name: couponCode },
        { $addToSet: { usedBy: userId } }
      );
    }

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: orderSchema._id } },
      { new: true }
    );


    await Cart.findOneAndUpdate({ userId }, { $set: { products: [],discount:0 } });
    
    res.status(StatusCodes.SUCCESS).json({
      
      id: order.id, 
      amount: options.amount, 
      currency: options.currency,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode >= 500) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        message: Messages.PAYMENT_SERVICE_UNAVAILABLE,
      });
    }
  
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  
  }
};


const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(StatusCodes.SUCCESS).json({ success: false });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(StatusCodes.SUCCESS).json({ success: false });
    }

    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { $set: { status: "Processing", paymentStatus: "Success" } }
    );

    const orderedItems =order.orderedItems
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { stock: - orderedItems[i].quantity },
      });
    }


    res.status(StatusCodes.SUCCESS).json({
      success: true,
      message: Messages.PAYMENT_SUCCESSFUL,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};


  const loadConfirmation = async (req, res) => {
    try {

      const userId = req.session.user;

      const orderData = await User.findById(userId, { orders: 1 }).populate('orders');

      const data = orderData.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const orderId = data[0].orderId
      res.render('users/orderConfirmation', { orderId: orderId })
    } catch (error) {
      console.error(error)
      res.redirect('/pageNotFound')
    }

  }


  const orders = async (req, res, next) => {
    try {
      const userId = req.session.user;
      const user = await User.findById(userId);


      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const skip = (page - 1) * limit;

      const orders = await Order.find({ userId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      const totalOrders = await Order.countDocuments({ userId: userId });
      const totalPages = Math.ceil(totalOrders / limit);

      res.render('users/viewOrders', {
        order: {},
        user: user,
        orders: orders,
        currentPage: page,
        totalPages: totalPages,

      });
    } catch (error) {
      next(error);
    }

  }

const loadOrderDetails = async (req, res, next) => {
  try {

    const userId = req.session.user;
    const user = await User.findById(userId);
    const orderId = req.query.orderId;

   
    const order = await Order.findOne({ orderId: orderId })
    .lean();
    res.render("users/orderDetails", {
      order: order,
      user: user,
    })
  } catch (error) {
    console.error(error);
    next(error)
  }
}

const cancelOrder = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { orderId, reason } = req.body;

    const order = await Order.findById(orderId)
    const items = order.orderedItems;
    let refundAmount = items.filter(item => item.productStatus != "cancelled")
                             . reduce((acc,curr) => acc + curr.price,0) ;


    if (order.paymentMethod != "cod" && order.paymentStatus != 'Failed') {
      let wallet = await Wallet.findOne({ userId: user });
      if (!wallet) {
        wallet = new Wallet({ userId: user, balance: 0, transactions: [] });
      }

      wallet.balance += parseInt(refundAmount);

      wallet.transactions.push({ amount: refundAmount, type: "credit", description: "Order Cancellation Refund",orderId:order._id });

      await wallet.save();
    }
    await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { status: "cancelled", cancelReason: reason, }, }, { new: true });


    const orderedItems = order.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    for (let i = 0; i < orderedItems.length; i++) {
      if(order.orderedItems[i].productStatus != 'cancelled'){
        await Product.findByIdAndUpdate(orderedItems[i].product._id, {
          $inc: { stock: orderedItems[i].quantity },
        });
     }
    }
    
    
    return res
      .status(StatusCodes.SUCCESS)
      .json({ success: true, message:Messages.ORDER_CANCELLED_SUCCESSFULLY});
  } catch (error) {
    next(error);
  }
}

const cancelProduct = async(req,res,next)=>{
  try {
    const {orderId,index,reason} = req.body;
    const userId = req.session.user;

    const order = await Order.findById(orderId);
    let cancelledProduct = order.orderedItems[index];


    if (order.paymentMethod != "cod") {
      let wallet = await Wallet.findOne({ userId: userId });
      if (!wallet) {
        wallet = new Wallet({ userId: userId, balance: 0, transactions: [] });
      }

      wallet.balance += parseInt(cancelledProduct.price);
      wallet.transactions.push({ amount: cancelledProduct.price, type: "credit", description: "Product Cancellation Refund",orderId:order._id });

      await wallet.save();
    }
      
      cancelledProduct.productStatus = 'cancelled';
      order.orderedItems[index] = cancelledProduct;    

      const productId = cancelledProduct.product._id;
      let quantity = cancelledProduct.quantity;
      await Product.findByIdAndUpdate(productId,{$inc:{stock:quantity}})

      let count = 0;
      for(let item of order.orderedItems){
        if(item.productStatus == 'cancelled'){
          count++;
        }
      }
      if(count == order.orderedItems.length){
        order.status = 'cancelled';
      }
      await order.save();
      return res
      .status(StatusCodes.SUCCESS)
      .json({ success: true, message:Messages.PRODUCT_CANCELLED_SUCCESSFULLY});
  
  } catch (error) {
    next(error);
  }
}

const downloadInvoice = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId)

    const orderId = req.query.orderId;

    let order = await Order.findOne({ orderId: orderId }).lean();

    res.render('users/invoice', { order: order, user: user });

  } catch (error) {
    next(error);
  }
}

const requestReturn = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const { orderId, returnReason, returnDescription } = req.body;
    const images = req.files.map((items) => items.filename);

    if (user.orders.includes(orderId)) {
      const order = await Order.findByIdAndUpdate(orderId, {
        $set: {
          status: 'return requested',
          returnReason: returnReason,
          requestStatus: "pending",
          returnDescription: returnDescription,
          returnImage: images,
        }
      })
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.ORDER_NOT_FOUND});
    }

    res.status(StatusCodes.SUCCESS).json({ success: true, message:Messages.RETURN_REQUEST_SUCCESS })
  } catch (error) {
    next(error)
  }
}
const orderSearch = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const search = req.body.query;

    const orders = await Order.find({ orderId: search })

    if (orders && orders.length > 0) {
      return res.render("users/viewOrders", { order: {}, user: user, orders: orders, currentPage: 0, totalPages: 0 });
    } else {
      return res.render("users/viewOrders", { order: {}, user: {}, orders: {}, currentPage: 0, totalPages: 0 });
    }

  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
}

const cancelReturnRequest = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const { orderId } = req.body;


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
        .json({ success: false, message:Messages.ORDER_NOT_FOUND});
    }

    return res.status(StatusCodes.SUCCESS).json({ success: true, message:Messages.RETURN_REQUEST_CANCELLED });
  } catch (error) {
    console.error(error);
    res.render("/pageNotFound");
  }
};


module.exports = {
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
  cancelProduct,
  verifyPayment,
}