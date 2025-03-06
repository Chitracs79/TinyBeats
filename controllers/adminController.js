const userModel = require("../models/userModel");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");


const loadLogin = async(req,res)=>{
    try {
        
        if(req.session.admin){
            return res.redirect('admin/dashboard');
        }
        res.render('admin/login',{message:null});

    } catch (error) {
        console.log("Admin login error",error);

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
            req.session.admin = true;
            return res.redirect('/admin');
        } else {
            return res.redirect('/login');
        }
      } else {
            return res.redirect('/login');
      }
    } catch (error) {
        console.log("Login Error ",error);
        res.redirect('/pageError');
    }
}

//---------------------------------------------------------------------------------------

const loadDashboard = async(req,res) => {
    console.log("Session admin :",req.session.admin);
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
    res.render("admin/PageError");
}


//------------------------------------------------------------------------------------------
const logout = async(req,res) =>{
    try {
        console.log(req.session.admin)
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