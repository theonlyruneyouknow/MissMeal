const express = require('express');
const router = express.Router();
const Companionship = require('../models/Companionship');
const Missionary = require('../models/Missionary');

// GET all companionships
router.get('/', async (req, res) => {
  try {
    const companionships = await Companionship.find()
      .populate('missionaries')
      .sort({ isActive: -1, area: 1 });
    
    res.render('companionships/index', { companionships });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading companionships');
  }
});

// GET new companionship form
router.get('/new', async (req, res) => {
  try {
    // Get missionaries that are not already assigned to active companionships
    const activeCompanionships = await Companionship.find({ isActive: true }).populate('missionaries');
    const assignedMissionaryIds = activeCompanionships.flatMap(comp => comp.missionaries.map(m => m._id.toString()));
    
    const availableMissionaries = await Missionary.find({ 
      isActive: true,
      _id: { $nin: assignedMissionaryIds }
    }).sort({ lastName: 1 });
    
    res.render('companionships/new', { missionaries: availableMissionaries });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading form');
  }
});

// POST create new companionship
router.post('/', async (req, res) => {
  try {
    const companionshipData = {
      name: req.body.name,
      area: req.body.area,
      missionaries: req.body.missionaries || [],
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      notes: req.body.notes || ''
    };

    // Validate that we have at least one missionary
    if (!companionshipData.missionaries || companionshipData.missionaries.length === 0) {
      return res.status(400).send('At least one missionary must be assigned to the companionship');
    }

    const companionship = new Companionship(companionshipData);
    await companionship.save();
    
    res.redirect('/companionships');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating companionship');
  }
});

// GET companionship details
router.get('/:id', async (req, res) => {
  try {
    const companionship = await Companionship.findById(req.params.id)
      .populate('missionaries');
    
    if (!companionship) {
      return res.status(404).send('Companionship not found');
    }
    
    res.render('companionships/show', { companionship });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading companionship');
  }
});

// GET edit companionship form
router.get('/:id/edit', async (req, res) => {
  try {
    const companionship = await Companionship.findById(req.params.id)
      .populate('missionaries');
    
    if (!companionship) {
      return res.status(404).send('Companionship not found');
    }
    
    // Get missionaries that are not already assigned to OTHER active companionships
    const activeCompanionships = await Companionship.find({ 
      isActive: true,
      _id: { $ne: companionship._id }
    }).populate('missionaries');
    
    const assignedMissionaryIds = activeCompanionships.flatMap(comp => comp.missionaries.map(m => m._id.toString()));
    
    const availableMissionaries = await Missionary.find({ 
      isActive: true,
      _id: { $nin: assignedMissionaryIds }
    }).sort({ lastName: 1 });
    
    res.render('companionships/edit', { 
      companionship, 
      missionaries: availableMissionaries 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading edit form');
  }
});

// PUT update companionship
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      area: req.body.area,
      missionaries: req.body.missionaries || [],
      startDate: new Date(req.body.startDate),
      notes: req.body.notes || ''
    };

    // Validate that we have at least one missionary
    if (!updateData.missionaries || updateData.missionaries.length === 0) {
      return res.status(400).send('At least one missionary must be assigned to the companionship');
    }

    await Companionship.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/companionships/' + req.params.id);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating companionship');
  }
});

// POST archive companionship
router.post('/:id/archive', async (req, res) => {
  try {
    const companionship = await Companionship.findById(req.params.id);
    
    if (!companionship) {
      return res.status(404).json({ error: 'Companionship not found' });
    }

    await companionship.archive();
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ success: true, message: 'Companionship archived successfully' });
    } else {
      res.redirect('/companionships');
    }
  } catch (error) {
    console.error(error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ error: 'Error archiving companionship' });
    } else {
      res.status(500).send('Error archiving companionship');
    }
  }
});

// POST reactivate companionship
router.post('/:id/reactivate', async (req, res) => {
  try {
    const companionship = await Companionship.findById(req.params.id);
    
    if (!companionship) {
      return res.status(404).json({ error: 'Companionship not found' });
    }

    await companionship.reactivate();
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ success: true, message: 'Companionship reactivated successfully' });
    } else {
      res.redirect('/companionships');
    }
  } catch (error) {
    console.error(error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ error: 'Error reactivating companionship' });
    } else {
      res.status(500).send('Error reactivating companionship');
    }
  }
});

// DELETE companionship (permanent deletion)
router.delete('/:id', async (req, res) => {
  try {
    await Companionship.findByIdAndDelete(req.params.id);
    res.redirect('/companionships');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting companionship');
  }
});

// API endpoint to get active companionships
router.get('/api/active', async (req, res) => {
  try {
    const companionships = await Companionship.find({ isActive: true })
      .populate('missionaries', 'firstName lastName fullName phoneNumber')
      .sort({ area: 1 });
    
    res.json(companionships);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching companionships' });
  }
});

module.exports = router;