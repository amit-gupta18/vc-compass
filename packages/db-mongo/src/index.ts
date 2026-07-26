import mongoose from "mongoose";

export const defaultMongoUrl = "mongodb://127.0.0.1:27017/vc_brain?replicaSet=rs0";

export function createMongoUri() {
  return process.env.MONGODB_URL ?? defaultMongoUrl;
}

export async function connectMongo(uri = createMongoUri()) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}
