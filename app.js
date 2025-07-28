const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();

// Try to import models (with error handling)
let Meal, Family, Missionary, Companionship;

try {
  Meal = require('./models/Meal');
  Family = require('./models/Family');
  Missionary = require('./models/Missionary');
  Companionship = require('./models/Companionship');
  console.log('✅ All models loaded successfully');
} catch (error) {
  console.error('❌ Error loading models:', error.message);
  console.log('🔧 Creating placeholder models...');

  // Create placeholder models if they don't exist
  const mongoose = require('mongoose');

  const mealSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    time: String,
    address: String,
    notes: String,
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
    companionship: { type: mongoose.Schema.Types.ObjectId, ref: 'Companionship' }
  }, { timestamps: true });

  const familySchema = new mongoose.Schema({
    familyName: { type: String, required: true },
    contactName: String,
    phoneNumber: String,
    email: String,
    deliveryType: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' }
  }, { timestamps: true });

  const missionarySchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: String,
    phone: String
  }, { timestamps: true });

  const companionshipSchema = new mongoose.Schema({
    name: String,
    missionaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Missionary' }],
    area: String
  }, { timestamps: true });

  Meal = mongoose.model('Meal', mealSchema);
  Family = mongoose.model('Family', familySchema);
  Missionary = mongoose.model('Missionary', missionarySchema);
  Companionship = mongoose.model('Companionship', companionshipSchema);

  console.log('✅ Placeholder models created');
}

// Connect to MongoDB using environment variable
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/missmeal';

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoUri.includes('mongodb.net') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB');
    console.log('📂 Database Name:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Check your .env file and internet connection');
    console.log('🔧 Falling back to local MongoDB...');

    // Fallback to local MongoDB
    mongoose.connect('mongodb://localhost:27017/missmeal')
      .then(() => console.log('✅ Connected to local MongoDB'))
      .catch(localErr => console.error('❌ Local MongoDB also failed:', localErr.message));
  });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Import route files (with error handling)
try {
  const mealsRouter = require('./routes/meals');
  const familiesRouter = require('./routes/families');
  const missionariesRouter = require('./routes/missionaries');
  const companionshipsRouter = require('./routes/companionships');

  // Use routes
  app.use('/meals', mealsRouter);
  app.use('/families', familiesRouter);
  app.use('/missionaries', missionariesRouter);
  app.use('/companionships', companionshipsRouter);

  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.log('🔧 Some routes may not be available');
}

// Home route
app.get('/', (req, res) => {
  res.redirect('/calendar');
});

// Debug route to check database connection and data
app.get('/debug', async (req, res) => {
  try {
    const dbStats = {
      connection: mongoose.connection.readyState,
      connectionString: mongoUri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
      database: mongoose.connection.name,
      collections: {}
    };

    try {
      dbStats.collections.meals = await Meal.countDocuments();
      dbStats.collections.families = await Family.countDocuments();
      dbStats.collections.missionaries = await Missionary.countDocuments();
      dbStats.collections.companionships = await Companionship.countDocuments();

      // Get sample data
      const sampleMeals = await Meal.find().limit(3).populate('family').populate('companionship');
      const sampleFamilies = await Family.find().limit(3);
      const sampleMissionaries = await Missionary.find().limit(3);
      const sampleCompanionships = await Companionship.find().limit(3).populate('missionaries');

      dbStats.samples = {
        meals: sampleMeals,
        families: sampleFamilies,
        missionaries: sampleMissionaries,
        companionships: sampleCompanionships
      };

    } catch (dbError) {
      dbStats.error = dbError.message;
    }

    res.json(dbStats);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main calendar route
app.get('/calendar', async (req, res) => {
  try {
    console.log('Loading calendar with query params:', req.query);

    // Get current date or from query params
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth();

    console.log('Calendar date:', { year, month });

    // Calculate calendar data
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Get meals for the month - use UTC to match stored dates
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    let meals = [];
    try {
      meals = await Meal.find({
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      }).populate('family').populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      }).sort({ date: 1, time: 1 });

      console.log(`Found ${meals.length} meals for ${monthNames[month]} ${year}`);
    } catch (mealError) {
      console.log('Could not load meals:', mealError.message);
      meals = [];
    }

    // Prepare template data
    const templateData = {
      year: year,
      month: month,
      monthName: monthNames[month],
      daysInMonth: daysInMonth,
      firstDay: firstDay,
      meals: meals
    };

    res.render('calendar', templateData);

  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).send('Calendar error: ' + error.message);
  }
});

