// routes/meals.js
const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const Family = require('../models/Family');
const Missionary = require('../models/Missionary');
const Companionship = require('../models/Companionship');
const moment = require('moment-timezone'); // CHANGED: Added timezone support

// GET all meals - UPDATED VERSION
router.get('/', async (req, res) => {
  try {
    console.log('DEBUG: Loading all meals');

    const meals = await Meal.find()
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries',
          model: 'Missionary'
        }
      })
      .sort({ date: 1 });

    // Debug log to see what we're getting
    console.log('DEBUG: Found', meals.length, 'meals');
    meals.forEach((meal, index) => {
      console.log(`Meal ${index + 1}:`, {
        id: meal._id,
        date: meal.date,
        hasCompanionship: !!meal.companionship,
        companionshipId: meal.companionship?._id,
        missionariesInCompanionship: meal.companionship?.missionaries?.length || 0,
        hasMissionaries: !!meal.missionaries,
        directMissionaries: meal.missionaries?.length || 0
      });
    });

    res.render('meals/index', { meals });
  } catch (error) {
    console.error('Error loading meals:', error);
    res.status(500).send('Error loading meals');
  }
});

// GET new meal form
router.get('/new', async (req, res) => {
  try {
    console.log('DEBUG: Loading new meal form...');
    console.log('DEBUG: Query parameters:', req.query);
    
    // Get the date from URL parameter if provided
    const selectedDate = req.query.date || null;
    console.log('DEBUG: Selected date from URL:', selectedDate);
    
    let families = [];
    let missionaries = [];
    let companionships = [];
    
    // Fetch families
    try {
      families = await Family.find({ isActive: true }).sort({ familyName: 1 });
      console.log('DEBUG: Found', families.length, 'families for new meal');
    } catch (familyError) {
      console.error('DEBUG: Error fetching families for new meal:', familyError);
      families = [];
    }
    
    // Fetch missionaries (legacy system support)
    try {
      missionaries = await Missionary.find({ isActive: true }).sort({ lastName: 1 });
      console.log('DEBUG: Found', missionaries.length, 'missionaries for new meal');
    } catch (missionaryError) {
      console.error('DEBUG: Error fetching missionaries for new meal:', missionaryError);
      missionaries = [];
    }
    
    // Fetch companionships (NEW SYSTEM - this is what we need!)
    try {
      console.log('DEBUG: Fetching companionships for new meal...');
      companionships = await Companionship.find({ isActive: true })
        .populate('missionaries')
        .sort({ area: 1 });
      console.log('DEBUG: Found', companionships.length, 'companionships for new meal');
      
      // Debug each companionship
      companionships.forEach((comp, index) => {
        console.log(`DEBUG: Companionship ${index + 1}:`, {
          id: comp._id,
          area: comp.area,
          missionariesCount: comp.missionaries ? comp.missionaries.length : 0,
          missionaryNames: comp.missionaries ? comp.missionaries.map(m => m.fullName || `${m.firstName} ${m.lastName}`) : []
        });
      });
    } catch (companionshipError) {
      console.error('DEBUG: Error fetching companionships for new meal:', companionshipError);
      companionships = [];
    }
    
    console.log('DEBUG: Rendering new meal template with data:', {
      selectedDate: selectedDate,
      familiesCount: families.length,
      missionariesCount: missionaries.length,
      companionshipsCount: companionships.length
    });
    
    // Always pass all variables, even if empty
    res.render('meals/new', {
      families: families || [],
      missionaries: missionaries || [],
      companionships: companionships || [],
      selectedDate: selectedDate, // Pass the selected date to the template
      moment: moment
    });
    
  } catch (error) {
    console.error('ERROR loading new meal form:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).send('Error loading meal form: ' + error.message);
  }
});

// POST create new meal
router.post('/', async (req, res) => {
  try {
    console.log('DEBUG: Creating new meal with date:', req.body.date);
    
    // FIX: Handle date properly to avoid timezone issues
    const dateParts = req.body.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);
    
    // Create date at noon local time to avoid timezone issues
    const mealDate = new Date(year, month, day, 12, 0, 0, 0);
    
    console.log('DEBUG: Date parsing for new meal:', {
      originalString: req.body.date,
      parsedParts: { year, month: month + 1, day },
      createdDate: mealDate,
      createdDateString: mealDate.toDateString()
    });
    
    const mealData = {
      date: mealDate, // Use the properly parsed date
      time: req.body.time,
      companionship: req.body.companionship,
      deliveryType: req.body.deliveryType,
      notes: req.body.notes || ''
    };

    // If family is assigned
    if (req.body.family && req.body.family !== '') {
      mealData.family = req.body.family;
      mealData.isAssigned = true;
    }

    console.log('DEBUG: Creating meal with data:', mealData);
    
    const meal = new Meal(mealData);
    await meal.save();
    
    console.log('DEBUG: Meal created successfully:', {
      id: meal._id,
      savedDate: meal.date,
      savedDateString: meal.date.toDateString()
    });

    res.redirect('/meals');
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).send('Error creating meal');
  }
});

// GET meal details
router.get('/:id', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id)
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries',
          model: 'Missionary'
        }
      });

    if (!meal) {
      return res.status(404).send('Meal not found');
    }

    res.render('meals/show', { meal });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading meal');
  }
});

