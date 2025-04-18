const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    image : {
        type : [String],
        required :true,
    },
    name : {
        type : String,
        required : true,
        unique : true,
    },
    description: {
        type:String,
        required : true,
    },
    brand : {
         type : mongoose.Schema.Types.ObjectId,
         ref : "brand",
         required : true,
    },
    category : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "category",
        default : null,
    },
    color : {
        type : String,
        required : true,
    },
    basePrice : {
        type : Number,
        required: true,
    },
    salesPrice : {
        type : Number,
        required : true,
    },
    stock : {
        type : Number,
        required :true,
        default : 0,
    },
    discount : {
        type : Number,
        default :  0,
    },
    categoryOffer:{
        type: Number,
        default : 0,
    },
    ratings : {
        type : Number,
        default : false,
    },
    isBlocked : {
        type : Boolean,
        default : false,
    },
    isDeleted : {
        type : Boolean,
        default : false,
    },
    status : {
        type : String,
        enum :["Available" , "Out of Stock"],
        required : true,
        default : "Available"
    },
   
}, {timestamps : true})

const Products = mongoose.model("Products", productSchema);
module.exports = Products;