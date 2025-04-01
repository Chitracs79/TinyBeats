const { name } = require('ejs');
const mongoose = require('mongoose');
const { schema } = require('./addressModel');

const couponSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true,
        unique: true,
    },
    createdOn:{
        type: Date,
        default: Date.now,
        required:true,
    },
    expireOn:{
        type: Date,
        required:true,
    },
    offerPrice:{
        type:Number,
        required:true,
    },
    minimumPrice:{
        type: Number,
        required:true,
    },
    isList:{
        type: Boolean,
        default:true,
    },
    userId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'users',

    }]
})

const coupon = mongoose.model("coupon", couponSchema);
module.exports = coupon;

