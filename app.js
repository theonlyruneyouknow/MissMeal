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

// Main calendar route
app.get('/', async (req, res) => {
  try {
    const meals = await Meal.find()
      .populate('family')
      .populate('companionship')
      .sort({ date: 1 });
    
    res.render('calendar', { meals });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading calendar');
  }
});

// Calendar month view route
app.get('/calendar', async (req, res) => {
  try {
    // Get month and year from query params, default to current month
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    
    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    // Get meals for the entire month
    const meals = await Meal.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    })
    .populate('family')
    .populate('companionship')
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
    // Get period parameters
    const period = req.query.period || 'month';
    const direction = req.query.direction;
    const now = new Date();
    
    let startDate, endDate;
    
    // Calculate date range based on period
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
        startDate = new Date(); // Today
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1); // Next year
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    // Get meals for the period
    const meals = await Meal.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('family')
    .populate('companionship')
    .sort({ date: 1, time: 1 });
    
    res.render('calendar-list', { 
      meals,
      currentPeriod: period,
      startDate,
      endDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading list view');
  }
});

// API endpoint for calendar data
app.get('/api/meals', async (req, res) => {
  try {
    const meals = await Meal.find()
      .populate('family')
      .populate('companionship')
      .sort({ date: 1 });
    
    res.json(meals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching meals' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});