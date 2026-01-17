/**
 * Populates the database with initial data
 * including admin user, categories, and sample products.
 * 
 * Usage: node src/scripts/seedDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User.model');
const Category = require('../models/Category.model');
const Product = require('../models/Product.model');

// Sample categories
const categories = [
  {
    name: 'Men',
    slug: 'men',
    description: 'Designer clothing for men',
    sortOrder: 1
  },
  {
    name: 'Women',
    slug: 'women',
    description: 'Designer clothing for women',
    sortOrder: 2
  },
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    description: 'Premium designer t-shirts',
    sortOrder: 3
  },
  {
    name: 'Shirts',
    slug: 'shirts',
    description: 'Formal and casual designer shirts',
    sortOrder: 4
  },
  {
    name: 'Dresses',
    slug: 'dresses',
    description: 'Elegant designer dresses',
    sortOrder: 5
  },
  {
    name: 'Jeans',
    slug: 'jeans',
    description: 'Premium denim jeans',
    sortOrder: 6
  }
];

// Sample products (will be linked to categories)
const sampleProducts = [
  {
    name: 'Classic White Cotton Shirt',
    description: 'A timeless white cotton shirt crafted from premium Egyptian cotton. Perfect for formal occasions or casual wear.',
    shortDescription: 'Premium Egyptian cotton formal shirt',
    price: 2999,
    salePrice: 2499,
    brand: 'Designer Studio',
    material: '100% Egyptian Cotton',
    careInstructions: 'Machine wash cold. Iron on medium heat.',
    isFeatured: true,
    isNewArrival: true,
    tags: ['formal', 'cotton', 'white', 'classic'],
    variants: [
      { size: 'S', color: 'White', colorCode: '#FFFFFF', sku: 'WSH-S-WHT', stock: 15 },
      { size: 'M', color: 'White', colorCode: '#FFFFFF', sku: 'WSH-M-WHT', stock: 20 },
      { size: 'L', color: 'White', colorCode: '#FFFFFF', sku: 'WSH-L-WHT', stock: 18 },
      { size: 'XL', color: 'White', colorCode: '#FFFFFF', sku: 'WSH-XL-WHT', stock: 10 }
    ],
    images: [
      { url: '/uploads/products/sample-shirt-1.jpg', alt: 'White shirt front view', isPrimary: true },
      { url: '/uploads/products/sample-shirt-2.jpg', alt: 'White shirt back view', isPrimary: false }
    ]
  },
  {
    name: 'Premium Slim Fit Denim Jeans',
    description: 'Contemporary slim fit jeans made from Japanese selvedge denim. Features classic 5-pocket styling.',
    shortDescription: 'Japanese selvedge denim slim fit jeans',
    price: 4999,
    brand: 'Denim Co',
    material: 'Japanese Selvedge Denim',
    careInstructions: 'Wash inside out in cold water.',
    isFeatured: true,
    tags: ['denim', 'jeans', 'slim fit', 'casual'],
    variants: [
      { size: 'S', color: 'Indigo', colorCode: '#3F51B5', sku: 'JNS-S-IND', stock: 12 },
      { size: 'M', color: 'Indigo', colorCode: '#3F51B5', sku: 'JNS-M-IND', stock: 25 },
      { size: 'L', color: 'Indigo', colorCode: '#3F51B5', sku: 'JNS-L-IND', stock: 20 },
      { size: 'M', color: 'Black', colorCode: '#212121', sku: 'JNS-M-BLK', stock: 15 },
      { size: 'L', color: 'Black', colorCode: '#212121', sku: 'JNS-L-BLK', stock: 18 }
    ],
    images: [
      { url: '/uploads/products/sample-jeans-1.jpg', alt: 'Jeans front view', isPrimary: true }
    ]
  },
  {
    name: 'Printed Designer T-Shirt',
    description: 'Bold graphic print t-shirt with a contemporary fit. Made from soft organic cotton for everyday comfort.',
    shortDescription: 'Organic cotton graphic tee',
    price: 1499,
    salePrice: 999,
    brand: 'Street Style',
    material: '100% Organic Cotton',
    careInstructions: 'Machine wash cold. Tumble dry low.',
    isNewArrival: true,
    isBestSeller: true,
    tags: ['t-shirt', 'graphic', 'casual', 'organic'],
    variants: [
      { size: 'S', color: 'Black', colorCode: '#000000', sku: 'TSH-S-BLK', stock: 30 },
      { size: 'M', color: 'Black', colorCode: '#000000', sku: 'TSH-M-BLK', stock: 40 },
      { size: 'L', color: 'Black', colorCode: '#000000', sku: 'TSH-L-BLK', stock: 35 },
      { size: 'XL', color: 'Black', colorCode: '#000000', sku: 'TSH-XL-BLK', stock: 20 },
      { size: 'M', color: 'White', colorCode: '#FFFFFF', sku: 'TSH-M-WHT', stock: 25 }
    ],
    images: [
      { url: '/uploads/products/sample-tshirt-1.jpg', alt: 'T-shirt front view', isPrimary: true }
    ]
  },
  {
    name: 'Elegant Evening Dress',
    description: 'Stunning floor-length evening dress with delicate embroidery. Perfect for special occasions and formal events.',
    shortDescription: 'Floor-length embroidered evening gown',
    price: 12999,
    salePrice: 9999,
    brand: 'Couture Collection',
    material: 'Silk blend with hand embroidery',
    careInstructions: 'Dry clean only.',
    isFeatured: true,
    tags: ['dress', 'formal', 'evening wear', 'elegant'],
    variants: [
      { size: 'S', color: 'Navy', colorCode: '#1A237E', sku: 'DRS-S-NVY', stock: 5 },
      { size: 'M', color: 'Navy', colorCode: '#1A237E', sku: 'DRS-M-NVY', stock: 8 },
      { size: 'L', color: 'Burgundy', colorCode: '#800020', sku: 'DRS-L-BRG', stock: 6 }
    ],
    images: [
      { url: '/uploads/products/sample-dress-1.jpg', alt: 'Evening dress front view', isPrimary: true }
    ]
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({})
    ]);

    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true
    });
    console.log(`Admin user created: ${adminUser.email}`);

    // Create categories
    console.log('Creating categories...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`Created ${createdCategories.length} categories`);

    // Create category map for product assignment
    const categoryMap = createdCategories.reduce((acc, cat) => {
      acc[cat.slug] = cat._id;
      return acc;
    }, {});

    // Create products with category assignments
    console.log('Creating sample products...');
    const productsWithCategories = sampleProducts.map((product, index) => {
      // Assign categories based on product type
      let categorySlug = 't-shirts'; // default
      if (product.name.toLowerCase().includes('shirt') && !product.name.toLowerCase().includes('t-shirt')) {
        categorySlug = 'shirts';
      } else if (product.name.toLowerCase().includes('jeans')) {
        categorySlug = 'jeans';
      } else if (product.name.toLowerCase().includes('dress')) {
        categorySlug = 'dresses';
      }

      return {
        ...product,
        category: categoryMap[categorySlug],
        createdBy: adminUser._id
      };
    });

    const createdProducts = await Product.insertMany(productsWithCategories);
    console.log(`Created ${createdProducts.length} products`);

    // Summary
    
    console.log('Database seeded successfully!');
    console.log('\nAdmin credentials:');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\nCreated data:');
    console.log(`Categories: ${createdCategories.length}`);
    console.log(`Products: ${createdProducts.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
