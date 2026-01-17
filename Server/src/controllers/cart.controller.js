/**
 * Handles shopping cart operations.
 */

const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const { sendSuccess, sendNotFound, sendError } = require('../utils/response');

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.getOrCreateCart(req.user._id);

    return sendSuccess(res, 200, 'Cart retrieved successfully', { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    // Get product
    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return sendNotFound(res, 'Product');
    }

    // Validate variant exists and has stock
    const productVariant = product.variants.find(
      (v) => v.size === variant.size && v.color === variant.color
    );

    if (!productVariant) {
      return sendError(res, 400, 'Selected size/color combination is not available');
    }

    if (productVariant.stock < quantity) {
      return sendError(res, 400, `Only ${productVariant.stock} items available in stock`);
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Determine price (use variant price if exists, otherwise product price)
    const itemPrice = productVariant.price || product.salePrice || product.price;

    // Add item to cart
    cart.addItem({
      product: productId,
      variant: {
        size: variant.size,
        color: variant.color,
        sku: productVariant.sku
      },
      quantity,
      price: itemPrice
    });

    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name slug images price salePrice totalStock'
    });

    return sendSuccess(res, 200, 'Item added to cart', { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendNotFound(res, 'Cart');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return sendNotFound(res, 'Cart item');
    }

    // Check stock if increasing quantity
    if (quantity > item.quantity) {
      const product = await Product.findById(item.product);
      const variant = product.variants.find(
        (v) => v.size === item.variant.size && v.color === item.variant.color
      );

      if (!variant || variant.stock < quantity) {
        return sendError(res, 400, 'Not enough stock available');
      }
    }

    // Update quantity (removes item if quantity is 0)
    cart.updateItemQuantity(itemId, quantity);
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price salePrice totalStock'
    });

    return sendSuccess(res, 200, 'Cart updated', { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:itemId
 * @access  Private
 */
const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendNotFound(res, 'Cart');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return sendNotFound(res, 'Cart item');
    }

    cart.removeItem(itemId);
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price salePrice totalStock'
    });

    return sendSuccess(res, 200, 'Item removed from cart', { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendNotFound(res, 'Cart');
    }

    cart.clearCart();
    await cart.save();

    return sendSuccess(res, 200, 'Cart cleared', { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apply coupon to cart
 * @route   POST /api/cart/apply-coupon
 * @access  Private
 */
const applyCoupon = async (req, res, next) => {
  try {
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendNotFound(res, 'Cart');
    }

    // TODO: Implement coupon validation logic
    // For now, simple percentage discount
    const validCoupons = {
      'FIRST10': 10,
      'SAVE20': 20,
      'DESIGNER15': 15
    };

    const discount = validCoupons[couponCode.toUpperCase()];
    if (!discount) {
      return sendError(res, 400, 'Invalid coupon code');
    }

    // Calculate discount amount
    cart.couponCode = couponCode.toUpperCase();
    cart.discount = Math.round((cart.subtotal * discount) / 100);
    cart.calculateTotals();
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price salePrice totalStock'
    });

    return sendSuccess(res, 200, `Coupon applied! ${discount}% off`, { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/coupon
 * @access  Private
 */
const removeCoupon = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendNotFound(res, 'Cart');
    }

    cart.couponCode = undefined;
    cart.discount = 0;
    cart.calculateTotals();
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price salePrice totalStock'
    });

    return sendSuccess(res, 200, 'Coupon removed', { cart });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
};
