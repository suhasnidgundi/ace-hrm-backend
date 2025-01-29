import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

console.log('Starting server initialization...');

dotenv.config();
console.log('Environment variables loaded');

const app = express();
const port = process.env.PORT || 3000;

console.log(`Port configured: ${port}`);

app.use(cors());
app.use(express.json());
app.use('/', routes);

console.log('Attempting MongoDB connection...');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ace-hrm')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

export default app;