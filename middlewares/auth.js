const userModel = require("../models/userModel");
const mongoose = require('mongoose');

function userAuth(req, res, next) {

    if (req.session.user) {
        userModel.findById(req.session.user)
            .then((data) => {
                if (data && !data.isBlocked) {
                    return next();
                } else {
                    req.session.destroy(() => {
                        return res.redirect("/");
                    });
                }
            })
            .catch(error => {
                console.log("Error in user auth middleware", error);
                return res.status(500).send("Internal Error");
            });
    } else {
        return res.redirect("/signin");
    }
}

const adminAuth = (req, res, next) => {


    if (req.session.admin && mongoose.Types.ObjectId.isValid(String(req.session.admin))) {
        userModel.findById(req.session.admin)
            .then((user) => {
                if (user && user.isAdmin) {
                    req.user = user;
                    return next();
                } else {
                    req.session.destroy(() => {
                        return res.redirect("/admin");
                    });
                }
            })
            .catch(error => {
                console.log("Error in admin Auth middleware", error);
                return res.status(500).send("Internal Server Error");
            });
    } else {
        return res.redirect("/admin");
    }
}
const redirect = async(req,res,next)=>{
    if(req.session.user && req.session){
        console.log(req.session.user);
        return res.redirect('/');
    } 

    next();
}
// for homepage
const isBlocked = async(req,res,next)=>{
 try {
    if(!req.session.user){
        return next()
    }

    const user = await userModel.findById(req.session.user);
    if(!user){
        req.session.user = null;
        return res.redirect("/");
    }

    if(user.isBlocked === true){
        req.session.user = null;
        return res.redirect("/");
    }
    next();
 } catch (error) {
    console.log("Error in isBlocked auth middleware", error);
                return res.status(500).send("Internal Error");
 }
}



module.exports = { userAuth, adminAuth,redirect,isBlocked};
