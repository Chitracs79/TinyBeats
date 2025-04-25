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

const addCoupon = async (req, res, next) => {
    try {
      const {
        couponName,
        startDate,
        endDate,
        offerPrice,
        discountPercentage,
        maxDiscountAmount,
        minimumPrice
      } = req.body;
  
      // Validation for offerPrice or discountPercentage
      if (!offerPrice && !discountPercentage) {
        return res.status(400).json({
          success: false,
          message: "Either offerPrice or discountPercentage is required.",
        });
      }
  
      // Validation for discountPercentage with maxDiscountAmount
      if (discountPercentage && !maxDiscountAmount) {
        return res.status(400).json({
          success: false,
          message: "maxDiscountAmount is required when discountPercentage is provided.",
        });
      }
  
      const data = {
        name: couponName,
        startDate: new Date(startDate + "T00:00:00"),
        expireOn: new Date(endDate + "T00:00:00"),
        offerPrice: offerPrice ? parseInt(offerPrice) : null,
        discountPercentage: discountPercentage ? parseInt(discountPercentage) : null,
        maxDiscountAmount: maxDiscountAmount ? parseInt(maxDiscountAmount) : null,
        minimumPrice: parseInt(minimumPrice),
      };
  
      const existingCoupon = await Coupon.find({
        name: { $regex: `^${data.name}$`, $options: 'i' },
      });
  
      if (existingCoupon.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Coupon with this name already exists.",
        });
      }
  
      const newCoupon = new Coupon(data);
      const savedCoupon = await newCoupon.save();
  
      if (savedCoupon) {
        return res.status(200).json({
          success: true,
          message: "Coupon added successfully!",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Failed to add coupon.",
        });
      }
    } catch (error) {
      next(error);
    }
  };


  const editCoupon = async (req, res, next) => {
    try {
      const couponId = req.query.id;
  
      const name = req.body.name?.trim();
      const startDate = new Date(req.body.createdOn + "T00:00:00");
      const endDate = new Date(req.body.expireOn + "T00:00:00");
      const offerPrice = req.body.offerPrice ? parseFloat(req.body.offerPrice) : null;
      const discountPercentage = req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : null;
      const maxDiscountAmount = req.body.maxDiscountAmount ? parseFloat(req.body.maxDiscountAmount) : null;
      const minimumPrice = parseFloat(req.body.minimumPrice);
  
    
  
      // Check if coupon name already exists
      const existingCoupon = await Coupon.find({
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: couponId },
      });
  
      if (existingCoupon.length > 0) {
        return res.status(400).json({
          success: false,
          message:"Coupon already exists.",
        });
      }
  
      const newCoupon = {
        name,
        createdOn: startDate,
        expireOn: endDate,
        offerPrice: offerPrice || null,
        discountPercentage: discountPercentage || null,
        maxDiscountAmount: discountPercentage ? maxDiscountAmount : null,
        minimumPrice,
      };
  
      const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, newCoupon, {
        new: true,
      });
  
      if (updatedCoupon) {
        return res.status(200).json({
          success: true,
          message: "Coupon updated successfully",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Coupon updation failed",
        });
      }
    } catch (error) {
      next(error);
    }
  };

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