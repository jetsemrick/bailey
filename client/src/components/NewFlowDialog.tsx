import { useState, type FormEvent } from 'react';
import type { FlowTabKind, FlowTabTemplate, FlowTabTemplateTab } from '../db/types';
import { BUILT_IN_TEMPLATES } from '../db/types';
import { useFlowTabTemplates } from '../hooks/useFlowTabTemplates';

interface NewFlowDialogProps {
  onSubmit: (initiatedBy: 'aff' | 'neg', count: number, tabKind?: FlowTabKind) => void;
  onSubmitTemplate: (tabs: FlowTabTemplateTab[]) => void;
  onCancel: () => void;
  /** When true, CX option is disabled (DEB-28: one CX per round). */
  hasCxTab?: boolean;
}

function normalizeTabCountInput(value: string): string {
  if (value === '') return '';
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return '';
  return String(Math.min(20, num));
}

export default function NewFlowDialog({ 
  onSubmit, 
  onSubmitTemplate, 
  onCancel, 
  hasCxTab = false 
}: NewFlowDialogProps) {
  const [mode, setMode] = useState<'manual' | 'template'>('manual');
  const [countInput, setCountInput] = useState('1');
  const tabCount = Math.max(1, parseInt(countInput, 10) || 1);
  const [side, setSide] = useState<'aff' | 'neg'>('aff');
  const [sheetKind, setSheetKind] = useState<'standard' | 'cx'>('standard');
  const [submitting, setSubmitting] = useState(false);
  
  const { templates, create: createTemplate, remove: removeTemplate } = useFlowTabTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const allTemplates = [
    ...BUILT_IN_TEMPLATES.map((t, i) => ({ 
      ...t, 
      id: `built-in-${i}`, 
      user_id: '', 
      created_at: '', 
      updated_at: '' 
    })),
    ...templates
  ];

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (sheetKind === 'cx') {
        await onSubmit('aff', 1, 'cx');
      } else {
        await onSubmit(side, tabCount, 'standard');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTemplateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !selectedTemplateId) return;
    
    const template = allTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const hasCxInTemplate = template.tabs.some(t => t.tab_kind === 'cx' || t.position_name === 'CX');
    if (hasCxInTemplate && hasCxTab) {
      alert('This template includes a CX tab, but this round already has one. Only one CX tab is allowed per round.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTemplate(template.tabs);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (savingTemplate || !saveTemplateName.trim()) return;

    const tabs: FlowTabTemplateTab[] = [];
    if (sheetKind === 'cx') {
      tabs.push({ position_name: 'CX', initiated_by: 'aff', tab_kind: 'cx' });
    } else {
      const prefix = side === 'aff' ? 'AFF' : 'NEG';
      for (let i = 0; i < tabCount; i++) {
        tabs.push({
          position_name: `${prefix} ${i + 1}`,
          initiated_by: side,
          tab_kind: 'standard'
        });
      }
    }

    setSavingTemplate(true);
    try {
      await createTemplate({ name: saveTemplateName.trim(), tabs });
      setSaveTemplateName('');
      setShowSaveTemplate(false);
      setMode('template');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await removeTemplate(templateId);
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-full max-w-md">
        <h2 className="text-base font-semibold mb-4">Add Flow Tabs</h2>
        
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-accent/15 text-accent border border-accent/40'
                : 'bg-card-02 text-foreground/70 hover:bg-card-03'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'template'
                ? 'bg-accent/15 text-accent border border-accent/40'
                : 'bg-card-02 text-foreground/70 hover:bg-card-03'
            }`}
          >
            Templates
          </button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Sheet type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSheetKind('standard')}
                  className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                    sheetKind === 'standard'
                      ? 'bg-accent/15 text-accent border border-accent/40'
                      : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  disabled={hasCxTab}
                  onClick={() => setSheetKind('cx')}
                  title={hasCxTab ? 'This round already has a CX tab' : 'Cross-examination (one per round)'}
                  className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                    sheetKind === 'cx'
                      ? 'bg-accent/15 text-accent border border-accent/40'
                      : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                  } ${hasCxTab ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  CX
                </button>
              </div>
              {sheetKind === 'cx' && (
                <p className="text-xs text-foreground/50 mt-1">
                  Full speech grid like an affirmative flow. Only one CX tab per round.
                </p>
              )}
            </div>
            {sheetKind === 'standard' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Tabs</label>
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    max={20}
                    value={countInput}
                    onChange={(e) => setCountInput(normalizeTabCountInput(e.target.value))}
                    className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Initiated By</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSide('aff')}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        side === 'aff'
                          ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                          : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                      }`}
                    >
                      Affirmative
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide('neg')}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        side === 'neg'
                          ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                          : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                      }`}
                    >
                      Negative
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {!showSaveTemplate && (
              <button
                type="button"
                onClick={() => setShowSaveTemplate(true)}
                className="w-full py-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Save as Template
              </button>
            )}

            {showSaveTemplate && (
              <div className="p-3 bg-card-02 rounded space-y-2">
                <input
                  type="text"
                  placeholder="Template name..."
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate || !saveTemplateName.trim()}
                    className="flex-1 py-1 text-sm bg-accent text-white rounded hover:bg-accent/90 transition-colors disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveTemplate(false);
                      setSaveTemplateName('');
                    }}
                    className="flex-1 py-1 text-sm bg-card-03 text-foreground rounded hover:bg-card-04 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting || (sheetKind === 'cx' && hasCxTab)}
                className="flex-1 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {sheetKind === 'cx'
                  ? 'Create CX tab'
                  : tabCount > 1
                    ? `Create ${tabCount} Tabs`
                    : 'Create Tab'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-1.5 bg-card-02 text-foreground rounded text-sm font-medium hover:bg-card-03 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleTemplateSubmit} className="space-y-3">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {allTemplates.map((template) => {
                const isBuiltIn = template.id.startsWith('built-in-');
                const isSelected = selectedTemplateId === template.id;
                return (
                  <div
                    key={template.id}
                    className={`p-3 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent/10'
                        : 'border-card-04 bg-card-02 hover:border-card-05'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-foreground/60 mt-1">
                          {template.tabs.map((t, i) => (
                            <span key={i}>
                              {i > 0 && ', '}
                              {t.position_name}
                              {t.tab_kind === 'cx' && ' (CX)'}
                            </span>
                          ))}
                        </div>
                      </div>
                      {!isBuiltIn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="ml-2 text-xs text-foreground/40 hover:text-red-500 transition-colors"
                          title="Delete template"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {allTemplates.length === 0 && (
                <p className="text-sm text-foreground/50 text-center py-4">
                  No templates yet. Create one from the Manual tab.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedTemplateId}
                className="flex-1 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                Apply Template
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-1.5 bg-card-02 text-foreground rounded text-sm font-medium hover:bg-card-03 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
