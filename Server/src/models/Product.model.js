/**
 * Defines the schema for products including
 * variants, images, and inventory management.
 */

const mongoose = require('mongoose');

// Sub-schema for product variants (size/color combinations)
const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size']
  },
  color: {
    type: String,
    required: true
  },
  colorCode: {
    type: String, // Hex color code for display
    default: '#000000'
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  price: {
    type: Number // Optional variant-specific price override
  }
});

// Sub-schema for product images
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
});

// Main product schema
const productSchema = new mongoose.Schema(
  {
    // Product name
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },

    // URL-friendly slug
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },

    // Product description
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    // Short description for product cards
    shortDescription: {
      type: String,
      maxlength: [500, 'Short description cannot exceed 500 characters']
    },

    // Base price (before any discounts)
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },

    // Discounted price (if on sale)
    salePrice: {
      type: Number,
      min: [0, 'Sale price cannot be negative']
    },

    // Discount percentage (calculated or fixed)
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // Product category reference
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required']
    },

    // Product brand
    brand: {
      type: String,
      trim: true
    },

    // Product images
    images: [imageSchema],

    // Product variants (size/color)
    variants: [variantSchema],

    // Tags for search and filtering
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],

    // Material/fabric information
    material: {
      type: String,
      trim: true
    },

    // Care instructions
    careInstructions: {
      type: String
    },

    // Total stock (sum of all variants)
    totalStock: {
      type: Number,
      default: 0,
      min: 0
    },

    // Product status
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active'
    },

    // Featured product flag
    isFeatured: {
      type: Boolean,
      default: false
    },

    // New arrival flag
    isNewArrival: {
      type: Boolean,
      default: false
    },

    // Best seller flag
    isBestSeller: {
      type: Boolean,
      default: false
    },

    // Average rating
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    // Number of reviews
    numReviews: {
      type: Number,
      default: 0
    },

    // SEO metadata
    seo: {
      metaTitle: { type: String, maxlength: 70 },
      metaDescription: { type: String, maxlength: 160 },
      keywords: [String]
    },

    // Who created this product
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNewArrival: 1 });

// Virtual Properties

// Check if product is on sale
productSchema.virtual('isOnSale').get(function () {
  return this.salePrice && this.salePrice < this.price;
});

// Get effective price (sale or regular)
productSchema.virtual('effectivePrice').get(function () {
  return this.salePrice && this.salePrice < this.price
    ? this.salePrice
    : this.price;
});

// Check if in stock
productSchema.virtual('inStock').get(function () {
  return this.totalStock > 0;
});

// Get primary image
productSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.images[0]?.url || '';
});

// Pre-save Hooks

// Generate slug from name
productSchema.pre('save', function () {
  // Generate slug from name
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Calculate total stock from variants
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    this.totalStock = this.variants.reduce(
      (sum, variant) => sum + (variant.stock || 0),
      0
    );
  } else {
    // if no variants, keep totalStock as it is OR default to 0
    this.totalStock = this.totalStock || 0;
  }

  // Calculate discount percentage if salePrice exists
  if (this.salePrice && this.price && this.salePrice < this.price) {
    this.discountPercent = Math.round(
      ((this.price - this.salePrice) / this.price) * 100
    );
  } else {
    this.discountPercent = 0;
  }
});


// Static Methods

/**
 * Search products by query
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Product[]>}
 */
productSchema.statics.search = async function (query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    status: 'active',
    ...filters
  };
  
  return this.find(searchQuery)
    .populate('category', 'name slug')
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Get featured products
 * @param {number} limit - Number of products
 * @returns {Promise<Product[]>}
 */
productSchema.statics.getFeatured = function (limit = 8) {
  return this.find({ isFeatured: true, status: 'active' })
    .populate('category', 'name slug')
    .limit(limit)
    .sort({ createdAt: -1 });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
