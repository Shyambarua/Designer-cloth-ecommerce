/**
 * Defines the schema for user accounts including
 * authentication and profile information.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    // User's email (used for login)
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },

    // Hashed password
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include password in queries by default
    },

    // User role for access control
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },

    // User's phone number (optional)
    phone: {
      type: String,
      trim: true
    },

    // User's profile avatar URL
    avatar: {
      type: String,
      default: ''
    },

    // Shipping addresses
    addresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true, default: 'India' },
        isDefault: { type: Boolean, default: false }
      }
    ],

    // Account status
    isActive: {
      type: Boolean,
      default: true
    },

    // Email verification status
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    // Password reset fields
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Track last login
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });


userSchema.pre("save", async function () {
  // Only hash if password changed
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});


// Instance Methods

/**
 * Compare entered password with stored hash
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get public profile (exclude sensitive data)
 * @returns {Object} User object without sensitive fields
 */
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    avatar: this.avatar,
    addresses: this.addresses,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt
  };
};

// Static Methods

/**
 * Find user by email
 * @param {string} email - User's email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
