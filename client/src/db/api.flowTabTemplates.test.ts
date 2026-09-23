import { beforeEach, describe, expect, test, vi } from 'vitest';

const { fromMock, getSessionMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: fromMock,
    auth: {
      getSession: getSessionMock,
    },
  },
}));

import {
  createFlowTabTemplate,
  deleteFlowTabTemplate,
  listFlowTabTemplates,
  updateFlowTabTemplate,
} from './api';

describe('Flow Tab Templates API', () => {
  beforeEach(() => {
    fromMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
  });

  describe('listFlowTabTemplates', () => {
    test('lists templates for current user sorted by name', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'template-1',
            user_id: 'user-1',
            name: 'Standard NEG',
            tabs: [
              { position_name: 'T', initiated_by: 'neg' },
              { position_name: 'DA', initiated_by: 'neg' },
            ],
            created_at: '2026-03-11T00:00:00.000Z',
            updated_at: '2026-03-11T00:00:00.000Z',
          },
        ],
        error: null,
      });
      const eqMock = vi.fn(() => ({ order: orderMock }));
      const selectMock = vi.fn(() => ({ eq: eqMock }));
      fromMock.mockReturnValue({ select: selectMock });

      const templates = await listFlowTabTemplates();

      expect(fromMock).toHaveBeenCalledWith('flow_tab_templates');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({
        name: 'Standard NEG',
        tabs: [
          { position_name: 'T', initiated_by: 'neg' },
          { position_name: 'DA', initiated_by: 'neg' },
        ],
      });
    });
  });

  describe('createFlowTabTemplate', () => {
    test('creates a new template for the current user', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'template-1',
          user_id: 'user-1',
          name: 'My Template',
          tabs: [{ position_name: 'DA', initiated_by: 'neg' }],
          created_at: '2026-03-11T00:00:00.000Z',
          updated_at: '2026-03-11T00:00:00.000Z',
        },
        error: null,
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      fromMock.mockReturnValue({ insert: insertMock });

      const template = await createFlowTabTemplate({
        name: 'My Template',
        tabs: [{ position_name: 'DA', initiated_by: 'neg' }],
      });

      expect(fromMock).toHaveBeenCalledWith('flow_tab_templates');
      expect(insertMock).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'My Template',
        tabs: [{ position_name: 'DA', initiated_by: 'neg' }],
      });
      expect(template).toMatchObject({
        id: 'template-1',
        name: 'My Template',
      });
    });
  });

  describe('updateFlowTabTemplate', () => {
    test('updates template name', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'template-1',
          user_id: 'user-1',
          name: 'Updated Name',
          tabs: [{ position_name: 'DA', initiated_by: 'neg' }],
          created_at: '2026-03-11T00:00:00.000Z',
          updated_at: '2026-03-12T00:00:00.000Z',
        },
        error: null,
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const eqMock = vi.fn(() => ({ select: selectMock }));
      const updateMock = vi.fn(() => ({ eq: eqMock }));
      fromMock.mockReturnValue({ update: updateMock });

      const template = await updateFlowTabTemplate('template-1', {
        name: 'Updated Name',
      });

      expect(fromMock).toHaveBeenCalledWith('flow_tab_templates');
      expect(updateMock).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(eqMock).toHaveBeenCalledWith('id', 'template-1');
      expect(template.name).toBe('Updated Name');
    });

    test('updates template tabs', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'template-1',
          user_id: 'user-1',
          name: 'My Template',
          tabs: [
            { position_name: 'T', initiated_by: 'neg' },
            { position_name: 'CP', initiated_by: 'neg' },
          ],
          created_at: '2026-03-11T00:00:00.000Z',
          updated_at: '2026-03-12T00:00:00.000Z',
        },
        error: null,
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const eqMock = vi.fn(() => ({ select: selectMock }));
      const updateMock = vi.fn(() => ({ eq: eqMock }));
      fromMock.mockReturnValue({ update: updateMock });

      const template = await updateFlowTabTemplate('template-1', {
        tabs: [
          { position_name: 'T', initiated_by: 'neg' },
          { position_name: 'CP', initiated_by: 'neg' },
        ],
      });

      expect(updateMock).toHaveBeenCalledWith({
        tabs: [
          { position_name: 'T', initiated_by: 'neg' },
          { position_name: 'CP', initiated_by: 'neg' },
        ],
      });
      expect(template.tabs).toHaveLength(2);
    });
  });

  describe('deleteFlowTabTemplate', () => {
    test('deletes a template', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn(() => ({ eq: eqMock }));
      fromMock.mockReturnValue({ delete: deleteMock });

      await deleteFlowTabTemplate('template-1');

      expect(fromMock).toHaveBeenCalledWith('flow_tab_templates');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'template-1');
    });
  });
});
