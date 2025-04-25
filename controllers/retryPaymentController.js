const Product = require("../models/productModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");

const loadPaymentFailure = async (req, res, next) => {
  try {
    const orderId = req.query.orderId;

    const orderData = await Order.findOne({ razorpayOrderId: orderId });
    console.log("OD",orderData);
    res.render("users/paymentFailure", { order: orderData });
  } catch (error) {
    next(error);
  }
};

const loadRetryPayment = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ orderId: orderId });
    const wallet = await Wallet.findOne({ userId: user._id });
    res.render("users/retryPayment", { user, order: orderData, wallet });
  } catch (error) {
    next(error);
  }
};

const retryPaymentCod = async (req, res, next) => {
  try {
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ orderId: orderId });

    if (orderData.finalAmount > 1000) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: Messages.COD_LIMIT_EXCEEDED });
    }

    const orderedItems = orderData.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { stock: -orderedItems[i].quantity },
      });
    }

    const updateOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Pending",
          paymentMethod: "cod",
        },
      }
    );

    if (updateOrder) {
      return res
        .status(StatusCodes.SUCCESS)
        .json({ success: true, message: Messages.PAYMENT_SUCCESSFUL });
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: true, message: Messages.PAYMENT_FAILED });
    }
  } catch (error) {
    next(error);
  }
};

const retryPaymentWallet = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.orderId;
    console.log(orderId);
    const orderData = await Order.findOne({ orderId: orderId });
    const userData = await User.findById(userId);

    let wallet = await Wallet.findOne({ userId: userId });
    const finalAmount = orderData.finalAmount;
    if (wallet.balance < finalAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: Messages.INSUFFICIENT_WALLET_BALANCE(wallet.balance),
      });
    }

    if (!wallet) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: Messages.WALLET_NOT_FOUND,
      });
    }

    wallet.balance -= parseInt(finalAmount);
    wallet.transactions.push({
      amount: finalAmount,
      type: "debit",
      description: "Deducted for purchase",
      orderId: orderData._id,
    });
    await wallet.save();

    const orderedItems = orderData.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { stock: -orderedItems[i].quantity },
      });
    }

    const updateOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Success",
          paymentMethod: "wallet",
        },
      }
    );

    if (updateOrder) {
      return res
        .status(StatusCodes.SUCCESS)
        .json({ success: true, message: Messages.PAYMENT_SUCCESSFUL });
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: true, message: Messages.PAYMENT_FAILED });
    }
  } catch (error) {
    next(error);
  }
};

const retryPaymentOnline = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const { orderId } = req.body;
  
      const orderData = await Order.findOne({ orderId: orderId });
  
      const options = {
        amount: orderData.finalAmount * 100,
        currency: "INR",
        receipt: `txn_${Date.now()}`,
      };
  
      const order = await razorpay.orders.create(options);
  
      await Order.findOneAndUpdate(
        { orderId },
        { $set: { razorpayOrderId: order.id } }
      );
  
      res.status(200).json({
        id: order.id,
        amount: options.amount,
        currency: options.currency,
        orderId: orderData.orderId,
      });
    } catch (error) {
      next(error);
    }
  };
  

const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false });
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
      return res.status(200).json({ success: false });
    }

    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { $set: { status: "Processing", paymentStatus: "Success" } }
    );

    const orderedItems = order.orderedItems;
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: {stock: -orderedItems[i].quantity },
      });
    }

    res.status(StatusCodes.SUCCESS).json({
      success: true,
      message: Messages.PAYMENT_SUCCESSFUL,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  loadPaymentFailure,
  loadRetryPayment,
  retryPaymentCod,
  retryPaymentWallet,
  retryPaymentOnline,
  verifyPayment,
};