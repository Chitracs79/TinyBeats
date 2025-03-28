const Banner = require("../models/bannerModel");
const mongoose = require("mongoose");
const path = require('path');
const fs = require('fs');

//------------------Loading Banner Page---------------------------
const loadBannerpage = async (req, res) => {
    try {
        let serialNumber = 1;
        const findBanner = await Banner.find({});
        res.render('admin/banner', { 
            banners: findBanner,
            serialNumber:serialNumber, 
        });
    } catch (error) {
       // res.redirect("/pageError");
       res.status(500).json({ success: false, message: "Error loading banner page" });
    }
}

//-----------------------Adding Banner-----------------------------

const addBanner = async(req,res) =>{
    try {
        const banner = req.body;
        const image = req.file;
       
        const newBanner =  new Banner({
            image: image.filename,
            title: banner.title,
            description:  banner.description,
            startDate : new Date(banner.startDate+"T00:00:00"),
            endDate : new Date(banner.endDate+"T00:00:00"),
        })

        await newBanner.save();
        res.json({ success: true, redirectUrl: "/admin/banner" })
        //res.redirect("/admin/banner");
      
    } catch (error) {
        console.error("Error adding banner :",error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again." });
    }
}

//-------------------------Deleting Banner --------------------------------
const deleteBanner = async (req, res) => {
    try {
        const id = req.query.id; 
         await Banner.deleteOne({ _id: id });

        res.redirect("/admin/banner");
    } catch (error) {
        console.error("Error deleting banner:", error);
        res.redirect("/admin/pageError");
    }
};






module.exports = {
    loadBannerpage,
    addBanner,deleteBanner,
}