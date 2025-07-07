const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import models
const Meal = require('./models/Meal');
const Family = require('./models/Family');
const Missionary = require('./models/Missionary');

// Import routes
const mealRoutes = require('./routes/meals');
const familyRoutes = require('./routes/families');
const missionaryRoutes = require('./routes/missionaries');
const companionshipRoutes = require('./routes/companionships');
const textRoutes = require('./routes/text');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Make moment available in templates
app.locals.moment = moment;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/missionary-meals', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes
app.use('/meals', mealRoutes);
app.use('/families', familyRoutes);
app.use('/missionaries', missionaryRoutes);
app.use('/companionships', companionshipRoutes);
app.use('/text', textRoutes);

// Splash page (new homepage)
app.get('/', async (req, res) => {
  try {
    // Get statistics for the splash page
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get upcoming meals (next 30 days) with PROPER POPULATION
    const upcomingMeals = await Meal.find({
      date: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
    })
    .populate('family')
    .populate({
      path: 'companionship',
      populate: {
        path: 'missionaries',
        model: 'Missionary'
      }
    })
    .sort({ date: 1 })
    .limit(5);
    
    // Get statistics
    const totalUpcomingMeals = await Meal.countDocuments({
      date: { $gte: now }
    });
    
    const mealsNeedingFamilies = await Meal.countDocuments({
      date: { $gte: now },
      isAssigned: false
    });
    
    const activeFamilies = await Family.countDocuments({ isActive: true });
    const activeMissionaries = await Missionary.countDocuments({ isActive: true });
    
    // Get meals for current month (for mini calendar)
    const monthlyMeals = await Meal.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).select('date isAssigned');
    
    const stats = {
      upcomingMeals: totalUpcomingMeals,
      needingFamilies: mealsNeedingFamilies,
      activeFamilies: activeFamilies,
      activeMissionaries: activeMissionaries
    };
    
    res.render('splash', { 
      stats,
      upcomingMeals,
      monthlyMeals,
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear()
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading homepage');
  }
});

// Main calendar route (moved from root)
app.get('/calendar', async (req, res) => {
  try {
    console.log('DEBUG: Loading calendar view');
    
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth();
    
    console.log('DEBUG: Calendar for year:', year, 'month:', month);
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    console.log('DEBUG: Date range:', startDate, 'to', endDate);
    
    // Updated query to populate companionship missionaries
    const meals = await Meal.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('family')
    .populate({
      path: 'companionship',
      populate: {
        path: 'missionaries',
        model: 'Missionary'
      }
    })
    .sort({ date: 1, time: 1 });
    
    console.log('DEBUG: Found', meals.length, 'meals for calendar');
    
    // Debug each meal to see missionary data
    meals.forEach((meal, index) => {
      console.log(`DEBUG: Meal ${index + 1}:`, {
        id: meal._id,
        date: meal.date,
        time: meal.time,
        companionshipId: meal.companionship?._id,
        companionshipArea: meal.companionship?.area,
        missionariesInCompanionship: meal.companionship?.missionaries?.map(m => 
          m.fullName || `${m.firstName} ${m.lastName}`
        ) || [],
        familyName: meal.family?.familyName || 'Unassigned'
      });
    });
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    res.render('calendar', {
      meals,
      year,
      month,
      monthName: monthNames[month],
      daysInMonth,
      firstDay,
      moment: require('moment-timezone')
    });
    
  } catch (error) {
    console.error('ERROR loading calendar:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).send('Error loading calendar: ' + error.message);
  }
});

// Calendar month view route
app.get('/calendar/month', async (req, res) => {
  try {
    // Get month and year from query params, default to current month
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    
    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    // Get meals for the entire month with PROPER POPULATION
    const meals = await Meal.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    })
    .populate('family')
    .populate({
      path: 'companionship',
      populate: {
        path: 'missionaries',
        model: 'Missionary'
      }
    })
    .sort({ date: 1 });
    
    res.render('calendar-month', { 
      meals, 
      currentYear: year, 
      currentMonth: month,
      view: req.query.view || 'month'
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading calendar');
  }
});

// Calendar week view route (for mobile)
app.get('/calendar/week', async (req, res) => {
  try {
    // Get week start date from query params, default to current week
    const now = new Date();
    const weekStart = req.query.date ? new Date(req.query.date) : 
                     new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // Get meals for the week
    const meals = await Meal.find({
      date: {
        $gte: weekStart,
        $lte: weekEnd
      }
    })
    .populate('family')
    .populate('companionship')
    .sort({ date: 1 });
    
    res.render('calendar-week', { 
      meals, 
      weekStart,
      weekEnd
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading calendar');
  }
});

// Calendar list view route
app.get('/calendar/list', async (req, res) => {
  try {
    console.log('DEBUG: Loading calendar list view');
    
    const period = req.query.period || 'month';
    const now = new Date();
    
    let startDate, endDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case 'all':
        startDate = new Date();
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    // Only populate companionship.missionaries (no direct missionaries field)
    const meals = await Meal.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('family')
    .populate({
      path: 'companionship',
      populate: {
        path: 'missionaries',
        model: 'Missionary'
      }
    })
    .sort({ date: 1, time: 1 });
    
    console.log('DEBUG: Found', meals.length, 'meals');
    meals.forEach((meal, index) => {
      console.log(`Meal ${index + 1}:`, {
        id: meal._id,
        companionshipMissionaries: meal.companionship?.missionaries?.map(m => 
          m.fullName || `${m.firstName} ${m.lastName}`
        ) || []
      });
    });
    
    res.render('calendar-list', { meals, currentPeriod: period });
  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).send('Error loading list view: ' + error.message);
  }
});

// API endpoint for calendar data
app.get('/api/meals', async (req, res) => {
  try {
    const meals = await Meal.find()
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries',
          model: 'Missionary'
        }
      })
      .sort({ date: 1 });
    
    res.json(meals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching meals' });
  }
});

// API endpoint for splash page data
app.get('/api/splash-data', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get upcoming meals (next 5) with PROPER POPULATION
    const upcomingMeals = await Meal.find({
      date: { $gte: now }
    })
    .populate('family')
    .populate({
      path: 'companionship',
      populate: {
        path: 'missionaries',
        model: 'Missionary'
      }
    })
    .sort({ date: 1 })
    .limit(5);
    
    // Get statistics
    const totalUpcomingMeals = await Meal.countDocuments({
      date: { $gte: now }
    });
    
    const mealsNeedingFamilies = await Meal.countDocuments({
      date: { $gte: now },
      isAssigned: false
    });
    
    const activeFamilies = await Family.countDocuments({ isActive: true });
    const activeMissionaries = await Missionary.countDocuments({ isActive: true });
    
    // Get meals for current month (for mini calendar)
    const monthlyMeals = await Meal.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).select('date isAssigned');
    
    res.json({
      stats: {
        upcomingMeals: totalUpcomingMeals,
        needingFamilies: mealsNeedingFamilies,
        activeFamilies: activeFamilies,
        activeMissionaries: activeMissionaries
      },
      upcomingMeals,
      monthlyMeals,
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching splash data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});