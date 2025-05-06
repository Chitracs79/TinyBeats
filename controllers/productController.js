const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const userModel = require("../models/userModel");
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const StatusCodes = require('../helpers/StatusCodes');
const Messages = require('../helpers/Message');



const loadProductpage = async (req, res) => {
    try {

        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        let serialNumber = (page - 1) * limit + 1;

        let searchFilter = {
            isDeleted: false,
            name: { $regex: search, $options: "i" },

        };

        const productData = await productModel.find(searchFilter)
            .populate("category", "name")
            .populate("brand", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


        const totalProducts = await productModel.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalProducts / limit);

        const category = await categoryModel.find({});
        const brand = await brandModel.find({ isBlocked: false });

        if (category && brand) {
            res.render('admin/product', {
                products: productData,
                currentPage: page,
                totalPages: totalPages,
                totalProducts: totalProducts,
                serialNumber: serialNumber,
                search: search,
                category: category,
                brand: brand,
            });
        } else {
            res.redirect('/pageNotFound');
        }



    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect('/admin/PageError');
    }
}



const addProductpage = async (req, res) => {
    try {
        const category = await categoryModel.find({});
        const brand = await brandModel.find({ isBlocked: false });

        res.render('admin/addProduct', {
            category: category,
            brand: brand,
        });
    } catch (error) {
        console.error("Error loading Add Product page:", error);
        res.redirect('/admin/PageError');
    }
}


const addProduct = async (req, res) => {
    try {

        if (!req.files || req.files.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "No files uploaded!" });
        }

        const products = { ...req.body };

        const name = req.body.name;

        const existProduct = await productModel.findOne({ name: new RegExp(`^${name}$`, "i") });

        if (existProduct) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.PRODUCT_EXISTS });
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
                    .resize(500, 500, {
                        fit: "cover",
                        kernel: sharp.kernel.lanczos3, // Better quality for resizing
                    })
                    .png({ quality: 100 }) // Optional: max quality for PNG
                    .toFile(filePath);

                console.log("Cropped and resized image saved:", filePath);

                croppedImagePaths.push(filename);

            }
        }
        console.log("Final cropped image paths:", croppedImagePaths);

        const brandData = await brandModel.findOne({ name: products.brand })
        if (!brandData) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: `Brand "${products.brand}" not found` });
        }

        const categoryData = await categoryModel.findOne({ name: products.category }, { _id: 1, offer: 1 });
        if (!categoryData) {
            return res.status(StatusCodes.BAD_REQUEST).send("Invalid Category name");
        }

        let discountAmount;
        if (categoryData.offer > 0) {
            discountAmount = products.basePrice - ((products.basePrice * categoryData.offer) / 100);
        } else {
            discountAmount = products.basePrice;
        }

        const newProduct = new productModel({
            image: croppedImagePaths,
            name: products.name,
            description: products.description,
            brand: brandData._id,
            category: categoryData._id,
            color: products.color,
            basePrice: products.basePrice,
            salesPrice: discountAmount,
            stock: products.stock,
            categoryOffer: categoryData.offer,
            status: 'Available',
            createdOn: new Date()

        });

        await newProduct.save();
        res.json({ success: true, message:Messages.PRODUCT_ADDED_SUCCESSFULLY });


    } catch (error) {
        console.error("Error saving product", error);
        res.redirect('/admin/pageError');
    }
};


const addProductOffer = async (req, res, next) => {
    try {
        const { percentage, productId } = req.body;
        const product = await productModel.findOne({ _id: productId });

        const category = await categoryModel.findOne({ _id: product.category });
        if (category.offer >= percentage) {
            return res.json({ status: false, message:Messages.PRODUCT_HAS_CATEGORY_OFFER(category.offer) })
        }
        product.salesPrice = product.basePrice - Math.floor(product.basePrice * (percentage / 100))

        product.discount = parseInt(percentage);
        await product.save();
        res.json({ status: true });
    } catch (error) {

       next(error);
    }
}

