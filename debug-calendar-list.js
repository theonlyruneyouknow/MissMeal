const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Meal = require('./models/Meal');
    const Family = require('./models/Family');
    const Companionship = require('./models/Companionship');
    const Missionary = require('./models/Missionary');

    // Simulate the calendar/list route logic
    const now = new Date();
    const year = now.getFullYear();  // Default to current year
    const month = now.getMonth();    // Default to current month

    console.log('Current date:', now.toISOString());
    console.log('Year:', year, 'Month:', month, '(0-based, so', month, '= month', month + 1, ')');

    // Use UTC dates to match how meals are stored in the database
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    console.log('startOfMonth:', startOfMonth.toISOString());
    console.log('endOfMonth:', endOfMonth.toISOString());

    // Get today's date at start of day for filtering out past meals
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

    console.log('startOfToday:', startOfToday.toISOString());

    // Use the later of start of month or today to filter out past meals
    const filterStartDate = startOfMonth > startOfToday ? startOfMonth : startOfToday;

    console.log('filterStartDate (should be startOfToday since we are in current month):', filterStartDate.toISOString());
    console.log('Comparison: startOfMonth > startOfToday?', startOfMonth > startOfToday);

    const meals = await Meal.find({
        date: {
            $gte: filterStartDate,
            $lte: endOfMonth
        }
    }).sort({ date: 1 });

    console.log('\n--- MEALS FOUND BY CALENDAR LIST LOGIC ---');
    meals.forEach((meal, i) => {
        console.log(`${i + 1}. Date: ${meal.date.toISOString()} (${meal.date.toDateString()})`);
    });

    process.exit();
}).catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
});
