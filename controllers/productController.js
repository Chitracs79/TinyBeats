const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const userModel = require("../models/userModel");
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");

//--------------------load Product Page--------------------------------------------
const loadProductpage = async(req,res) => {
    try {
        
            
        //search
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4 ;
        const skip = (page -1) * limit;
        let serialNumber = (page - 1) * limit + 1;
        
        let searchFilter = {
            isDeleted: false,
            name: { $regex: search, $options: "i" } , // Case-insensitive search          
            
        };

        const productData = await productModel.find(searchFilter)
        .sort({createdAt : -1})
        .skip(skip)
        .limit(limit);


        const totalProducts = await productModel.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalProducts/limit);

        res.render('admin/product',{
            products:productData,
            currentPage :page,
            totalPages:totalPages,
            totalProducts:totalProducts,
            serialNumber: serialNumber,
            search : search,
        });


    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect('/admin/PageError');
    }
}

//------------------------------Add New Products-----------------------------------------

const addProductpage = async(req, res)=>{
    try {
        const category = await categoryModel.find({});
        const brand = await brandModel.find({isBlocked:false});
       
        res.render('admin/addProduct',{
            category : category,
            brand : brand,
        }); // Renders the Add Product page  
    } catch (error) {
        console.error("Error loading Add Product page:", error);
        res.redirect('/admin/PageError'); 
    }
}
//----------------------------------------------------------------------------------------------

const addProduct = async (req, res) => {
    try {
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).send("No files uploaded!");
        }

        const products = req.body;

        const existProduct = await productModel.findOne({
            name : products.name,    
        })

        console.log("Product Name",products.name);
        if(!existProduct){
            const images = [];
             
            if(req.files && req.files.length>0){
                for(let i = 0; i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:340,height:340}).toFile(resizedImagePath)
                    images.push(req.files[i].filename);
                }
            }
            const brandData = await brandModel.findOne({name:products.brand})
            console.log("brandData",brandData);
            if (!brandData) {
                return res.status(400).json({ error: `Brand "${brand}" not found` });
              }
            const categoryId = await categoryModel.findOne({name:products.category})
            console.log("CategoryId",categoryId);
            if(!categoryId){
                return res.status(400).send("Ivalid Category name");
            }
            console.log("hai");
            const newProduct = new productModel({
                image : images,
                name : products.name,
                description : products.description,
                brand : brandData._id,
                category : categoryId._id,
                color : products.color,
                basePrice : products.basePrice,
                salesPrice : products.salesPrice,
                stock : products.stock,
                discount : products.discount,
                status:'Available',
                createdon: new Date()

            });
            console.log("hello");
            await newProduct.save();
            return res.redirect('/admin/addProduct');
        } else {
            return res.status(400).json("Products already exist")
        }
    } catch (error) {
        console.error("Error saving product",error);
        res.redirect('/admin/pageError');
    }
};

module.exports = {
    loadProductpage,
    addProductpage,
    addProduct,

}