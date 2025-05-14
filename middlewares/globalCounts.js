const Cart = require("../models/cartModel");
const User = require("../models/userModel");

module.exports = async (req, res, next) => {
  try {
    if (req.session.user) {
      const userData = await User.findById(req.session.user).lean();
      const cart = await Cart.findOne({ userId: userData._id }).lean();

      // Extract productIds from cart items
      const cartProductIds = cart
        ? cart.products.map(item => item.productId.toString())
        : [];

      // Wishlist from user data
      const wishlistProductIds = userData.wishlist.map(id => id.toString());

      // Filter out products already in cart
      const filteredWishlist = wishlistProductIds.filter(
        id => !cartProductIds.includes(id)
      );

      // Store counts in res.locals for use in any EJS view
      res.locals.cartCount = cart ? cart.products.length : 0;
      res.locals.wishlistCount = filteredWishlist.length;
    } else {
      res.locals.cartCount = 0;
      res.locals.wishlistCount = 0;
    }

    next();
  } catch (err) {
    console.error("Error in globalCounts middleware:", err);
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    next();
  }
};
