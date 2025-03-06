const userModel = require("../models/userModel");


function userAuth(req, res, next) {
    console.log("Auth Page : Session user is :", req.session.user);
    if (req.session.user) {
        userModel.findById(req.session.user).
            then((data) => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    res.redirect("/signin");
                }
            })
            .catch(error => {
                console.log("Error in user auth middleware", error);
                res.status(500).send("Internal Error");
            });
    } else {
        res.redirect("/signin");
    }
}


const adminAuth = (req,res,next)=>{
    userModel.findOne({isAdmin:true})
    .then((data)=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error =>{
        console.log("Error in admin Auth middleware",error);
        res.status(500).send("Internal Server Error");
    })
}

module.exports = {userAuth,adminAuth} 