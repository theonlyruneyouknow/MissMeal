const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Meal = require('./models/Meal');
    const Family = require('./models/Family');
    const Companionship = require('./models/Companionship');
    const Missionary = require('./models/Missionary');

    // Find meals for August 1st, 2025
    const meals = await Meal.find({
        date: {
            $gte: new Date('2025-08-01T00:00:00.000Z'),
            $lt: new Date('2025-08-02T00:00:00.000Z')
        }
    }).populate('family').populate('companionship');

    console.log('Meals for August 1st, 2025:');
    console.log('Count:', meals.length);
    meals.forEach((meal, i) => {
        console.log(`${i + 1}. Date: ${meal.date}, Time: ${meal.time}, Family: ${meal.family?.familyName || 'None'}`);
        console.log(`   Raw date: ${meal.date.toISOString()}`);
        console.log(`   getDate(): ${meal.date.getDate()}`);
        console.log(`   getUTCDate(): ${meal.date.getUTCDate()}`);
    });

    // Also check all August meals
    console.log('\n--- All August 2025 meals ---');
    const augustMeals = await Meal.find({
        date: {
            $gte: new Date('2025-08-01T00:00:00.000Z'),
            $lt: new Date('2025-09-01T00:00:00.000Z')
        }
    }).populate('family').populate('companionship').sort({ date: 1 });

    console.log('August meals count:', augustMeals.length);
    augustMeals.forEach((meal, i) => {
        console.log(`${i + 1}. Date: ${meal.date}, Time: ${meal.time}, Family: ${meal.family?.familyName || 'None'}`);
    });

    process.exit();
}).catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
});