// Calendar list view
app.get('/calendar/list', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth();

    console.log('=== CALENDAR LIST DEBUG ===');
    console.log('Request query params:', req.query);
    console.log('Current date:', now.toISOString());
    console.log('Year:', year, 'Month:', month, '(0-based)');

    // Get today's date at start of day for filtering out past meals
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

    // Calculate date ranges
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // Check if we're in current month and less than 2 weeks from end of month
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    const daysLeftInMonth = Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24));
    const shouldIncludeNextMonth = isCurrentMonth && daysLeftInMonth < 14;

    console.log('startOfMonth:', startOfMonth.toISOString());
    console.log('endOfMonth:', endOfMonth.toISOString());
    console.log('isCurrentMonth:', isCurrentMonth);
    console.log('daysLeftInMonth:', daysLeftInMonth);
    console.log('shouldIncludeNextMonth:', shouldIncludeNextMonth);

    // Set query end date - extend to next month if needed
    let queryEndDate = endOfMonth;
    if (shouldIncludeNextMonth) {
      queryEndDate = new Date(Date.UTC(year, month + 2, 0, 23, 59, 59, 999)); // End of next month
      console.log('Extended queryEndDate to:', queryEndDate.toISOString());
    }

    // Use the later of start of month or today to filter out past meals
    const filterStartDate = startOfMonth > startOfToday ? startOfMonth : startOfToday;

    console.log('filterStartDate:', filterStartDate.toISOString());
    console.log('queryEndDate:', queryEndDate.toISOString());

    const meals = await Meal.find({
      date: {
        $gte: filterStartDate,
        $lte: queryEndDate
      }
    }).populate('family').populate({
      path: 'companionship',
      populate: {
        path: 'missionaries'
      }
    }).sort({ date: 1, time: 1 });

    console.log('Found', meals.length, 'meals after filtering');
    meals.forEach((meal, i) => {
      console.log(`${i + 1}. ${meal.date.toISOString()} (${meal.date.toDateString()})`);
    });
    console.log('=== END CALENDAR LIST DEBUG ===');

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calculate navigation dates
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    // Create title based on whether we're showing extended months
    let displayTitle = monthNames[month] + ' ' + year;
    if (shouldIncludeNextMonth) {
      const nextMonthName = monthNames[nextMonth];
      const nextMonthYear = nextYear;
      if (nextMonthYear === year) {
        displayTitle += ' & ' + nextMonthName;
      } else {
        displayTitle += ' & ' + nextMonthName + ' ' + nextMonthYear;
      }
    }

    res.render('calendar-list', {
      year: year,
      month: month,
      monthName: monthNames[month],
      displayTitle: displayTitle,
      prevYear: prevYear,
      prevMonth: prevMonth,
      nextYear: nextYear,
      nextMonth: nextMonth,
      shouldIncludeNextMonth: shouldIncludeNextMonth,
      meals: meals
    });

  } catch (error) {
    console.error('Calendar list error:', error);
    res.status(500).send('Calendar list error: ' + error.message);
  }
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
  try {
    // Get statistics with error handling
    let stats = {
      totalMeals: 0,
      assignedMeals: 0,
      unassignedMeals: 0,
      totalFamilies: 0,
      totalMissionaries: 0,
      totalCompanionships: 0
    };

    let upcomingMeals = [];
    let recentSignups = [];

    try {
      stats.totalMeals = await Meal.countDocuments();
      stats.assignedMeals = await Meal.countDocuments({ family: { $exists: true } });
      stats.unassignedMeals = stats.totalMeals - stats.assignedMeals;
      stats.totalFamilies = await Family.countDocuments();
      stats.totalMissionaries = await Missionary.countDocuments();
      stats.totalCompanionships = await Companionship.countDocuments();

      // Get upcoming meals
      const now = new Date();
      upcomingMeals = await Meal.find({
        date: { $gte: now }
      }).populate('family').populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      }).sort({ date: 1 }).limit(10);

      // Get recent signups
      recentSignups = await Meal.find({
        family: { $exists: true },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).populate('family').populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      }).sort({ createdAt: -1 }).limit(5);

    } catch (dbError) {
      console.log('Database error in dashboard:', dbError.message);
    }

    res.render('dashboard', {
      stats,
      upcomingMeals,
      recentSignups
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Dashboard error: ' + error.message);
  }
});

// Simple meals routes (fallback if main routes don't work)
app.get('/meals/new', async (req, res) => {
  try {
    console.log('New meal route called with params:', req.query);

    // Get date from query parameters
    let selectedDate;
    if (req.query.year && req.query.month && req.query.day) {
      selectedDate = new Date(
        parseInt(req.query.year),
        parseInt(req.query.month),
        parseInt(req.query.day)
      );
    } else if (req.query.date) {
      selectedDate = new Date(req.query.date);
    } else {
      selectedDate = new Date();
    }

    const dateStr = selectedDate.toISOString().split('T')[0];

    // Get companionships and families for the form
    let companionships = [];
    let families = [];

    try {
      companionships = await Companionship.find().populate('missionaries');
      families = await Family.find().sort({ familyName: 1 });
    } catch (dbError) {
      console.log('Error loading form data:', dbError.message);
    }

    res.render('meals/new', {
      companionships,
      families,
      missionaries: [], // Add empty missionaries array for template compatibility
      date: dateStr,
      meal: {},
      selectedDate: dateStr // Pass as string instead of Date object
    });

  } catch (error) {
    console.error('New meal form error:', error);
    res.status(500).send('Error loading new meal form: ' + error.message);
  }
});

app.post('/meals', async (req, res) => {
  try {
    console.log('Creating meal with data:', req.body);

    const meal = new Meal(req.body);
    await meal.save();

    console.log('Meal created successfully:', meal._id);
    res.redirect('/calendar');

  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).send('Error creating meal: ' + error.message);
  }
});

app.get('/meals', async (req, res) => {
  try {
    // Get current date at midnight UTC to include today's meals
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

    const meals = await Meal.find({
      date: {
        $gte: startOfToday
      }
    })
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      })
      .sort({ date: 1, time: 1 });

    res.render('meals/index', { meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).send('Error fetching meals: ' + error.message);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).send('Something went wrong!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📅 Calendar: http://localhost:${PORT}/calendar`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔍 Debug: http://localhost:${PORT}/debug`);
});