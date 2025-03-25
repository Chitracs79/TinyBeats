const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true,
    },
    products: [{
        productId :{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Products',
            required : true, 
          },
        quantity :{
            type : Number,
            required : true,
            default:1,
            min : 1,
        },
        price : {
            type : Number,
            required : true,
        },
        status: {
            type: String,
            enum: ["placed", "pending", "shipped", "cancelled"], 
            default: "pending",
        },
        cancellationReason : {
            type : "String",
            default : "",
        },
        totalPrice:{
            type : Number,
            required :true,
        }
    }]
},{timestamps:true})

const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart;