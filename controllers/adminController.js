const userModel = require("../models/userModel");
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

const loadDashboard = async(req,res) => {
   
   if(req.session.admin){
    try {
        res.render("admin/dashboard");
    } catch (error) {
        res.redirect("/pageError");
    }
   }
}
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