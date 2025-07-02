const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const Family = require('../models/Family');
const Missionary = require('../models/Missionary');
const moment = require('moment');

// GET all meals
router.get('/', async (req, res) => {
  try {
    const meals = await Meal.find()
      .populate('family')
      .populate('companionship')
      .sort({ date: 1 });
    
    res.render('meals/index', { meals });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading meals');
  }
});

// GET new meal form
router.get('/new', async (req, res) => {
  try {
    const families = await Family.find({ isActive: true }).sort({ familyName: 1 });
    const missionaries = await Missionary.find({ isActive: true }).sort({ lastName: 1 });
    
    res.render('meals/new', { families, missionaries });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading form');
  }
});

// POST create new meal
router.post('/', async (req, res) => {
  try {
    const mealData = {
      date: new Date(req.body.date),
      time: req.body.time,
      companionship: req.body.companionship, // Array of missionary IDs
      deliveryType: req.body.deliveryType,
      notes: req.body.notes || ''
    };

    // If family is assigned
    if (req.body.family && req.body.family !== '') {
      mealData.family = req.body.family;
      mealData.isAssigned = true;
    }

    const meal = new Meal(mealData);
    await meal.save();
    
    res.redirect('/meals');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating meal');
  }
});

// GET meal details
router.get('/:id', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id)
      .populate('family')
      .populate('companionship');
    
    if (!meal) {
      return res.status(404).send('Meal not found');
    }
    
    res.render('meals/show', { meal });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading meal');
  }
});

// GET edit meal form
router.get('/:id/edit', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id)
      .populate('family')
      .populate('companionship');
    
    const families = await Family.find({ isActive: true }).sort({ familyName: 1 });
    const missionaries = await Missionary.find({ isActive: true }).sort({ lastName: 1 });
    
    if (!meal) {
      return res.status(404).send('Meal not found');
    }
    
    res.render('meals/edit', { meal, families, missionaries });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading edit form');
  }
});

// PUT update meal
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      date: new Date(req.body.date),
      time: req.body.time,
      companionship: req.body.companionship,
      deliveryType: req.body.deliveryType,
      notes: req.body.notes || ''
    };

    // Handle family assignment
    if (req.body.family && req.body.family !== '') {
      updateData.family = req.body.family;
      updateData.isAssigned = true;
    } else {
      updateData.family = null;
      updateData.isAssigned = false;
    }

    await Meal.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/meals/' + req.params.id);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating meal');
  }
});

// POST signup for meal (for families)
router.post('/:id/signup', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    if (meal.isAssigned) {
      return res.status(400).json({ error: 'Meal already assigned' });
    }

    // Find or create family
    let family;
    if (req.body.familyId) {
      family = await Family.findById(req.body.familyId);
    } else {
      // Create new family signup
      family = new Family({
        familyName: req.body.familyName,
        contactName: req.body.contactName,
        phoneNumber: req.body.phoneNumber,
        email: req.body.email,
        preferredDeliveryType: req.body.deliveryType || 'either'
      });
      await family.save();
    }

    // Assign family to meal
    meal.family = family._id;
    meal.isAssigned = true;
    meal.deliveryType = req.body.deliveryType || meal.deliveryType;
    
    await meal.save();

    res.json({ success: true, message: 'Successfully signed up for meal!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error signing up for meal' });
  }
});

// DELETE meal
router.delete('/:id', async (req, res) => {
  try {
    await Meal.findByIdAndDelete(req.params.id);
    res.redirect('/meals');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting meal');
  }
});

module.exports = router;