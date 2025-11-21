import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let db: Db;

export const dbConnect = async (): Promise<Db> => {
  if (db) return db;
  const client = new MongoClient(process.env.MONGO_URI!);
  await client.connect();
  db = client.db();
  console.log("✅ MongoDB connected");
  return db;
};
