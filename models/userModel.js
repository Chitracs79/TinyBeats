const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    
    name: {
        type : String,
        required : true
    },
    email: {
        type : String,
        required : true,
        unique : true
    },
    phone:{
        type : String,
        required : false,
        unique:true,
        sparse:true,
        default:null,
    },
    password: {
        type: String,
        required:false
    },
    googleId:{
        type : String,
        unique : true,
        sparse:true,
        default:null,
    },
    isAdmin:{
        type : Boolean,
        default:false,
    },
    isBlocked:{
        type:Boolean,
       default:false,
    },
    profileImage: { 
        type: String, 
        default: "/images/default-profile.png" 
    },
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Wishlist",
    }],
    cart:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Cart"
    }]
});

module.exports = mongoose.model('users',userSchema);