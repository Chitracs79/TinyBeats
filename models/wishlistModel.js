const mongoose = require('mongoose');

const wishlistScehma = new mongoose.Schema({

    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true,
    },
    products:[
       {
        productsId : {
           type:mongoose.Schema.Types.ObjectId,
           ref:'Products',
           required : true, 
         },

         addedAt:{
            type: Date,
            default:Date.now,
         }
       }
    ]
},{timestamps:true});

const Wishlist = mongoose.model('Wishlist',wishlistScehma);
module.exports = Wishlist;