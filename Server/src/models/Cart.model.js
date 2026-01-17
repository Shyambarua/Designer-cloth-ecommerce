/**
 * Defines the schema for user shopping carts
 * with items, quantities, and pricing.
 */

const mongoose = require('mongoose');

// Sub-schema for cart items
const cartItemSchema = new mongoose.Schema({
  // Reference to the product
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  // Selected variant (size/color)
  variant: {
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String }
  },

  // Quantity of this item
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },

  // Price at time of adding (snapshot)
  price: {
    type: Number,
    required: true
  },

  // Added timestamp
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Main cart schema
const cartSchema = new mongoose.Schema(
  {
    // Owner of the cart
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // One cart per user
    },

    // Cart items
    items: [cartItemSchema],

    // Subtotal (sum of item prices * quantities)
    subtotal: {
      type: Number,
      default: 0
    },

    // Discount amount
    discount: {
      type: Number,
      default: 0
    },

    // Applied coupon code
    couponCode: {
      type: String
    },

    // Shipping cost
    shipping: {
      type: Number,
      default: 0
    },

    // Tax amount
    tax: {
      type: Number,
      default: 0
    },

    // Grand total
    total: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
cartSchema.index({ user: 1 });

// Virtual Properties

// Get total number of items in cart
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Check if cart is empty
cartSchema.virtual('isEmpty').get(function () {
  return this.items.length === 0;
});

// Instance Methods

/**
 * Calculate cart totals
 */
cartSchema.methods.calculateTotals = function () {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // Calculate tax (e.g., 18% GST)
  const taxRate = 0.18;
  this.tax = Math.round(this.subtotal * taxRate * 100) / 100;

  // Calculate shipping (free over ₹999)
  this.shipping = this.subtotal >= 999 ? 0 : 99;

  // Calculate total
  this.total = this.subtotal + this.tax + this.shipping - this.discount;

  return this;
};

/**
 * Add item to cart
 * @param {Object} item - Item to add
 */
cartSchema.methods.addItem = function (item) {
  // Check if item with same variant already exists
  const existingItemIndex = this.items.findIndex(
    (i) =>
      i.product.toString() === item.product.toString() &&
      i.variant.size === item.variant.size &&
      i.variant.color === item.variant.color
  );

  if (existingItemIndex > -1) {
    // Update quantity
    this.items[existingItemIndex].quantity += item.quantity || 1;
  } else {
    // Add new item
    this.items.push(item);
  }

  return this.calculateTotals();
};

/**
 * Update item quantity
 * @param {string} itemId - Cart item ID
 * @param {number} quantity - New quantity
 */
cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.id(itemId);
  
  if (item) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      this.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }
  }

  return this.calculateTotals();
};

/**
 * Remove item from cart
 * @param {string} itemId - Cart item ID
 */
cartSchema.methods.removeItem = function (itemId) {
  this.items.pull(itemId);
  return this.calculateTotals();
};

/**
 * Clear all items from cart
 */
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.couponCode = undefined;
  this.discount = 0;
  return this.calculateTotals();
};

// Static Methods

/**
 * Get or create cart for user
 * @param {string} userId - User ID
 * @returns {Promise<Cart>}
 */
cartSchema.statics.getOrCreateCart = async function (userId) {
  let cart = await this.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'name slug images price salePrice totalStock'
  });

  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
  }

  return cart;
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