const removeProductOffer = async (req, res,next) => {
    try {
        const { productId } = req.body;
        const product = await productModel.findOne({ _id: productId });
        // const percentage = product.discount;
        product.discount = 0;

        const category = await categoryModel.findById(product.category);
        if (category && category.offer > 0) {
            product.salesPrice = Math.floor(product.basePrice * (1 - category.offer / 100));
        } else {
            product.salesPrice = product.basePrice;
        }
        await product.save();
        res.json({ status: true });
    } catch (error) {
        next(error);
    }
}

const productBlocked = async (req, res, next) => {
    try {
        let id = req.query.id;
        await productModel.updateOne({ _id: id }, { $set: { isBlocked: true } });

        return res.json({ status: true });
    } catch (error) {
       next(error);
    }
}

const productUnblocked = async (req, res, next) => {
    try {
        let id = req.query.id;

        await productModel.updateOne({ _id: id }, { $set: { isBlocked: false } });

        return res.json({ status: true });
    } catch (error) {
        next(error);
    }
}

const loadEditProductPage = async (req, res, next) => {
    try {
        const id = req.query.id;
        const product = await productModel.findOne({ _id: id }).populate({ path: "brand" }).populate({ path: "category" });
        const category = await categoryModel.find({});
        const brand = await brandModel.find({});

        res.render("admin/editProduct", {
            product: product,
            category: category,
            brand: brand
        })

    } catch (error) {
        next(error);
    }
}

