/**
 * Defines the schema for product categories
 * with support for hierarchical structure.
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    // Category name
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters']
    },

    // URL-friendly slug
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },

    // Category description
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Category image/banner
    image: {
      type: String,
      default: ''
    },

    // Parent category for hierarchical structure
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },

    // Category status
    isActive: {
      type: Boolean,
      default: true
    },

    // Display order
    sortOrder: {
      type: Number,
      default: 0
    },

    // SEO metadata
    seo: {
      metaTitle: { type: String, maxlength: 70 },
      metaDescription: { type: String, maxlength: 160 }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });

// Virtual Properties

// Get child categories
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Get products count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Pre-save Hook

// Generate slug from name
categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Static Methods

/**
 * Get category tree (hierarchical structure)
 * @returns {Promise<Category[]>}
 */
categorySchema.statics.getTree = async function () {
  const categories = await this.find({ isActive: true })
    .populate('children')
    .sort({ sortOrder: 1 });
  
  // Return only root categories (with children populated)
  return categories.filter((cat) => !cat.parent);
};

/**
 * Get category with ancestors
 * @param {string} categoryId - Category ID
 * @returns {Promise<Category[]>} Array of ancestors from root to category
 */
categorySchema.statics.getWithAncestors = async function (categoryId) {
  const ancestors = [];
  let current = await this.findById(categoryId);
  
  while (current) {
    ancestors.unshift(current);
    if (current.parent) {
      current = await this.findById(current.parent);
    } else {
      current = null;
    }
  }
  
  return ancestors;
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
