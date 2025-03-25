const brandModel = require('../models/brandModel');
const productModel = require('../models/productModel');
const mongoose = require("mongoose");

const getBrandpage = async (req, res) => {
    try {

        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        let serialNumber = (page - 1) * limit + 1;

        let searchFilter = {name: { $regex: search, $options: "i" } };

        const brandData = await brandModel.find(searchFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        console.log("BrandData in brandcontroller is ",brandData);

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
        res.status(500).json({ success: false, message: "Error getting brand page" });
    }
}
//-------------------------add Brand-------------------------------------------------
const addBrand = async (req, res) => {
   
    try {

        const { name } = req.body;
        const image = req.file ? req.file.filename : "default.png";
        const findBrand = await brandModel.findOne({ name });

        if (!findBrand) {
            const newBrand = new brandModel({name,image})
            await newBrand.save();
            // res.redirect('admin/brand')
            res.json({ success: true, redirectUrl:"/admin/brand" });
        } else {
            res.status(400).json({ success: false, message: "Brand already exists!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
        // res.redirect('/admin/pageError');
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