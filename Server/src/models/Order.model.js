/**
 * Defines the schema for customer orders
 * including items, shipping, payment, and status.
 */

const mongoose = require('mongoose');

// Sub-schema for order items (snapshot at time of order)
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  variant: {
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
});

// Sub-schema for shipping address
const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'India' }
});

// Sub-schema for payment details
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cod', 'card', 'upi', 'netbanking', 'wallet'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: { type: String },
  paidAt: { type: Date }
});

// Main order schema
const orderSchema = new mongoose.Schema(
  {
    // Unique order number
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },

    // Customer who placed the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Order items
    items: [orderItemSchema],

    // Shipping address
    shippingAddress: shippingAddressSchema,

    // Billing address (optional, defaults to shipping)
    billingAddress: shippingAddressSchema,

    // Payment details
    payment: paymentSchema,

    // Order pricing
    pricing: {
      subtotal: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      couponCode: { type: String },
      shipping: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true }
    },

    // Order status
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refunded'
      ],
      default: 'pending'
    },

    // Status history
    statusHistory: [
      {
        status: { type: String, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String }
      }
    ],

    // Shipping details
    shipping: {
      carrier: { type: String },
      trackingNumber: { type: String },
      estimatedDelivery: { type: Date },
      shippedAt: { type: Date },
      deliveredAt: { type: Date }
    },

    // Order notes
    notes: {
      customer: { type: String }, // Note from customer
      internal: { type: String } // Internal admin note
    },

    // Cancellation details
    cancellation: {
      reason: { type: String },
      cancelledAt: { type: Date },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });

// Virtual Properties

// Get total items count
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Check if order can be cancelled
orderSchema.virtual('canCancel').get(function () {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
});

// Pre-save Hook

// Generate order number if not exists
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(6, '0')}`;
  }
  
  // Add to status history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      date: new Date()
    });
  }
  
  next();
});

// Instance Methods

/**
 * Update order status
 * @param {string} newStatus - New status
 * @param {string} note - Optional note
 */
orderSchema.methods.updateStatus = function (newStatus, note) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    date: new Date(),
    note
  });
  
  // Update timestamps for specific statuses
  if (newStatus === 'shipped') {
    this.shipping.shippedAt = new Date();
  } else if (newStatus === 'delivered') {
    this.shipping.deliveredAt = new Date();
  }
  
  return this;
};

/**
 * Cancel order
 * @param {string} reason - Cancellation reason
 * @param {string} cancelledBy - User ID who cancelled
 */
orderSchema.methods.cancel = function (reason, cancelledBy) {
  if (!this.canCancel) {
    throw new Error('Order cannot be cancelled at this stage');
  }
  
  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledAt: new Date(),
    cancelledBy
  };
  
  return this;
};

// Static Methods

/**
 * Get order statistics
 * @returns {Promise<Object>}
 */
orderSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        avgOrderValue: { $avg: '$pricing.total' }
      }
    }
  ]);
  
  return stats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
};

/**
 * Get orders by status
 * @param {string} status - Order status
 * @returns {Promise<Order[]>}
 */
orderSchema.statics.getByStatus = function (status) {
  return this.find({ status })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
