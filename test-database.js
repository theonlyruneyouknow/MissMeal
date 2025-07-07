// test-database.js
// Run this script to test your database connection and models
// Usage: node test-database.js

require('dotenv').config();
const mongoose = require('mongoose');

// Import your models
const Family = require('./models/Family');
const Missionary = require('./models/Missionary');
const Meal = require('./models/Meal');

async function testDatabase() {
  try {
    console.log('🔄 Starting database test...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/missionary-meals');
    
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/missionary-meals', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully');

    // Test database connection
    console.log('\n📊 Database Status:');
    console.log('   - Database Name:', mongoose.connection.db.databaseName);
    console.log('   - Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');

    // Test Family model
    console.log('\n🏠 Testing Family model...');
    try {
      const families = await Family.find();
      const activeFamilies = await Family.find({ isActive: true });
      console.log(`   ✅ Found ${families.length} total families`);
      console.log(`   ✅ Found ${activeFamilies.length} active families`);
      
      if (families.length > 0) {
        console.log(`   📝 Sample family: ${families[0].familyName}`);
      }
    } catch (familyError) {
      console.log('   ❌ Error with Family model:', familyError.message);
    }

    // Test Missionary model
    console.log('\n👥 Testing Missionary model...');
    try {
      const missionaries = await Missionary.find();
      const activeMissionaries = await Missionary.find({ isActive: true });
      console.log(`   ✅ Found ${missionaries.length} total missionaries`);
      console.log(`   ✅ Found ${activeMissionaries.length} active missionaries`);
      
      if (missionaries.length > 0) {
        const sample = missionaries[0];
        console.log(`   📝 Sample missionary: ${sample.fullName || sample.firstName + ' ' + sample.lastName}`);
      }
    } catch (missionaryError) {
      console.log('   ❌ Error with Missionary model:', missionaryError.message);
    }

    // Test Meal model
    console.log('\n🍽️  Testing Meal model...');
    try {
      const meals = await Meal.find();
      console.log(`   ✅ Found ${meals.length} total meals`);
      
      if (meals.length > 0) {
        console.log(`   📝 Sample meal date: ${meals[0].date.toDateString()}`);
      }
    } catch (mealError) {
      console.log('   ❌ Error with Meal model:', mealError.message);
    }

    // Test the exact queries used in the route
    console.log('\n🔍 Testing route queries...');
    try {
      const routeFamilies = await Family.find({ isActive: true }).sort({ familyName: 1 });
      const routeMissionaries = await Missionary.find({ isActive: true }).sort({ lastName: 1 });
      
      console.log(`   ✅ Route query: ${routeFamilies.length} active families (sorted)`);
      console.log(`   ✅ Route query: ${routeMissionaries.length} active missionaries (sorted)`);
      
      if (routeMissionaries.length === 0) {
        console.log('\n⚠️  WARNING: No active missionaries found!');
        console.log('   💡 This is why your /meals/new page shows "No missionaries available"');
        console.log('   🔧 Solution: Add missionaries at http://localhost:3000/missionaries/new');
      }
      
    } catch (routeError) {
      console.log('   ❌ Error with route queries:', routeError.message);
    }

    // Check model files exist
    console.log('\n📁 Checking model files...');
    const fs = require('fs');
    const path = require('path');
    
    const modelFiles = ['Family.js', 'Missionary.js', 'Meal.js'];
    modelFiles.forEach(file => {
      const filePath = path.join(__dirname, 'models', file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file} exists`);
      } else {
        console.log(`   ❌ ${file} NOT FOUND`);
      }
    });

    console.log('\n🎉 Database test completed successfully!');
    
    // Final recommendations
    console.log('\n💡 Recommendations:');
    const activeMissionaries = await Missionary.find({ isActive: true });
    const activeFamilies = await Family.find({ isActive: true });
    
    if (activeMissionaries.length === 0) {
      console.log('   🔧 Add missionaries: http://localhost:3000/missionaries/new');
    }
    if (activeFamilies.length === 0) {
      console.log('   🔧 Add families: http://localhost:3000/families/new');
    }
    if (activeMissionaries.length > 0) {
      console.log('   ✅ You have missionaries! /meals/new should work now.');
    }

  } catch (error) {
    console.error('\n❌ Database test failed!');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure MongoDB is running');
    console.error('   2. Check your .env file has MONGODB_URI');
    console.error('   3. Verify database connection string is correct');
    console.error('   4. Make sure all model files exist in models/ directory');
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testDatabase();