const mongoose = require('mongoose');

const DEFAULT_LOCAL_URI = 'mongodb://localhost:27017/shoping-mall';

const getMongoUri = () => {
  const atlasUri = process.env.MONGODB_ATLAS_URL?.trim();

  if (atlasUri) {
    return atlasUri;
  }

  return process.env.MONGODB_URI?.trim() || DEFAULT_LOCAL_URI;
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = getMongoUri();

  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.close();
  console.log('MongoDB disconnected');
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
