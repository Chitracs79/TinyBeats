const categoryModel = require("../models/categoryModel");
const productModel = require("../models/productModel");
const mongoose = require("mongoose");
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");

const categoryInfo = async(req, res) => {
    try {
        
            
        //search
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 6 ;
        const skip = (page -1) * limit;
        let serialNumber = (page - 1) * limit + 1;
        
        let searchFilter = {
            isDeleted: false,
            name: { $regex: search, $options: "i" } , // Case-insensitive search          
            
        };

        const categoryData = await categoryModel.find(searchFilter)
        .sort({createdAt : -1})
        .skip(skip)
        .limit(limit);


        const totalCategories = await categoryModel.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalCategories/limit);

        res.render('admin/category',{
            categories:categoryData,
            currentPage :page,
            totalPages:totalPages,
            totalCategories:totalCategories,
            serialNumber: serialNumber,
            search : search,
        });


    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect('/admin/PageError');
    }
}

//----------------------------add Category-----------------------------------
const addCategory = async(req,res) => {

    const name  = req.body.name.trim().toUpperCase();
    const description = req.body.description;
    try {
       
        const existingCategory = await categoryModel.findOne({name:new RegExp(`^${name}$`, 'i')});
        if(existingCategory){
            return res.status(StatusCodes.BAD_REQUEST).json({error: "Category name already exists ."});
        }
       
        const newCategory = new categoryModel({
            name, description
        })
      
        await newCategory.save();
       
        return res.json({ success: true, message: Messages.CATEGORY_ADDED });

    } catch (error) {
        console.error("Error adding categories ",error)
        res.redirect('/admin/PageError')
    }
}
//----------------------------edit Category-----------------------------------

const updateCategory = async (req, res) => {

        const name  = req.body.name.trim().toUpperCase();
        const description = req.body.description;
    try {
        
        const categoryId = req.params.id;

        if (!name || !description) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.NAME_DESCRIPTION_REQUIRED});
        }

        const existingCategory = await categoryModel.findOne({
            _id:{$ne:categoryId},
            name: { $regex: `^${name}$`, $options: 'i' }
        })
        
        if(existingCategory){
            return res.status(StatusCodes.BAD_REQUEST).json({error:"Category name already exists."})
        }

        await categoryModel.findByIdAndUpdate(categoryId, { name, description });
      
        return res.json({ success: true, message:Messages.CATEGORY_UPDATED_SUCCESSFULLY });

    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR});
    }
};

//-------------------------soft Delete Category --------------------------------------------------------
const softDeleteCategory = async(req,res) => {
    try {
        const categoryId = req.params.id.trim();
       

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message:Messages.CATEGORYID_INVALID });
        }

        const category = await categoryModel.findById(categoryId);
      
        if(!category){
            return res.status(StatusCodes.NOT_FOUND).json({success:false,message :Messages.CATEGORY_NOT_FOUND});
        }

        
        await categoryModel.findByIdAndUpdate(categoryId,{isDeleted:true});
        return res.redirect('/admin/category?message=Category deleted successfully');
        // return res.json({success:true, message:"Category deleted successfully!"});
    } catch (error) {
        console.error("Error soft deleting category",error);
        return res.redirect('/admin/category?error=Failed to delete category');
     
    }
}

const addCategoryOffer = async(req,res,next)=>{
    try {
        const{categoryId,percentage} = req.body;
        
        if (!percentage || !categoryId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              status: false,
              message:Messages.REQUIRED_FIELDS,
            });
          }
      
          if (percentage < 1 || percentage > 100) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              status: false,
              message: Messages. PERCENTAGE_RANGE,
            });
          }
        
          const category = await categoryModel.findById(categoryId);
      
          if(!category){
              return res.status(StatusCodes.NOT_FOUND).json({status:false,message :Messages.CATEGORY_NOT_FOUND});
          }

          const products = await productModel.find({category:categoryId});

          const hasProductsOffer = products.some(
            (product) => product.discount > percentage
          );
          if (hasProductsOffer) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              status: false,
              message:
               Messages.PRODUCT_OFFER_CONFLICT,
            });
          }
          await categoryModel.updateOne({_id:categoryId},{$set:{offer:percentage}});

          for (const product of products) {
            const discountAmount = Math.round((product.basePrice * percentage) / 100);
            product.salesPrice = Math.round(product.basePrice - discountAmount);
            if(product.discount < percentage){
                product.categoryOffer = percentage;  
            }
            
            
            await product.save();
           
          }
          return res.status(StatusCodes.SUCCESS).json({
            status: true,
            message:Messages. OFFER_ADDED_SUCCESSFULLY(percentage),
          });
    } catch (error) {
        
    }
}


const removeCategoryOffer = async(req,res,next)=>{
    try {
        const {categoryId} = req.body;

        if (!categoryId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              status: false,
              message: Messages.CATEGORY_ID_REQUIRED,
            });
          }
        
        const category = await categoryModel.findById(categoryId);
        
        if(!category){
            return res.status(StatusCodes.NOT_FOUND).json({status:false,message : Messages.CATEGORY_NOT_FOUND});
        }

        await categoryModel.updateOne({_id:categoryId},{$set:{offer:0}});

        const products = await productModel.find({category:categoryId})

        for (const product of products) {
            if(product.discount > 0){
                product.salesPrice = Math.round(product.basePrice - ((product.basePrice*product.discount)/100));
                product.categoryOffer = 0;
                
            } else {
                product.salesPrice = product.basePrice; 
                product.categoryOffer = 0;
            }              
            await product.save();
           
          }
          return res.status(StatusCodes.SUCCESS).json({
            status: true,
            message: Messages.OFFER_REMOVED_SUCCESSFULLY,
          });

    } catch (error) {
        next(error);
    }
}
module.exports = {
    categoryInfo,
    addCategory,
    updateCategory ,
    softDeleteCategory,
    addCategoryOffer,
    removeCategoryOffer
}