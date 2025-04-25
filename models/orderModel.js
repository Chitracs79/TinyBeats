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
      addressType: { type: String, required: function() { return this.status !== 'Pending'; }},
      name: { type: String, required: function() { return this.status !== 'Pending'; } },
      apartment: { type: String, required: function() { return this.status !== 'Pending'; } },
      building: { type: String, required: function() { return this.status !== 'Pending'; }},
      street: { type: String, required: function() { return this.status !== 'Pending'; }},
      city: { type: String, required: function() { return this.status !== 'Pending'; } },
      landmark: { type: String, required: function() { return this.status !== 'Pending'; } },
      state: { type: String, required: function() { return this.status !== 'Pending'; }},
      country: { type: String, required: function() { return this.status !== 'Pending'; }},
      zip: { type: String, required: function() { return this.status !== 'Pending'; }},
      phone: { type: String, required: function() { return this.status !== 'Pending'; }},
      altPhone: { type: String, required: function() { return this.status !== 'Pending'; }},
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','delivered','cancelled','return requested','returned','returning','Failed'],
        default:"Pending",
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
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true, // prevents errors if null
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Failed'
    }
});


const Order = mongoose.model("Order",orderModel);

module.exports = Order;