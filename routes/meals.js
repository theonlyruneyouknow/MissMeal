const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const Family = require('../models/Family');
const Companionship = require('../models/Companionship');

// GET /meals - List upcoming meals only
router.get('/', async (req, res) => {
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
    res.status(500).send('Error fetching meals');
  }
});

// GET /meals/new - Show form to create new meal
router.get('/new', async (req, res) => {
  try {
    const companionships = await Companionship.find().populate('missionaries');
    const families = await Family.find().sort({ familyName: 1 });

    // Handle date from query parameters
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

    res.render('meals/new', {
      companionships,
      families,
      missionaries: [], // Add missionaries array for template compatibility
      date: dateStr,
      selectedDate: dateStr, // Add selectedDate for template
      meal: {}
    });
  } catch (error) {
    console.error('Error loading new meal form:', error);
    res.status(500).send('Error loading new meal form');
  }
});

// POST /meals - Create new meal
router.post('/', async (req, res) => {
  try {
    // Clean up the form data
    const mealData = { ...req.body };

    // Handle empty family field - remove it if empty string
    if (mealData.family === '' || mealData.family === undefined) {
      delete mealData.family;
    }

    // Handle empty companionship field
    if (mealData.companionship === '' || mealData.companionship === undefined) {
      delete mealData.companionship;
    }

    console.log('Creating meal with cleaned data:', mealData);

    const meal = new Meal(mealData);
    await meal.save();

    console.log('Meal created successfully:', meal._id);
    res.redirect('/calendar');
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).send('Error creating meal: ' + error.message);
  }
});

// GET /meals/:id - Show specific meal
router.get('/:id', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id)
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      });

    if (!meal) {
      return res.status(404).send('Meal not found');
    }

    res.render('meals/show', { meal });
  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).send('Error fetching meal');
  }
});

// GET /meals/:id/edit - Show form to edit meal
router.get('/:id/edit', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    const companionships = await Companionship.find().populate('missionaries');
    const families = await Family.find().sort({ familyName: 1 });

    if (!meal) {
      return res.status(404).send('Meal not found');
    }

    res.render('meals/edit', { meal, companionships, families });
  } catch (error) {
    console.error('Error loading edit meal form:', error);
    res.status(500).send('Error loading edit meal form');
  }
});

// PUT /meals/:id - Update meal
router.put('/:id', async (req, res) => {
  try {
    await Meal.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/meals/${req.params.id}`);
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).send('Error updating meal');
  }
});

// DELETE /meals/:id - Delete meal
router.delete('/:id', async (req, res) => {
  try {
    await Meal.findByIdAndDelete(req.params.id);
    res.redirect('/meals');
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).send('Error deleting meal');
  }
});

module.exports = router;