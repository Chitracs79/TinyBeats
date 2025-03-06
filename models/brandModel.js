const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
    },
    image : {
        type : [String],
        required : false,
    },
    isBlocked : {
        type : Boolean,
        default : false,
    },
    createdAt : {
        type : Date,
        default : Date.now,
    }

})

const Brand = mongoose.model("brand", brandSchema);
module.exports = Brand;