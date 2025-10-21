// ...existing code...
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI missing in environment. Ensure .env exists and contains MONGO_URI.');
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
    throw err;
  }
};
// ...existing code...