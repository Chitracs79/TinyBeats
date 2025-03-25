const categoryModel = require("../models/categoryModel");
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
        .populate("parentCategory")
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
    const {name, description,parentCategory } = req.body;
    console.log(name,description,parentCategory);
    try {
       
        const existingCategory = await categoryModel.findOne({name});
        if(existingCategory){
            return res.status(400).json({error: "Category already exists ."});
        }
       
        const newCategory = new categoryModel({
            name, description,parentCategory: new mongoose.Types.ObjectId(parentCategory) || null
        })
        console.log("new category before save",newCategory)
        await newCategory.save();
        console.log("new category",newCategory)
        return res.json({ success: true, message: "Category added successfully!" });

    } catch (error) {
        console.error("Error adding categories ",error)
        res.redirect('/admin/PageError')
    }
}
//----------------------------edit Category-----------------------------------

const Category = require("../models/categoryModel");

// Edit Category
const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const categoryId = req.params.id;

        if (!name || !description) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        await Category.findByIdAndUpdate(categoryId, { name, description });

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
        console.log(categoryId);

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ success: false, message: "Invalid category ID!" });
        }

        const category = await categoryModel.findById(categoryId);
        console.log("category is",category);
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

module.exports = {
    categoryInfo,
    addCategory,
   updateCategory ,
   softDeleteCategory,
}