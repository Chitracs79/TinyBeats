const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const userModel = require("../models/userModel");
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");



const loadProductpage = async(req,res) => {
    try {
        
            
        //search
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 6 ;
        const skip = (page -1) * limit;
        let serialNumber = (page - 1) * limit + 1;
        
        let searchFilter = {
            isDeleted: false,
            name: { $regex: search, $options: "i" } ,           
            
        };

        const productData = await productModel.find(searchFilter)
        .populate("category", "name") 
        .populate("brand", "name")      
        .skip(skip)
        .limit(limit);


        const totalProducts = await productModel.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalProducts/limit);

        const category = await categoryModel.find({});
        const brand = await brandModel.find({isBlocked:false});
       
        if(category && brand){
            res.render('admin/product',{
                products:productData,
                currentPage :page,
                totalPages:totalPages,
                totalProducts:totalProducts,
                serialNumber: serialNumber,
                search : search,
                category : category,
                brand : brand,
            });
        } else {
            res.redirect('/pageNotFound');
        }
        


    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect('/admin/PageError');
    }
}



const addProductpage = async(req, res)=>{
    try {
        const category = await categoryModel.find({});
        const brand = await brandModel.find({isBlocked:false});
       
        res.render('admin/addProduct',{
            category : category,
            brand : brand,
        }); 
    } catch (error) {
        console.error("Error loading Add Product page:", error);
        res.redirect('/admin/PageError'); 
    }
}


const addProduct = async (req, res) => {
    try {
            
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({error:"No files uploaded!"});
            }

            const products = {...req.body};
           
            const name = req.body.name;
           
            const existProduct = await productModel.findOne({ name: new RegExp(`^${name}$`, "i") });             
    
            if (existProduct) {  
                return res.status(400).json({ success: false, message: "Product already exists, try another name!" });  
            }  
         
            const outputDir = path.join(__dirname, "../public/uploads/re-image"); 
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
          
            let croppedImagePaths = [];
           
            //Handle cropped images sent as Base64
              if (req.body.croppedImages) {
                let croppedImages = Array.isArray(req.body.croppedImages) 
                ? req.body.croppedImages 
                : [req.body.croppedImages]; // array

            for (let i = 0; i < croppedImages.length; i++) {
                let base64Image = croppedImages[i].replace(/^data:image\/png;base64,/, "");
                let buffer = Buffer.from(base64Image, "base64"); 

              

                let filename = `cropped_${Date.now()}_${i}.png`; 
                let filePath = path.join(outputDir, filename);
                

                await sharp(buffer)
                .resize(500, 500) 
                .toFormat("png")
                .toFile(filePath);

                console.log("Cropped and resized image saved:", filePath);

                croppedImagePaths.push(filename);
                
            }
        }
            console.log("Final cropped image paths:", croppedImagePaths); 
       
            const brandData = await brandModel.findOne({name:products.brand})
            if (!brandData) {
                return res.status(400).json({ error: `Brand "${products.brand}" not found` });
              }

            const categoryId = await categoryModel.findOne({name:products.category})
            if(!categoryId){
                return res.status(400).send("Invalid Category name");
            }
       
            const newProduct = new productModel({
                image : croppedImagePaths,
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
                createdOn: new Date()

            });
          
            await newProduct.save();                  
            res.json({ success: true, message: "Product added successfully!" });
       
        
    } catch (error) {
        console.error("Error saving product",error);
        res.redirect('/admin/pageError');
    }
};
//-------------------------------Add Product Offer-----------------------------------------

const addProductOffer = async(req,res)=>{
    try {
    const{percentage,productId} = req.body;
    const product = await productModel.findOne({_id:productId});
   
    const category = await categoryModel.findOne({_id:product.category});
    
    product.salesPrice = product.basePrice - Math.floor(product.basePrice *(percentage/100))
   
    product.discount = parseInt(percentage);
    await product.save();
    res.json({status:true});
    } catch (error) {
        
        res.status(500).json({status:false,message:"Internal Server Error"});
    }
}

const removeProductOffer = async(req,res)=>{
    try {
        const {productId} = req.body;
        const product = await productModel.findOne({_id:productId});
        const percentage = product.discount;

        product.salesPrice = product.basePrice;
        product.discount = 0;
        await  product.save();
        res.json({status:true});
    } catch (error) {
        res.redirect('/pageError');
    }
}

