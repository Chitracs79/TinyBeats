const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderModel = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  userId:{
    type : Schema.Types.ObjectId,
    required : true,
    ref: 'users'
  },
  orderedItems: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: "Products",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:'users',
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','delivered','cancelled','return requested','returned','returning']
    },
    requestStatus:{
      type:String,
      enum:["pending","approved","rejected"],
    },
    cancelReason:{
      type : String,
    },
    createdAt:{
        type:Date,
        default:Date.now,
        required:true
    },
    deliveredAt:{
      type:Date,
      default:Date.now,
      required:false,
  },
    paymentMethod:{
      type: String,
      required:true,
      enum:['cod','wallet','online payment']
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    returnReason : {
      type: String,
    },
    returnDescription: {
      type: String,
    },
    returnImage:{
      type:[{type:String}]
    },
    rejectionCategory:{
      type:String
    },
    rejectionReason:{
      type:String
    },
    updatedAt:{
      type:Date,
    },
    
});


const Order = mongoose.model("Order",orderModel);

module.exports = Order;