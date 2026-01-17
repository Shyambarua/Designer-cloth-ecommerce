/**
 * Handles user profile management including
 * profile updates and address management.
 */

const User = require('../models/User.model');
const { sendSuccess, sendError, sendNotFound } = require('../utils/response');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    return sendSuccess(res, 200, 'Profile retrieved successfully', {
      user: user.toPublicProfile()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    // Fields allowed to be updated
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return sendNotFound(res, 'User');
    }

    return sendSuccess(res, 200, 'Profile updated successfully', {
      user: user.toPublicProfile()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user addresses
 * @route   GET /api/users/addresses
 * @access  Private
 */
const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    if (!user) {
      return sendNotFound(res, 'User');
    }

    return sendSuccess(res, 200, 'Addresses retrieved successfully', {
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add new address
 * @route   POST /api/users/addresses
 * @access  Private
 */
const addAddress = async (req, res, next) => {
  try {
    const { name, phone, street, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Add new address
    user.addresses.push({
      name,
      phone,
      street,
      city,
      state,
      zipCode,
      country: country || 'India',
      isDefault: isDefault || user.addresses.length === 0 // First address is default
    });

    await user.save();

    return sendSuccess(res, 201, 'Address added successfully', {
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/users/addresses/:addressId
 * @access  Private
 */
const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return sendNotFound(res, 'Address');
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Update address fields
    Object.keys(updates).forEach((key) => {
      if (address[key] !== undefined) {
        address[key] = updates[key];
      }
    });

    await user.save();

    return sendSuccess(res, 200, 'Address updated successfully', {
      address
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private
 */
const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return sendNotFound(res, 'Address');
    }

    // Remove address
    user.addresses.pull(addressId);

    // If deleted address was default and there are other addresses, set first as default
    if (address.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return sendSuccess(res, 200, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set default address
 * @route   PUT /api/users/addresses/:addressId/default
 * @access  Private
 */
const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return sendNotFound(res, 'Address');
    }

    // Unset all defaults
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    // Set this address as default
    address.isDefault = true;

    await user.save();

    return sendSuccess(res, 200, 'Default address updated', {
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
