const express = require('express');
const router = express.Router();
const Missionary = require('../models/Missionary');

// GET all missionaries
router.get('/', async (req, res) => {
  try {
    const missionaries = await Missionary.find().sort({ companionshipArea: 1, lastName: 1 });
    
    // Group by companionship area
    const companionships = {};
    missionaries.forEach(missionary => {
      if (!companionships[missionary.companionshipArea]) {
        companionships[missionary.companionshipArea] = [];
      }
      companionships[missionary.companionshipArea].push(missionary);
    });
    
    res.render('missionaries/index', { missionaries, companionships });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading missionaries');
  }
});

// GET new missionary form
router.get('/new', (req, res) => {
  res.render('missionaries/new');
});

// POST create new missionary
router.post('/', async (req, res) => {
  try {
    const missionaryData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email || '',
      companionshipArea: req.body.companionshipArea,
      isTrainer: req.body.isTrainer === 'on',
      arrivalDate: new Date(req.body.arrivalDate),
      expectedDepartureDate: req.body.expectedDepartureDate ? new Date(req.body.expectedDepartureDate) : null,
      allergies: req.body.allergies || '',
      dietaryRestrictions: req.body.dietaryRestrictions || '',
      notes: req.body.notes || ''
    };

    const missionary = new Missionary(missionaryData);
    await missionary.save();
    
    res.redirect('/missionaries');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating missionary');
  }
});

// GET missionary details
router.get('/:id', async (req, res) => {
  try {
    const missionary = await Missionary.findById(req.params.id);
    
    if (!missionary) {
      return res.status(404).send('Missionary not found');
    }
    
    res.render('missionaries/show', { missionary });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading missionary');
  }
});

// GET edit missionary form
router.get('/:id/edit', async (req, res) => {
  try {
    const missionary = await Missionary.findById(req.params.id);
    
    if (!missionary) {
      return res.status(404).send('Missionary not found');
    }
    
    res.render('missionaries/edit', { missionary });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading edit form');
  }
});

// PUT update missionary
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email || '',
      companionshipArea: req.body.companionshipArea,
      isTrainer: req.body.isTrainer === 'on',
      arrivalDate: new Date(req.body.arrivalDate),
      expectedDepartureDate: req.body.expectedDepartureDate ? new Date(req.body.expectedDepartureDate) : null,
      allergies: req.body.allergies || '',
      dietaryRestrictions: req.body.dietaryRestrictions || '',
      notes: req.body.notes || '',
      isActive: req.body.isActive === 'on'
    };

    await Missionary.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/missionaries/' + req.params.id);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating missionary');
  }
});

// DELETE missionary
router.delete('/:id', async (req, res) => {
  try {
    await Missionary.findByIdAndDelete(req.params.id);
    res.redirect('/missionaries');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting missionary');
  }
});

// API endpoint to get missionaries by companionship area
router.get('/api/companionship/:area', async (req, res) => {
  try {
    const missionaries = await Missionary.find({ 
      companionshipArea: req.params.area,
      isActive: true 
    }).sort({ lastName: 1 });
    
    res.json(missionaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching missionaries' });
  }
});

// API endpoint to get all active missionaries
router.get('/api/active', async (req, res) => {
  try {
    const missionaries = await Missionary.find({ isActive: true })
      .select('firstName lastName fullName phoneNumber companionshipArea')
      .sort({ companionshipArea: 1, lastName: 1 });
    
    res.json(missionaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching missionaries' });
  }
});

module.exports = router;