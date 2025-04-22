const { redirect } = require('../middlewares/auth');
const Coupon = require('../models/couponModel');

const loadCouponPage = async(req,res,next)=>{
    try {
        
        let coupons = await Coupon.find();
     

        //search
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5 ;
        const skip = (page -1) * limit;
        let serialNumber = (page - 1) * limit + 1;
        
        // let searchFilter = {
        //     isDeleted: false,
        //     name: { $regex: search, $options: "i" } , // Case-insensitive search          
            
        // };


        for (let coupon of coupons) {
          if (coupon.expireOn < new Date() || coupon.createdOn > new Date()) {
            await Coupon.findByIdAndUpdate(
              coupon._id,
              { $set: { isListed: false } },
              { new: true }
            );
          } else {
            await Coupon.findByIdAndUpdate(
              coupon._id,
              { $set: { isListed: true } },
              { new: true }
            );
          }
        }
    
        const updatedCoupons = await Coupon.find()
        .sort({createdAt : -1})
        .skip(skip)
        .limit(limit);

        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons/limit);

       res.render('admin/coupon',{
        coupons:updatedCoupons,
        currentPage :page,
        totalPages:totalPages,
        totalCoupons:totalCoupons,
        serialNumber: serialNumber,
      
    });

    } catch (error) {

        next(error);

    }
}

const addCoupon = async(req,res,next)=>{
    try {
        const data = {
            name:req.body.couponName,
            startDate:new Date(req.body.startDate+"T00:00:00"),
            endDate:new Date(req.body.endDate+"T00:00:00"),
            offerPrice:parseInt(req.body.offerPrice),
            minimumPrice:parseInt(req.body.minimumPrice)
         }
         const existingCoupon = await Coupon.find({name: data.name});
         if(existingCoupon.length>0){
            return res.status(400).json({success:false, message:"Coupon with this name already exists"})
         }
    
        const newCoupon = new Coupon({
            name:data.name,
            createdOn:data.startDate,
            expireOn:data.endDate,
            offerPrice:data.offerPrice,
            minimumPrice:data.minimumPrice
        })

        const saved = await newCoupon.save();
        if(saved){
            return res.status(200).json({success:true, message:"Coupon added Successfully"});
        }else{
            return res.status(400).json({success:false, message:"Failed to add coupon."}) 
        }
      
    } catch (error) {
        next(error);
    }
}


const editCoupon = async(req,res,next)=>{
    try {
       
       const couponId = req.query.id;

       const data = {
        name:req.body.name,
        startDate:new Date(req.body.createdOn+"T00:00:00"),
        endDate:new Date(req.body.expireOn+"T00:00:00"),
        offerPrice:parseInt(req.body.offerPrice),
        minimumPrice:parseInt(req.body.minimumPrice)
     }
     
     const existingCoupon = await Coupon.find({name: data.name, _id: { $ne: couponId }});
     if(existingCoupon.length>0){
        return res.status(400).json({success:false, message:"Coupon with this name already exists"})
     }

     const newCoupon = {
        name:data.name,
        createdOn:data.startDate,
        expireOn:data.endDate,
        offerPrice:data.offerPrice,
        minimumPrice:data.minimumPrice
    }
    const  updatedCoupon = await Coupon.findByIdAndUpdate(couponId,newCoupon,{new:true});
    if(updatedCoupon){
        return res.status(200).json({success:true,message:"Coupon updated Successfully."})
    } else {
        return res.status(400).json({success:false, message:"Failed to update."})
    }
    } catch (error) {
        next(error);
    }
}

const deleteCoupon = async(req,res,next)=>{
    try {
      
     const couponId = req.query.id;
     const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
     
     if(deletedCoupon){
        return res.status(200).json({success:true, message:"Coupon deleted Successfully."})
     } else {
        return res.status(400).json({success:false, message: "Failed to delete Coupon"})
     }
    } catch (error) {
       next(error) 
    }
}
module.exports = {
    loadCouponPage,
    addCoupon,
    editCoupon,
    deleteCoupon
}