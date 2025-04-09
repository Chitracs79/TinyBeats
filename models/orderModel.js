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
      _id: mongoose.Schema.Types.ObjectId, 
      name: String,
      description: String,
      brand: mongoose.Schema.Types.ObjectId,
      category: mongoose.Schema.Types.ObjectId,
      color: String,
      basePrice: Number,
      salesPrice: Number,
      discount: Number,
      quantity: Number, 
      image: [String],
      status: {
        type: String,
        enum: ["Available", "Out of Stock"]
      },
      isBlocked: Boolean,
    }
    ,
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
    address: {
      addressType: { type: String, required: true },
      name: { type: String, required: true },
      apartment: { type: String, required: true },
      building: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      landmark: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      zip: { type: String, required: true },
      phone: { type: String, required: true },
      altPhone: { type: String, required: true },
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