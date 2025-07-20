const express = require('express');
const router = express.Router();
const Missionary = require('../models/Missionary');

// GET /missionaries - List all missionaries
router.get('/', async (req, res) => {
  try {
    const missionaries = await Missionary.find().sort({ lastName: 1, firstName: 1 });
    res.render('missionaries/index', { missionaries });
  } catch (error) {
    console.error('Error fetching missionaries:', error);
    res.status(500).send('Error fetching missionaries');
  }
});

// GET /missionaries/new - Show form to create new missionary
router.get('/new', (req, res) => {
  res.render('missionaries/new', { missionary: {} });
});

// POST /missionaries - Create new missionary
router.post('/', async (req, res) => {
  try {
    const missionary = new Missionary(req.body);
    await missionary.save();
    res.redirect('/missionaries');
  } catch (error) {
    console.error('Error creating missionary:', error);
    res.status(500).send('Error creating missionary');
  }
});

// GET /missionaries/:id - Show specific missionary
router.get('/:id', async (req, res) => {
  try {
    const missionary = await Missionary.findById(req.params.id);
    if (!missionary) {
      return res.status(404).send('Missionary not found');
    }
    res.render('missionaries/show', { missionary });
  } catch (error) {
    console.error('Error fetching missionary:', error);
    res.status(500).send('Error fetching missionary');
  }
});

// GET /missionaries/:id/edit - Show form to edit missionary
router.get('/:id/edit', async (req, res) => {
  try {
    const missionary = await Missionary.findById(req.params.id);
    if (!missionary) {
      return res.status(404).send('Missionary not found');
    }
    res.render('missionaries/edit', { missionary });
  } catch (error) {
    console.error('Error loading edit missionary form:', error);
    res.status(500).send('Error loading edit missionary form');
  }
});

// PUT /missionaries/:id - Update missionary
router.put('/:id', async (req, res) => {
  try {
    await Missionary.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/missionaries/${req.params.id}`);
  } catch (error) {
    console.error('Error updating missionary:', error);
    res.status(500).send('Error updating missionary');
  }
});

// DELETE /missionaries/:id - Delete missionary
router.delete('/:id', async (req, res) => {
  try {
    await Missionary.findByIdAndDelete(req.params.id);
    res.redirect('/missionaries');
  } catch (error) {
    console.error('Error deleting missionary:', error);
    res.status(500).send('Error deleting missionary');
  }
});

module.exports = router;