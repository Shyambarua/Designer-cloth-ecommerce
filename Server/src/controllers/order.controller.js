/**
 * Handles order creation, checkout, and
 * order management for users.
 */

const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const { sendSuccess, sendCreated, sendNotFound, sendError, sendPaginated } = require('../utils/response');
const { parsePaginationParams, calculatePagination } = require('../utils/pagination');

/**
 * @desc    Create order (checkout)
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name images price salePrice variants totalStock'
    });

    if (!cart || cart.items.length === 0) {
      return sendError(res, 400, 'Your cart is empty');
    }

    // Validate stock availability and prepare order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;
      
      // Find variant
      const variant = product.variants.find(
        (v) => v.size === item.variant.size && v.color === item.variant.color
      );

      if (!variant || variant.stock < item.quantity) {
        return sendError(
          res, 
          400, 
          `Insufficient stock for ${product.name} (${item.variant.size}/${item.variant.color})`
        );
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        variant: {
          size: item.variant.size,
          color: item.variant.color,
          sku: item.variant.sku
        },
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      });
    }

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'processing'
      },
      pricing: {
        subtotal: cart.subtotal,
        discount: cart.discount,
        couponCode: cart.couponCode,
        shipping: cart.shipping,
        tax: cart.tax,
        total: cart.total
      },
      notes: {
        customer: notes
      }
    });

    // Reduce stock for each item
    for (const item of cart.items) {
      await Product.updateOne(
        { 
          _id: item.product._id,
          'variants.size': item.variant.size,
          'variants.color': item.variant.color
        },
        { 
          $inc: { 
            'variants.$.stock': -item.quantity,
            totalStock: -item.quantity
          } 
        }
      );
    }

    // Clear user's cart
    cart.clearCart();
    await cart.save();

    // Populate order for response
    await order.populate('user', 'name email');

    return sendCreated(res, 'Order placed successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's orders
 * @route   GET /api/orders
 * @access  Private
 */
const getMyOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status } = req.query;

    const filter = { user: req.user._id };
    if (status) {
      filter.status = status;
    }

    const totalItems = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .select('-notes.internal')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const pagination = calculatePagination(totalItems, page, limit);

    return sendPaginated(res, 'Orders retrieved', orders, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find by order number or ID
    let order;
    if (id.startsWith('ORD-')) {
      order = await Order.findOne({ 
        orderNumber: id, 
        user: req.user._id 
      }).populate('items.product', 'name slug images');
    } else {
      order = await Order.findOne({ 
        _id: id, 
        user: req.user._id 
      }).populate('items.product', 'name slug images');
    }

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    return sendSuccess(res, 200, 'Order retrieved', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ _id: id, user: req.user._id });

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    if (!order.canCancel) {
      return sendError(res, 400, 'This order cannot be cancelled');
    }

    // Cancel order
    order.cancel(reason, req.user._id);

    // Restore stock
    for (const item of order.items) {
      await Product.updateOne(
        { 
          _id: item.product,
          'variants.size': item.variant.size,
          'variants.color': item.variant.color
        },
        { 
          $inc: { 
            'variants.$.stock': item.quantity,
            totalStock: item.quantity
          } 
        }
      );
    }

    await order.save();

    return sendSuccess(res, 200, 'Order cancelled successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track order
 * @route   GET /api/orders/:id/track
 * @access  Private
 */
const trackOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, user: req.user._id })
      .select('orderNumber status statusHistory shipping');

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    return sendSuccess(res, 200, 'Order tracking info', {
      orderNumber: order.orderNumber,
      status: order.status,
      shipping: order.shipping,
      timeline: order.statusHistory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder (copy items to cart)
 * @route   POST /api/orders/:id/reorder
 * @access  Private
 */
const reorder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, user: req.user._id });

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Add items from order to cart
    const unavailableItems = [];
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      
      if (!product || product.status !== 'active') {
        unavailableItems.push(item.name);
        continue;
      }

      const variant = product.variants.find(
        (v) => v.size === item.variant.size && v.color === item.variant.color
      );

      if (!variant || variant.stock < 1) {
        unavailableItems.push(item.name);
        continue;
      }

      const quantity = Math.min(item.quantity, variant.stock);
      const itemPrice = variant.price || product.salePrice || product.price;

      cart.addItem({
        product: product._id,
        variant: item.variant,
        quantity,
        price: itemPrice
      });
    }

    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name slug images price salePrice totalStock'
    });

    const message = unavailableItems.length > 0
      ? `Items added to cart. Some items are unavailable: ${unavailableItems.join(', ')}`
      : 'Items added to cart';

    return sendSuccess(res, 200, message, { cart, unavailableItems });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  trackOrder,
  reorder
};
