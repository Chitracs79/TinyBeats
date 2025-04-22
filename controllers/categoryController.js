const categoryModel = require("../models/categoryModel");
const productModel = require("../models/productModel");
const mongoose = require("mongoose");

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
            return res.status(400).json({error: "Category name already exists ."});
        }
       
        const newCategory = new categoryModel({
            name, description
        })
      
        await newCategory.save();
       
        return res.json({ success: true, message: "Category added successfully!" });

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
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        const existingCategory = await categoryModel.findOne({
            _id:{$ne:categoryId},
            name: { $regex: `^${name}$`, $options: 'i' }
        })
        
        if(existingCategory){
            return res.status(400).json({error:"Category name already exists."})
        }

        await categoryModel.findByIdAndUpdate(categoryId, { name, description });
      
        return res.json({ success: true, message: "Category updated successfully!" });

    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ success: false, message: "Failed to update category." });
    }
};

//-------------------------soft Delete Category --------------------------------------------------------
const softDeleteCategory = async(req,res) => {
    try {
        const categoryId = req.params.id.trim();
       

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ success: false, message: "Invalid category ID!" });
        }

        const category = await categoryModel.findById(categoryId);
      
        if(!category){
            return res.status(404).json({success:false,message : "Category not found."});
        }

        await categoryModel.findByIdAndUpdate(categoryId,{isDeleted:true});
        return res.redirect('/admin/category?message=Category deleted successfully');
        // return res.json({success:true, message:"Category deleted successfully!"});
    } catch (error) {
        console.error("Error soft deleting category",error);
        return res.redirect('/admin/category?error=Failed to delete category');
        // return res.status(500).json({success:false,message:"Failed to delete category."})
    }
}

const addCategoryOffer = async(req,res,next)=>{
    try {
        const{categoryId,percentage} = req.body;
        
        if (!percentage || !categoryId) {
            return res.status(400).json({
              status: false,
              message: "Percentage and category ID are required.",
            });
          }
      
          if (percentage < 1 || percentage > 100) {
            return res.status(400).json({
              status: false,
              message: "Percentage must be between 1 and 100.",
            });
          }
        
          const category = await categoryModel.findById(categoryId);
      
          if(!category){
              return res.status(404).json({status:false,message : "Category not found."});
          }

          const products = await productModel.find({category:categoryId});

          const hasProductsOffer = products.some(
            (product) => product.discount > percentage
          );
          if (hasProductsOffer) {
            return res.status(400).json({
              status: false,
              message:
                "Products within this category already have a product-specific offer greater than the category offer.",
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
          return res.status(200).json({
            status: true,
            message: `Offer of ${percentage}% added successfully.`,
          });
    } catch (error) {
        
    }
}


const removeCategoryOffer = async(req,res,next)=>{
    try {
        const {categoryId} = req.body;

        if (!categoryId) {
            return res.status(400).json({
              status: false,
              message: "category ID is required.",
            });
          }
        
        const category = await categoryModel.findById(categoryId);
        
        if(!category){
            return res.status(404).json({status:false,message : "Category not found."});
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
          return res.status(200).json({
            status: true,
            message: `Offer removed successfully.`,
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