/**
 * Central export for all Mongoose models.
 */

const User = require('./User.model');
const Product = require('./Product.model');
const Category = require('./Category.model');
const Cart = require('./Cart.model');
const Order = require('./Order.model');

module.exports = {
  User,
  Product,
  Category,
  Cart,
  Order
};
