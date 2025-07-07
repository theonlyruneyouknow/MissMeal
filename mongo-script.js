const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/missionary-meals', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define schemas (old and new structures)
const OldMealSchema = new mongoose.Schema({
  date: Date,
  time: String,
  companionship: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Missionary' }], // Old: array of missionaries
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  deliveryType: String,
  notes: String,
  isAssigned: Boolean,
  reminderSent: Boolean,
  createdAt: Date
});

const NewMealSchema = new mongoose.Schema({
  date: Date,
  time: String,
  companionship: { type: mongoose.Schema.Types.ObjectId, ref: 'Companionship' }, // New: single companionship
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  deliveryType: String,
  notes: String,
  isAssigned: Boolean,
  reminderSent: Boolean,
  createdAt: Date
});

const CompanionshipSchema = new mongoose.Schema({
  name: String,
  area: String,
  missionaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Missionary' }],
  isActive: Boolean,
  startDate: Date,
  endDate: Date,
  notes: String,
  createdAt: Date
});

const MissionarySchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  fullName: String,
  phoneNumber: String,
  email: String,
  companionshipArea: String,
  isTrainer: Boolean,
  arrivalDate: Date,
  expectedDepartureDate: Date,
  allergies: String,
  dietaryRestrictions: String,
  isActive: Boolean,
  notes: String,
  createdAt: Date
});

// Create models
const OldMeal = mongoose.model('OldMeal', OldMealSchema, 'meals');
const NewMeal = mongoose.model('NewMeal', NewMealSchema, 'meals_new');
const Companionship = mongoose.model('Companionship', CompanionshipSchema);
const Missionary = mongoose.model('Missionary', MissionarySchema);

async function migrate() {
  try {
    console.log('Starting migration to companionship-based meals...');
    
    // Step 1: Get all old meals
    const oldMeals = await OldMeal.find().populate('companionship');
    console.log(`Found ${oldMeals.length} meals to migrate`);
    
    // Step 2: Group missionaries by companionship area to create companionships
    const missionariesByArea = {};
    const allMissionaries = await Missionary.find({ isActive: true });
    
    allMissionaries.forEach(missionary => {
      if (!missionariesByArea[missionary.companionshipArea]) {
        missionariesByArea[missionary.companionshipArea] = [];
      }
      missionariesByArea[missionary.companionshipArea].push(missionary);
    });
    
    console.log(`Found ${Object.keys(missionariesByArea).length} different companionship areas`);
    
    // Step 3: Create companionships from existing data
    const createdCompanionships = {};
    
    for (const [area, missionaries] of Object.entries(missionariesByArea)) {
      // Create companionship name from missionaries
      const missionaryNames = missionaries.map(m => m.lastName).join(' & ');
      const companionshipName = `Sisters ${missionaryNames}`;
      
      const companionship = new Companionship({
        name: companionshipName,
        area: area,
        missionaries: missionaries.map(m => m._id),
        isActive: true,
        startDate: new Date(), // You might want to adjust this
        notes: `Auto-created during migration on ${new Date().toLocaleDateString()}`
      });
      
      const savedCompanionship = await companionship.save();
      createdCompanionships[area] = savedCompanionship;
      
      console.log(`Created companionship: ${companionshipName} in ${area}`);
    }
    
    // Step 4: Migrate meals to use companionships
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const oldMeal of oldMeals) {
      try {
        if (!oldMeal.companionship || oldMeal.companionship.length === 0) {
          console.log(`Skipping meal ${oldMeal._id} - no missionaries assigned`);
          skippedCount++;
          continue;
        }
        
        // Find the companionship area from the first missionary
        const firstMissionary = oldMeal.companionship[0];
        const companionshipArea = firstMissionary.companionshipArea;
        const targetCompanionship = createdCompanionships[companionshipArea];
        
        if (!targetCompanionship) {
          console.log(`Warning: No companionship found for area ${companionshipArea} - skipping meal ${oldMeal._id}`);
          skippedCount++;
          continue;
        }
        
        // Create new meal with companionship reference
        const newMeal = new NewMeal({
          date: oldMeal.date,
          time: oldMeal.time,
          companionship: targetCompanionship._id, // Now points to companionship instead of missionaries
          family: oldMeal.family,
          deliveryType: oldMeal.deliveryType,
          notes: oldMeal.notes,
          isAssigned: oldMeal.isAssigned,
          reminderSent: oldMeal.reminderSent,
          createdAt: oldMeal.createdAt
        });
        
        await newMeal.save();
        migratedCount++;
        
      } catch (error) {
        console.error(`Error migrating meal ${oldMeal._id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Companionships created: ${Object.keys(createdCompanionships).length}`);
    console.log(`Meals migrated: ${migratedCount}`);
    console.log(`Meals skipped: ${skippedCount}`);
    console.log(`Total meals processed: ${oldMeals.length}`);
    
    // Step 5: Backup and replace collections
    console.log('\nBacking up old meals collection...');
    const db = mongoose.connection.db;
    
    // Rename old collection to backup
    try {
      await db.collection('meals').rename('meals_backup_' + Date.now());
      console.log('Old meals collection backed up successfully');
    } catch (error) {
      console.log('Backup creation failed (collection might not exist):', error.message);
    }
    
    // Rename new collection to replace old one
    await db.collection('meals_new').rename('meals');
    console.log('New meals collection is now active');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNOTE: The old meals collection has been backed up.');
    console.log('If everything works correctly, you can delete the backup collection later.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
async function runMigration() {
  try {
    await mongoose.connection.once('open', () => {
      console.log('Connected to MongoDB');
    });
    
    await migrate();
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Ask for confirmation before running
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nThis will migrate your meal data from individual missionaries to companionships.\nMake sure you have a backup of your database!\n\nContinue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    runMigration();
  } else {
    console.log('Migration cancelled');
    rl.close();
    process.exit(0);
  }
});