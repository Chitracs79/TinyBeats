const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true,
    },
    description : {
        type : String,
        required : true,
    },
    image : {
        type : String,
        required : false,
    },
    offer : {
        type : Number,
        default : 0,
    },
    isDeleted : {
        type : Boolean,
        default : false,
    },
    createdAt : {
        type : Date,
        default : Date.now,
    }

})

const category = mongoose.model("category", categorySchema);
module.exports = category;