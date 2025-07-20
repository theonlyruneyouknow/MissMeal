const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const Family = require('../models/Family');
const Companionship = require('../models/Companionship');

// GET /meals - List all meals
router.get('/', async (req, res) => {
  try {
    const meals = await Meal.find()
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
    
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    res.render('meals/new', { 
      companionships, 
      families, 
      date,
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
    const meal = new Meal(req.body);
    await meal.save();
    res.redirect('/meals');
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).send('Error creating meal');
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