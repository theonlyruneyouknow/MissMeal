const express = require('express');
const router = express.Router();
const Companionship = require('../models/Companionship');
const Missionary = require('../models/Missionary');

// GET /companionships - List all companionships
router.get('/', async (req, res) => {
  try {
    const companionships = await Companionship.find().populate('missionaries');
    res.render('companionships/index', { companionships });
  } catch (error) {
    console.error('Error fetching companionships:', error);
    res.status(500).send('Error fetching companionships');
  }
});

// GET /companionships/new - Show form to create new companionship
router.get('/new', async (req, res) => {
  try {
    const missionaries = await Missionary.find().sort({ lastName: 1, firstName: 1 });
    res.render('companionships/new', { companionship: {}, missionaries });
  } catch (error) {
    console.error('Error loading new companionship form:', error);
    res.status(500).send('Error loading new companionship form');
  }
});

// POST /companionships - Create new companionship
router.post('/', async (req, res) => {
  try {
    const companionship = new Companionship(req.body);
    await companionship.save();
    res.redirect('/companionships');
  } catch (error) {
    console.error('Error creating companionship:', error);
    res.status(500).send('Error creating companionship');
  }
});

// GET /companionships/:id - Show specific companionship
router.get('/:id', async (req, res) => {
  try {
    const companionship = await Companionship.findById(req.params.id).populate('missionaries');
    if (!companionship) {
      return res.status(404).send('Companionship not found');
    }
    res.render('companionships/show', { companionship });
  } catch (error) {
    console.error('Error fetching companionship:', error);
    res.status(500).send('Error fetching companionship');
  }
});

// GET /companionships/:id/edit - Show form to edit companionship
router.get('/:id/edit', async (req, res) => {
  try {
    const companionship = await Companionship.findById(req.params.id);
    const missionaries = await Missionary.find().sort({ lastName: 1, firstName: 1 });
    if (!companionship) {
      return res.status(404).send('Companionship not found');
    }
    res.render('companionships/edit', { companionship, missionaries });
  } catch (error) {
    console.error('Error loading edit companionship form:', error);
    res.status(500).send('Error loading edit companionship form');
  }
});

// PUT /companionships/:id - Update companionship
router.put('/:id', async (req, res) => {
  try {
    await Companionship.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/companionships/${req.params.id}`);
  } catch (error) {
    console.error('Error updating companionship:', error);
    res.status(500).send('Error updating companionship');
  }
});

// DELETE /companionships/:id - Delete companionship
router.delete('/:id', async (req, res) => {
  try {
    await Companionship.findByIdAndDelete(req.params.id);
    res.redirect('/companionships');
  } catch (error) {
    console.error('Error deleting companionship:', error);
    res.status(500).send('Error deleting companionship');
  }
});

module.exports = router;