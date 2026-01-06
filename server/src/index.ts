import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import flowRoutes from './routes/flows.js';
import sheetRoutes from './routes/sheets.js';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/flows', flowRoutes);
app.use('/api/sheets', sheetRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { prisma };



