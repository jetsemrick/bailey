import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;

    const updateData: { name?: string; order?: number } = {};
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;

    const sheet = await prisma.sheet.update({
      where: { id },
      data: updateData,
    });

    res.json(sheet);
  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).json({ error: 'Failed to update sheet' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.sheet.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting sheet:', error);
    res.status(500).json({ error: 'Failed to delete sheet' });
  }
});

router.put('/:id/cells', async (req, res) => {
  try {
    const { id: sheetId } = req.params;
    const { cells } = req.body;

    if (!Array.isArray(cells)) {
      return res.status(400).json({ error: 'Cells must be an array' });
    }

    const operations = cells.map((cell: { row: number; column: number; content: string }) =>
      prisma.cell.upsert({
        where: {
          sheetId_row_column: {
            sheetId,
            row: cell.row,
            column: cell.column,
          },
        },
        update: {
          content: cell.content,
        },
        create: {
          sheetId,
          row: cell.row,
          column: cell.column,
          content: cell.content,
        },
      })
    );

    await Promise.all(operations);

    const updatedCells = await prisma.cell.findMany({
      where: { sheetId },
    });

    res.json(updatedCells);
  } catch (error) {
    console.error('Error updating cells:', error);
    res.status(500).json({ error: 'Failed to update cells' });
  }
});

router.get('/:id/cells', async (req, res) => {
  try {
    const cells = await prisma.cell.findMany({
      where: { sheetId: req.params.id },
    });
    res.json(cells);
  } catch (error) {
    console.error('Error fetching cells:', error);
    res.status(500).json({ error: 'Failed to fetch cells' });
  }
});

export default router;


