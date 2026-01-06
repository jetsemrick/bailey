import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const flows = await prisma.flow.findMany({
      include: {
        sheets: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(flows);
  } catch (error) {
    console.error('Error fetching flows:', error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
      include: {
        sheets: {
          orderBy: { order: 'asc' },
          include: {
            cells: true,
          },
        },
      },
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    res.json(flow);
  } catch (error) {
    console.error('Error fetching flow:', error);
    res.status(500).json({ error: 'Failed to fetch flow' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const flow = await prisma.flow.create({
      data: {
        name: name || 'Untitled Flow',
        sheets: {
          create: {
            name: 'Sheet 1',
            order: 0,
          },
        },
      },
      include: {
        sheets: {
          orderBy: { order: 'asc' },
        },
      },
    });
    res.status(201).json(flow);
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const flow = await prisma.flow.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(flow);
  } catch (error) {
    console.error('Error updating flow:', error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.flow.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting flow:', error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

router.post('/:flowId/sheets', async (req, res) => {
  try {
    const { flowId } = req.params;
    const { name } = req.body;

    const sheetCount = await prisma.sheet.count({
      where: { flowId },
    });

    const sheet = await prisma.sheet.create({
      data: {
        flowId,
        name: name || `Sheet ${sheetCount + 1}`,
        order: sheetCount,
      },
    });

    res.status(201).json(sheet);
  } catch (error) {
    console.error('Error creating sheet:', error);
    res.status(500).json({ error: 'Failed to create sheet' });
  }
});

export default router;