const productBlocked = async(req,res) => {
    try {
        let id = req.query.id;
        await productModel.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}

const productUnblocked = async(req,res) => {
    try {
        let id = req.query.id;
      
        await productModel.updateOne({_id:id},{$set:{isBlocked:false}});
    
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/admin/PageError')
    }
}

const loadEditProductPage = async(req,res) =>{
    try {
        const id = req.query.id;
        const product = await productModel.findOne({_id:id}).populate({path:"brand"}).populate({path:"category"});
        const category = await categoryModel.find({});
        const brand = await brandModel.find({});

        res.render("admin/editProduct",{
            product: product,
            category:category,
            brand:brand
        })

    } catch (error) {
        res.redirect('/pageError');
    }
}

const editProduct = async(req,res,next)=>{
    try {
        const data = {...req.body};
        const productId = req.query.id;

        const product = await productModel.findById(productId);
        if(!product){
            return res.status(404).json({ success: false, message: "Product not found!" });
        }
        
        const existingProduct = await productModel.findOne({name:data.name,_id:{$ne:productId}});
        if(existingProduct){
          return  res.status(400).json({success:false,message:"Product with this name already exists!"});
        }
        //---------------------------------------------------------------------------------------------------
        let croppedImagePaths = [];
           
        //Handle cropped images sent as Base64
        if (req.body.croppedImages) {
            let croppedImages = Array.isArray(req.body.croppedImages) ? req.body.croppedImages : [req.body.croppedImages]; // Ensure it's always an array

        for (let i = 0; i < croppedImages.length; i++) {
            let base64Image = croppedImages[i].replace(/^data:image\/png;base64,/, "");
            let buffer = Buffer.from(base64Image, "base64"); 

            let filename = `cropped_${Date.now()}_${i}.png`; 
            let filePath = path.join(outputDir, filename);
           

                await sharp(buffer)
                .resize(500, 500) // Resize to 500x500 (Change as needed)
                .toFormat("png")
                .toFile(filePath);

                console.log("Cropped and resized image saved:", filePath);
                console.log("Cropped image saved:", filename);

                croppedImagePaths.push(filename);              
            }
        }

        //---------------------------------------------------------------------
        
        const updatedImages = req.files?.map((file)=> file.filename)||[];
       
        const existingImages = product.image;
        const images = [...existingImages,...updatedImages];

        const categoryId = await categoryModel.findOne({name : data.category},{_id:1})
        const brandId = await brandModel.findOne({name:data.brand},{_id:1})

        const updatedFields = {
            name:data.name,
            description : data.description,
            color : data.color,
            brand : brandId,
            category:categoryId,
            basePrice : data.basePrice,
            salesPrice : data.salesPrice,
            stock:data.stock,
            discount:data.discount,    
        }
       
        if(images.length > 0){
            updatedFields.image = images;
        }
        await productModel.findByIdAndUpdate(productId,updatedFields,{new:true});
        return res.status(200).json({success:true,message:"Product updated Successfully!"});
    } catch (error) {
        next(error);
    }
}

const deleteSingleImage = async (req, res) => {
    try {
      const { imageNameToServer, productIdToServer } = req.body;
      const product = await productModel.findByIdAndUpdate(productIdToServer, {
        $pull: { image: imageNameToServer },
      });
      const imagePath = path.join(
        "public",
        "uploads",
        "re-image",
        imageNameToServer
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Image ${imageNameToServer} deleted`);
      } else {
        console.log(`image ${imageNameToServer} not found`);
      }
      res.send({ status: true });
    } catch (error) {
      console.error(error);
      res.redirect("/pageerror");
    }
  };
//-------------------------soft Delete Category --------------------------------------------------------
const softDeleteProducts = async(req,res) => {
    try {
        const productId = req.params.id.trim();
     

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid category ID!" });
        }

        const product = await productModel.findById(productId);
        if(!product){
            return res.status(404).json({success:false,message : "Product not found."});
        }

        await productModel.findByIdAndUpdate(productId,{isDeleted:true});
        return res.json({success:true, message:"Product deleted successfully!"});

    } catch (error) {
        
        console.error("Error soft deleting product",error);
        return res.status(500).json({success:false,message:"Failed to delete category."})
    }
}


module.exports = {
    loadProductpage,
    addProductpage,
    addProduct,
    addProductOffer,removeProductOffer,
    productBlocked,productUnblocked,
    loadEditProductPage,editProduct,deleteSingleImage,
    softDeleteProducts

}