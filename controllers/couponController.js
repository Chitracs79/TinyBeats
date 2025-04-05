const { redirect } = require('../middlewares/auth');
const Coupon = require('../models/couponModel');

const loadCouponPage = async(req,res,next)=>{
    try {
        
        let coupons = await Coupon.find();
        console.log(coupons);

        for (let coupon of coupons) {
          if (coupon.expireOn < new Date() || coupon.createdOn > new Date()) {
            await Coupon.findByIdAndUpdate(
              coupon._id,
              { $set: { isList: false } },
              { new: true }
            );
          } else {
            await Coupon.findByIdAndUpdate(
              coupon._id,
              { $set: { isList: true } },
              { new: true }
            );
          }
        }
    
        const updatedCoupons = await Coupon.find();


       res.render('admin/coupon',{serialNumber:1,coupons:updatedCoupons});

    } catch (error) {

        next(error);

    }
}

const addCoupon = async(req,res,next)=>{
    try {
        const data = {
            name:req.body.name,
            startDate:new Date(req.body.createdOn+"T00:00:00"),
            endDate:new Date(req.body.expireOn+"T00:00:00"),
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