// GET edit meal form - FIXED VERSION
router.get('/:id/edit', async (req, res) => {
  try {
    console.log('DEBUG: Starting /meals/:id/edit route for ID:', req.params.id);

    // Find the meal first with proper population
    const meal = await Meal.findById(req.params.id)
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries',
          model: 'Missionary'
        }
      });

    if (!meal) {
      return res.status(404).send('Meal not found');
    }

    console.log('DEBUG: Meal companionship data:', {
      companionship: meal.companionship,
      type: typeof meal.companionship,
      isArray: Array.isArray(meal.companionship)
    });

    // Extract missionaries from the companionship for the template
    let mealMissionaries = [];
    if (meal.companionship && meal.companionship.missionaries) {
      mealMissionaries = meal.companionship.missionaries;
    }

    // Add this to the meal object for template compatibility
    meal.missionaries = mealMissionaries;

    // Initialize with empty arrays as fallback
    let families = [];
    let missionaries = [];
    let companionships = [];

    try {
      console.log('DEBUG: Fetching families for edit...');
      families = await Family.find({ isActive: true }).sort({ familyName: 1 });
      console.log('DEBUG: Found', families.length, 'families for edit');
    } catch (familyError) {
      console.error('DEBUG: Error fetching families for edit:', familyError);
      families = [];
    }

    try {
      console.log('DEBUG: Fetching missionaries for edit...');
      missionaries = await Missionary.find({ isActive: true }).sort({ lastName: 1 });
      console.log('DEBUG: Found', missionaries.length, 'missionaries for edit');
    } catch (missionaryError) {
      console.error('DEBUG: Error fetching missionaries for edit:', missionaryError);
      missionaries = [];
    }

    try {
      console.log('DEBUG: Fetching companionships for edit...');
      companionships = await Companionship.find({ isActive: true })
        .populate('missionaries')
        .sort({ area: 1 });
      console.log('DEBUG: Found', companionships.length, 'companionships for edit');
    } catch (companionshipError) {
      console.error('DEBUG: Error fetching companionships for edit:', companionshipError);
      companionships = [];
    }

    console.log('DEBUG: Rendering edit template with data:', {
      mealId: meal._id,
      familiesCount: families.length,
      missionariesCount: missionaries.length,
      companionshipsCount: companionships.length,
      mealMissionariesCount: mealMissionaries.length
    });

    // Always pass all variables, even if empty
    res.render('meals/edit', {
      meal: meal,
      families: families || [],
      missionaries: missionaries || [],
      companionships: companionships || [],
      moment: moment // Make moment available in template
    });

  } catch (error) {
    console.error('ERROR in /meals/:id/edit route:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).send('Error loading edit form: ' + error.message);
  }
});

// PUT update meal - ENHANCED WITH DEBUG
router.put('/:id', async (req, res) => {
  try {
    console.log('\n=== DEBUG: PUT /meals/:id START ===');
    console.log('DEBUG: Meal ID:', req.params.id);
    console.log('DEBUG: Raw request body:', req.body);
    console.log('DEBUG: Original date from form:', req.body.date);
    
    // Validate required fields
    if (!req.body.companionship) {
      console.error('ERROR: No companionship in request body');
      return res.status(400).send('Companionship is required');
    }
    
    if (!req.body.date) {
      console.error('ERROR: No date in request body');
      return res.status(400).send('Date is required');
    }
    
    if (!req.body.time) {
      console.error('ERROR: No time in request body');
      return res.status(400).send('Time is required');
    }
    
    // Get the current meal to compare
    const currentMeal = await Meal.findById(req.params.id);
    if (!currentMeal) {
      console.error('ERROR: Meal not found for ID:', req.params.id);
      return res.status(404).send('Meal not found');
    }
    
    console.log('DEBUG: Current meal date BEFORE update:', currentMeal.date);
    
    // FIX: Handle date properly to avoid timezone issues
    // Parse the date string (YYYY-MM-DD) and create date at noon local time
    const dateParts = req.body.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);
    
    // Create date at noon local time to avoid timezone issues
    const mealDate = new Date(year, month, day, 12, 0, 0, 0);
    
    console.log('DEBUG: Date parsing:', {
      originalString: req.body.date,
      parsedParts: { year, month: month + 1, day },
      createdDate: mealDate,
      createdDateString: mealDate.toDateString(),
      createdDateISO: mealDate.toISOString()
    });
    
    const updateData = {
      date: mealDate, // Use the properly parsed date
      time: req.body.time,
      companionship: req.body.companionship,
      deliveryType: req.body.deliveryType || 'delivery',
      notes: req.body.notes || ''
    };

    // Handle family assignment
    if (req.body.family && req.body.family !== '' && req.body.family !== 'undefined') {
      updateData.family = req.body.family;
      updateData.isAssigned = true;
      console.log('DEBUG: Assigning family:', req.body.family);
    } else {
      updateData.family = null;
      updateData.isAssigned = false;
      console.log('DEBUG: No family assigned');
    }
    
    console.log('DEBUG: Prepared update data:', updateData);
    console.log('DEBUG: About to perform database update...');
    
    const updatedMeal = await Meal.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedMeal) {
      console.error('ERROR: Update failed - meal not found');
      return res.status(404).send('Meal not found');
    }
    
    console.log('DEBUG: Meal updated successfully - NEW DATA:', {
      id: updatedMeal._id,
      newDate: updatedMeal.date,
      newDateString: updatedMeal.date.toDateString(),
      newTime: updatedMeal.time
    });
    
    // Double-check by querying the database again
    const verifyMeal = await Meal.findById(req.params.id);
    console.log('DEBUG: Database verification check:', {
      id: verifyMeal._id,
      verifyDate: verifyMeal.date,
      verifyDateString: verifyMeal.date.toDateString()
    });
    
    console.log('DEBUG: Redirecting to:', '/meals/' + req.params.id);
    console.log('=== DEBUG: PUT /meals/:id END ===\n');
    
    res.redirect('/meals/' + req.params.id);
    
  } catch (error) {
    console.error('ERROR updating meal:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).send('Error updating meal: ' + error.message);
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