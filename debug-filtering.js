const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Meal = require('./models/Meal');
    const Family = require('./models/Family');
    const Companionship = require('./models/Companionship');
    const Missionary = require('./models/Missionary');

    console.log('Today is:', new Date().toISOString());
    console.log('Current date parts:', {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        date: new Date().getDate()
    });

    // Test the current filtering logic
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    console.log('startOfToday (should be July 28, 2025 00:00:00 UTC):', startOfToday.toISOString());

    // Get all meals to see what we're working with
    const allMeals = await Meal.find({}).sort({ date: 1 });
    console.log('\n--- ALL MEALS IN DATABASE ---');
    allMeals.forEach((meal, i) => {
        console.log(`${i + 1}. Date: ${meal.date.toISOString()} (${meal.date.toDateString()})`);
    });

    // Test current filtering
    const filteredMeals = await Meal.find({
        date: { $gte: startOfToday }
    }).sort({ date: 1 });

    console.log('\n--- MEALS AFTER FILTERING (should only show July 28+ meals) ---');
    filteredMeals.forEach((meal, i) => {
        console.log(`${i + 1}. Date: ${meal.date.toISOString()} (${meal.date.toDateString()})`);
    });

    process.exit();
}).catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
});
