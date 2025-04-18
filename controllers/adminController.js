const userModel = require("../models/userModel");
const Product = require("../models/productModel");
const Brand = require("../models/brandModel");
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");


const loadLogin = async(req,res,next)=>{
    try {
        
        if(req.session.admin){
            return res.redirect('admin/dashboard');
        }
        res.render('admin/login',{message:null});

    } catch (error) {
        
        next(error);
    }
}
//---------------------------------------------------------------------------------
const login = async(req,res) => {
    try {
      const {email,password} = req.body;
      const admin = await userModel.findOne({email,isAdmin:true}) ;

      if(admin){
        const passwordMatch =  await bcrypt.compare(password, admin.password);
        if(passwordMatch){
            req.session.admin = admin._id.toString();
            return res.redirect('/admin/dashboard');
        } else {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/admin/');
        }
      } else {
        req.flash('error', 'Admin not found');
            return res.redirect('/admin/');
      }
    } catch (error) {
        console.log("Login Error ",error);
        res.redirect('/pageError');
    }
}

//---------------------------------------------------------------------------------------

const getTopBrands = async (matchStage) => {
    const brandStats = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.product.brand",
          totalQuantity: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
  
    const populatedBrands = await Promise.all(
      brandStats.map(async (brand) => {
        const brandDoc = await Brand.findById(brand._id).lean();
        return {
          brandId: brand._id,
          brandName: brandDoc?.name || "Unknown Brand",
          totalQuantity: brand.totalQuantity,
        };
      })
    );
  
    return populatedBrands;
  };
  
  
  const loadDashboard = async (req, res, next) => {
    try {
      const filter = req.query.filter || "monthly";
  
   
      const matchStage = { status: "delivered" };
      const now = new Date();
  
      if (filter === "daily") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchStage.createdAt = { $gte: startOfDay };
      } else if (filter === "weekly") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
        startOfWeek.setHours(0, 0, 0, 0);
        matchStage.createdAt = { $gte: startOfWeek };
      } else if (filter === "monthly") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchStage.createdAt = { $gte: startOfMonth };
      } else if (filter === "yearly") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchStage.createdAt = { $gte: startOfYear };
      }
  
      // Top Products
      const topProducts = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product._id",
            totalSold: { $sum: "$orderedItems.quantity" },
            name: { $first: "$orderedItems.product.name" }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);
  
      // Top Categories
      const topCategories = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product.category",
            totalSold: { $sum: "$orderedItems.quantity" }
          }
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: "$category" },
        {
          $project: {
            name: "$category.name",
            totalSold: 1
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);
  
      // Top Brands
      const topBrands = await getTopBrands(matchStage);
  
      res.render("admin/dashboard", {
        filter,
        topProducts,
        topCategories,
        topBrands
      });
    } catch (error) {
      next(error);
    }
  };
//---------------------------------------------------------------------------------------
const loadPageError = async(req,res) =>{
    res.render("admin/pageError");
}


//------------------------------------------------------------------------------------------
const logout = async(req,res) =>{
    try {
        
        req.session.destroy(err =>{
            
            if(err){
                console.log("Error destroying admin session",err)
                res.redirect("/admin/pageError");
            } 
            console.log("Logout from admin")
            res.redirect("/admin");            
        })
    } catch (error) {
    
        console.log("Unexpected error during logout", error);
        res.redirect("/admin/pageError");
    }
}
module.exports = {
    loadLogin,login,
    loadDashboard,loadPageError,
    logout,
}