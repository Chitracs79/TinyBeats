const Wallet = require('../models/walletModel');
const User = require('../models/userModel');



const loadWallet = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const search = req.query.search?.trim() || "";
  
      let wallets = [];
      let totalWallets = 0;
  
      if (search) {
        const matchedWallet = await Wallet.findOne({ "transactions.transactionId": search })
          .populate("userId")
          .lean();
  
        if (matchedWallet) {
          const matchedTransaction = matchedWallet.transactions.find(t => t.transactionId === search);
          if (matchedTransaction) {
            wallets.push({
              ...matchedWallet,
              transactions: [matchedTransaction]
            });
          }
          totalWallets = 1;
        } else {
          const matchedUsers = await User.find({
            name: { $regex: new RegExp(search, "i") }
          }).select("_id");
  
          const matchedUserIds = matchedUsers.map(user => user._id);
  
          wallets = await Wallet.find({ userId: { $in: matchedUserIds } })
            .populate("userId")
            .lean();

            wallets.forEach(wallet => {
              wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            });
          totalWallets = wallets.length;
        }
      } else {
        wallets = await Wallet.find()
          .populate("userId")
          .lean();
          wallets.forEach(wallet => {
            wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
          });
        totalWallets = wallets.length;
      }
  
      res.render("admin/wallet", {
        wallets,
        currentPage: page,
        totalPages: 1, 
        search
      });
    } catch (error) {
      next(error);
    }
  };
  
  const loadTransaction = async (req,res,next) => {
    try {
      const transactionId=req.params.id;
    
      const wallet = await Wallet.findOne({
        "transactions.transactionId": transactionId
      }).populate("userId").lean();
  
      const transaction = wallet.transactions.find(
        (data) => data.transactionId === transactionId
      );
       
      res.render('admin/walletTransaction',{wallet,transaction})
    } catch (error) {
      next(error)
    }
    
  }


module.exports={loadWallet,loadTransaction}