const editProduct = async (req, res, next) => {
    try {
        const data = { ...req.body };
        const productId = req.query.id;

        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: Messages.PRODUCT_NOT_FOUND});
        }

        if (data.name && data.name.trim() !== product.name.trim()) {
            const existingProduct = await productModel.findOne({ name: data.name.trim(), _id: { $ne: productId } });
            if (existingProduct) {
                return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.PRODUCT_EXISTS});
            }
        }        
        
        //---------------------------------------------------------------------------------------------------
        const outputDir = path.join(__dirname, "../public/uploads/re-image");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        let croppedImagePaths = [];

        //Handle cropped images sent as Base64
        if (req.body.croppedImages) {
            let croppedImages = Array.isArray(req.body.croppedImages) ? req.body.croppedImages : [req.body.croppedImages];

            for (let i = 0; i < croppedImages.length; i++) {
                let base64Image = croppedImages[i].replace(/^data:image\/png;base64,/, "");
                let buffer = Buffer.from(base64Image, "base64");

                let filename = `cropped_${Date.now()}_${i}.png`;
                let filePath = path.join(outputDir, filename);

                const sharpImage = sharp(buffer);
                const metadata = await sharpImage.metadata();
                
                if (metadata.width > 500 || metadata.height > 500) {
                    await sharpImage
                        .resize({ width: 500, height: 500, fit: "inside" }) // preserves aspect ratio
                        .toFormat("png")
                        .toFile(filePath);
                } else {
                    await sharpImage
                        .toFormat("png")
                        .toFile(filePath);
                }
                

                console.log("Cropped and resized image saved:", filePath);
                console.log("Cropped image saved:", filename);

                croppedImagePaths.push(filename);
            }
        }

        //---------------------------------------------------------------------

        // Get remaining images - ensure we always have an array, even if empty
        let remainingImages = [];
        if (data.remainingImages) {
            remainingImages = Array.isArray(data.remainingImages) 
                ? data.remainingImages 
                : [data.remainingImages];
        }
        
        // If no remaining images were sent in the request, but we're not uploading any new ones,
        // keep the existing images from the product
        const hasNewImages = (req.files && req.files.length > 0) || croppedImagePaths.length > 0;
        
        if (remainingImages.length === 0 && !hasNewImages) {
            // Keep existing images
            remainingImages = product.image;
            console.log("Keeping existing images:", remainingImages);
        }
        
        const updatedImages = req.files?.map((file) => file.filename) || [];
        const allImages = [...remainingImages, ...croppedImagePaths];
        
        console.log('Remaining:', remainingImages);
        console.log('Updated:', updatedImages);
        console.log('Cropped:', croppedImagePaths);
        console.log('All:', allImages);

        // Only require images if we don't have any
        if (allImages.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.IMAGE_UPLOAD_REQUIRED });
        }



        const categoryData = await categoryModel.findOne({ name: data.category }, { _id: 1, offer: 1 })
        const brandId = await brandModel.findOne({ name: data.brand }, { _id: 1 })

        let discountAmount;
        if (categoryData.offer > 0 && categoryData.offer > product.discount) {
            discountAmount = data.basePrice - ((data.basePrice * categoryData.offer) / 100);
        } else if (product.discount > 0) {
            discountAmount = data.basePrice - ((data.basePrice * product.discount) / 100);
        } else {
            discountAmount = data.basePrice
        }


        const updatedFields = {
            name: data.name,
            description: data.description,
            color: data.color,
            brand: brandId,
            category: categoryData._id,
            basePrice: data.basePrice,
            salesPrice: discountAmount,
            stock: data.stock,
            discount: product.discount,
            categoryOffer: categoryData.offer,
            image:allImages,
        }

        await productModel.findByIdAndUpdate(productId, updatedFields, { new: true });
        return res.status(StatusCodes.SUCCESS).json({ success: true, message: Messages.PRODUCT_EDITED_SUCCESSFULLY});
    } catch (error) {
        next(error);
    }
}

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        
        // Validate inputs
        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).json({ status: false, message: "Image name and product ID are required" });
        }
        
        // Find the product first to verify it exists
        const product = await productModel.findById(productIdToServer);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }
        
        // Make sure the image exists in the product
        if (!product.image.includes(imageNameToServer)) {
            return res.status(400).json({ status: false, message: "Image not found in product" });
        }
        
        // Update the product by removing the image from the array
        await productModel.findByIdAndUpdate(productIdToServer, {
            $pull: { image: imageNameToServer },
        });
        
        // Delete the image file if it exists
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
            console.log(`Image ${imageNameToServer} not found in filesystem`);
        }
        
        res.status(200).json({ status: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const softDeleteProducts = async (req, res) => {
    try {
        const productId = req.params.id.trim();


        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.CATEGORYID_INVALID});
        }

        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: Messages.PRODUCT_NOT_FOUND });
        }

        await productModel.findByIdAndUpdate(productId, { isDeleted: true });
        return res.json({ success: true, message: Messages.PRODUCT_DELETED_SUCCESSFULLY });

    } catch (error) {

        console.error("Error soft deleting product", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:Messages.PRODUCT_DELETION_FAILED})
    }
}
const loadInventory = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 7;

        const brand = await brandModel.findOne({ name: { $regex: search, $options: "i" } });
        const category = await categoryModel.findOne({ name: { $regex: search, $options: "i" } });

        const productData = await productModel.find({
            $or: [
                { name: { $regex: search, $options: "i" } },
                { brand: brand ? brand._id : null },
                { category: category ? category._id : null },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("category")
            .populate("brand")
            .exec();

        const count = await productModel.find({
            $or: [
                { name: { $regex: search, $options: "i" } },
                { brand: brand ? brand._id : null },
                { category: category ? category._id : null },
            ],
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        res.render("admin/inventory", {
            product: productData,
            page: page,
            totalPages: totalPages,
            searched: search
        });

    } catch (error) {
        console.error(error);
    }

}

const updateInventory = async (req, res, next) => {
    try {
        const productId = req.query.id;

        const stock = req.body.quantity;

        const newQuantity = await productModel.findByIdAndUpdate(productId, { $set: { stock: stock } }, { new: true });

        if (newQuantity) {
            return res.status(StatusCodes.SUCCESS).json({ success: true, message:Messages.STOCK_UPDATED })
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.STOCK_UPDATE_FAILED })
        }

    } catch (error) {
        next(error)
    }
}

module.exports = {
    loadProductpage,
    addProductpage,
    addProduct,
    addProductOffer, removeProductOffer,
    productBlocked, productUnblocked,
    loadEditProductPage, editProduct, deleteSingleImage,
    softDeleteProducts,
    loadInventory, updateInventory,

}