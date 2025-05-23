const Banner = require("../models/bannerModel");
const mongoose = require("mongoose");
const path = require('path');
const fs = require('fs');
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");

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
       res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.BANNER_LOAD_ERROR });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:Messages.INTERNAL_SERVER_ERROR });
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