const brandModel = require('../models/brandModel');
const productModel = require('../models/productModel');
const mongoose = require("mongoose");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");

const getBrandpage = async (req, res) => {
    try {

        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        let serialNumber = (page - 1) * limit + 1;

        let searchFilter = {name: { $regex: search, $options: "i" } };

        const brandData = await brandModel.find(searchFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


        const totalBrands = await brandModel.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalBrands / limit);

        res.render('admin/brand', {
            brands: brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
            serialNumber: serialNumber,
            search: search,
        });
    } catch (error) {
        console.error("Error fetching brands:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:Messages.BRAND_LOAD_ERROR});
    }
}
//-------------------------add Brand-------------------------------------------------
const addBrand = async (req, res) => {
   
    try {

        const { name } = req.body;
        const image = req.file ? req.file.filename : "default.png";
        const findBrand = await brandModel.findOne({ name: new RegExp(`^${name}$`, 'i') });

        if (!findBrand) {
            const newBrand = new brandModel({name,image})
            await newBrand.save();
           
            res.json({ success: true, redirectUrl:"/admin/brand" });
        } else {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.BRAND_ALREADY_EXISTS });
        }
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:Messages.INTERNAL_SERVER_ERROR });
      
    }
}
//-------------------------------brand blocking------------------------------------------

const brandBlocked = async(req,res) => {
    try {
        let id = req.query.id;
        await brandModel.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/brand')
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}


const brandUnblocked = async(req,res) => {
    try {
        let id = req.query.id;
      
        await brandModel.updateOne({_id:id},{$set:{isBlocked:false}});
    
        res.redirect('/admin/brand')
    } catch (error) {
        res.redirect('/admin/PageError')
    }
}

//---------------------------------------------------------------------------------------
module.exports = {
    getBrandpage, addBrand,
    brandBlocked,brandUnblocked,
}