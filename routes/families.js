const express = require('express');
const router = express.Router();
const Family = require('../models/Family');

// GET all families
router.get('/', async (req, res) => {
  try {
    const families = await Family.find().sort({ familyName: 1 });
    res.render('families/index', { families });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading families');
  }
});

// GET new family form
router.get('/new', (req, res) => {
  res.render('families/new');
});

// POST create new family
router.post('/', async (req, res) => {
  try {
    const familyData = {
      familyName: req.body.familyName,
      contactName: req.body.contactName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      address: {
        street: req.body.street || '',
        city: req.body.city || '',
        state: req.body.state || '',
        zipCode: req.body.zipCode || ''
      },
      preferredDeliveryType: req.body.preferredDeliveryType,
      availableDays: req.body.availableDays || [],
      maxMealsPerMonth: parseInt(req.body.maxMealsPerMonth) || 2,
      allergies: req.body.allergies || '',
      notes: req.body.notes || ''
    };

    const family = new Family(familyData);
    await family.save();
    
    res.redirect('/families');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating family');
  }
});

// GET family details
router.get('/:id', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    
    if (!family) {
      return res.status(404).send('Family not found');
    }
    
    res.render('families/show', { family });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading family');
  }
});

// GET edit family form
router.get('/:id/edit', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    
    if (!family) {
      return res.status(404).send('Family not found');
    }
    
    res.render('families/edit', { family });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading edit form');
  }
});

// PUT update family
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      familyName: req.body.familyName,
      contactName: req.body.contactName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      address: {
        street: req.body.street || '',
        city: req.body.city || '',
        state: req.body.state || '',
        zipCode: req.body.zipCode || ''
      },
      preferredDeliveryType: req.body.preferredDeliveryType,
      availableDays: req.body.availableDays || [],
      maxMealsPerMonth: parseInt(req.body.maxMealsPerMonth) || 2,
      allergies: req.body.allergies || '',
      notes: req.body.notes || '',
      isActive: req.body.isActive === 'on'
    };

    await Family.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/families/' + req.params.id);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating family');
  }
});

// DELETE family
router.delete('/:id', async (req, res) => {
  try {
    await Family.findByIdAndDelete(req.params.id);
    res.redirect('/families');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting family');
  }
});

// API endpoint to get active families
router.get('/api/active', async (req, res) => {
  try {
    const families = await Family.find({ isActive: true })
      .select('familyName contactName phoneNumber email')
      .sort({ familyName: 1 });
    
    res.json(families);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching families' });
  }
});

module.exports = router;