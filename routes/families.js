const express = require('express');
const router = express.Router();
const Family = require('../models/Family');

// GET /families - List all families
router.get('/', async (req, res) => {
  try {
    const families = await Family.find().sort({ familyName: 1 });
    res.render('families/index', { families });
  } catch (error) {
    console.error('Error fetching families:', error);
    res.status(500).send('Error fetching families');
  }
});

// GET /families/new - Show form to create new family
router.get('/new', (req, res) => {
  res.render('families/new', { family: {} });
});

// POST /families - Create new family
router.post('/', async (req, res) => {
  try {
    const family = new Family(req.body);
    await family.save();
    res.redirect('/families');
  } catch (error) {
    console.error('Error creating family:', error);
    res.status(500).send('Error creating family');
  }
});

// GET /families/:id - Show specific family
router.get('/:id', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).send('Family not found');
    }
    res.render('families/show', { family });
  } catch (error) {
    console.error('Error fetching family:', error);
    res.status(500).send('Error fetching family');
  }
});

// GET /families/:id/edit - Show form to edit family
router.get('/:id/edit', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).send('Family not found');
    }
    res.render('families/edit', { family });
  } catch (error) {
    console.error('Error loading edit family form:', error);
    res.status(500).send('Error loading edit family form');
  }
});

// PUT /families/:id - Update family
router.put('/:id', async (req, res) => {
  try {
    await Family.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/families/${req.params.id}`);
  } catch (error) {
    console.error('Error updating family:', error);
    res.status(500).send('Error updating family');
  }
});

// DELETE /families/:id - Delete family
router.delete('/:id', async (req, res) => {
  try {
    await Family.findByIdAndDelete(req.params.id);
    res.redirect('/families');
  } catch (error) {
    console.error('Error deleting family:', error);
    res.status(500).send('Error deleting family');
  }
});

module.exports = router;