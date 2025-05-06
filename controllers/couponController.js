const { redirect } = require('../middlewares/auth');
const Coupon = require('../models/couponModel');
const StatusCodes = require("../helpers/StatusCodes");
const Messages = require("../helpers/Message");


const loadCouponPage = async(req,res,next)=>{
    try {
        
        let coupons = await Coupon.find();
        //search
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5 ;
        const skip = (page -1) * limit;
        let serialNumber = (page - 1) * limit + 1;

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
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:Messages.COUPON_DISCOUNT_REQUIRED,
        });
      }
  
      // Validation for discountPercentage with maxDiscountAmount
      if (discountPercentage && !maxDiscountAmount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: Messages.COUPON_MAX_AMOUNT_REQUIRED,
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
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:Messages.COUPON_EXISTS,
        });
      }
  
      const newCoupon = new Coupon(data);
      const savedCoupon = await newCoupon.save();
  
      if (savedCoupon) {
        return res.status(StatusCodes.SUCCESS).json({
          success: true,
          message: Messages.COUPON_ADDED_SUCCESSFULLY,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: Messages.COUPON_ADD_FAILED,
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
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:Messages.COUPON_EXISTS,
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
        return res.status(StatusCodes.SUCCESS).json({
          success: true,
          message: Messages.COUPON_UPDATED_SUCCESSFULLY
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: Messages.COUPON_UPDATE_FAILED,
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
        return res.status(StatusCodes.SUCCESS).json({success:true, message:Messages.COUPON_DELETED})
     } else {
        return res.status(StatusCodes.BAD_REQUEST).json({success:false, message:Messages.COUPON_DELETE_FAILED})
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