const userModel = require("../models/userModel");


const customerInfo = async(req,res) => {
    try {
           
        //search
        let search = req.query.search || "";

        //pagination
        let page = parseInt(req.query.page) || 1;
        const limit = 3 ;
        let serialNumber = (page - 1) * limit + 1;

        let searchFilter = {
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } }, // Case-insensitive search
                { email: { $regex: search, $options: "i" } }
            ]
        };
        const userData = await userModel.find(searchFilter)
        .sort({ createdAt: -1 }) // Sort by most recent
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const totalCustomers = await userModel.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalCustomers/limit);
     
        res.render('admin/customer',{
            customers:userData,
            currentPage:page,
            totalPages:totalPages,
            serialNumber:serialNumber,
            search:search,
        })

    } catch (error) {
        console.log("Error loading customers:", error);
        res.redirect('/admin/pageError');
    }
}

const customerBlocked = async(req,res) => {
    try {
        let id = req.query.id;
        await userModel.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/customer')
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}


const customerUnblocked = async(req,res) => {
    try {
        let id = req.query.id;
      
        await userModel.updateOne({_id:id},{$set:{isBlocked:false}});
    
        res.redirect('/admin/customer')
    } catch (error) {
        res.redirect('/admin/PageError')
    }
}

module.exports = {customerInfo,customerBlocked,customerUnblocked}