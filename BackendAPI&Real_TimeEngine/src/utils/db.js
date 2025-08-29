import mongoose from 'mongoose';

/**
 * Connect to MongoDB with retry logic.
 * @param {string} uri Mongo connection string
 */
export async function connectDB (uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }
  mongoose.set('strictQuery', true);
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await mongoose.connect(uri, { autoIndex: true });
      // eslint-disable-next-line no-console
      console.log('Connected to MongoDB');
      return mongoose.connection;
    } catch (err) {
      attempts += 1;
      // eslint-disable-next-line no-console
      console.error(`MongoDB connection failed (attempt ${attempts}):`, err.message);
      if (attempts >= maxAttempts) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
    }
  }
  return null;
}
