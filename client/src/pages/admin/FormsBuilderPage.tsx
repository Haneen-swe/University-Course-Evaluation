import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Plus, Trash2, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

type QuestionType = 'likert' | 'single_choice' | 'multi_choice' | 'open_text';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  isRequired: boolean;
  orderIndex: number;
  options?: { value: string; label: string }[];
  scaleMin?: number;
  scaleMax?: number;
}

interface Form {
  id: string;
  title: string;
  description?: string;
  version: number;
  isPublished: boolean;
  questions: Question[];
}

const defaultQuestion = (): Omit<Question, 'id' | 'orderIndex'> => ({
  type: 'likert',
  text: '',
  isRequired: true,
  scaleMin: 1,
  scaleMax: 5,
});

export function FormsBuilderPage() {
  const qc = useQueryClient();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormData, setNewFormData] = useState({ title: '', description: '' });
  const [newFormError, setNewFormError] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQ, setNewQ] = useState(defaultQuestion());
  const [newQOptions, setNewQOptions] = useState<{ value: string; label: string }[]>([
    { value: '1', label: 'Option 1' },
  ]);
  const [questionError, setQuestionError] = useState('');

  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => api.get<{ success: true; data: Form[] }>('/forms').then(r => r.data.data),
  });

  const selectedForm = forms?.find(f => f.id === selectedFormId) ?? null;

  const createFormMutation = useMutation({
    mutationFn: (payload: typeof newFormData) => api.post('/forms', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      setShowNewForm(false);
      setNewFormData({ title: '', description: '' });
      setNewFormError('');
      setSelectedFormId(res.data.data.id);
    },
    onError: (e: any) => setNewFormError(e?.response?.data?.error?.message ?? 'Create failed'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/forms/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/forms/${id}/clone`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      setSelectedFormId(res.data.data.id);
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: ({ formId, question }: { formId: string; question: any }) =>
      api.post(`/forms/${formId}/questions`, question),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      setAddingQuestion(false);
      setNewQ(defaultQuestion());
      setNewQOptions([{ value: '1', label: 'Option 1' }]);
      setQuestionError('');
    },
    onError: (e: any) => setQuestionError(e?.response?.data?.error?.message ?? 'Failed to add question'),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ formId, qId }: { formId: string; qId: string }) =>
      api.delete(`/forms/${formId}/questions/${qId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });

  const handleAddQuestion = () => {
    if (!selectedFormId) return;
    if (!newQ.text.trim()) { setQuestionError('Question text is required.'); return; }
    const nextOrder = (selectedForm?.questions.length ?? 0) + 1;
    const payload: any = { ...newQ, orderIndex: nextOrder };
    if (newQ.type === 'single_choice' || newQ.type === 'multi_choice') {
      payload.options = newQOptions;
    } else {
      delete payload.options;
    }
    if (newQ.type !== 'likert') {
      delete payload.scaleMin;
      delete payload.scaleMax;
    }
    addQuestionMutation.mutate({ formId: selectedFormId, question: payload });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Evaluation Form Templates</h1>
        <button
          onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* New form dialog */}
      {showNewForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">Create New Form Template</h2>
          {newFormError && <p className="text-xs text-destructive">{newFormError}</p>}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input
                type="text"
                value={newFormData.title}
                onChange={e => setNewFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Standard Course Evaluation v1"
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Description (optional)</label>
              <input
                type="text"
                value={newFormData.description}
                onChange={e => setNewFormData(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createFormMutation.mutate(newFormData)}
              disabled={createFormMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
            >
              {createFormMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Form list */}
        <div className="col-span-1 space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Templates</h2>
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {forms?.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFormId(f.id)}
              className={`w-full text-left p-3 border rounded-lg text-sm transition-colors ${
                selectedFormId === f.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-muted'
              }`}
            >
              <div className="font-medium truncate">{f.title}</div>
              <div className={`text-xs mt-0.5 ${selectedFormId === f.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                v{f.version} · {f.questions?.length ?? 0} questions ·{' '}
                <span className={f.isPublished ? 'text-green-600' : 'text-amber-600'}>
                  {f.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </button>
          ))}
          {!isLoading && forms?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No templates yet.</p>
          )}
        </div>

        {/* Form detail / question builder */}
        <div className="col-span-2 space-y-4">
          {!selectedForm && (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              Select a template to view or edit its questions.
            </div>
          )}

          {selectedForm && (
            <>
              <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{selectedForm.title}</h2>
                    {selectedForm.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedForm.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${selectedForm.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedForm.isPublished ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-xs text-muted-foreground">Version {selectedForm.version}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!selectedForm.isPublished && (
                      <button
                        onClick={() => publishMutation.mutate(selectedForm.id)}
                        disabled={publishMutation.isPending || selectedForm.questions.length === 0}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded disabled:opacity-50"
                        title={selectedForm.questions.length === 0 ? 'Add at least one question before publishing' : undefined}
                      >
                        <Check size={12} className="inline mr-1" />
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => cloneMutation.mutate(selectedForm.id)}
                      disabled={cloneMutation.isPending}
                      className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted"
                    >
                      Clone
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions list */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Questions ({selectedForm.questions.length})</h3>
                {selectedForm.questions.map((q, i) => (
                  <div key={q.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {q.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{q.type.replace('_', ' ')}</span>
                        {q.isRequired && <span className="text-xs text-destructive">Required</span>}
                        {q.type === 'likert' && q.scaleMin !== undefined && q.scaleMax !== undefined && (
                          <span className="text-xs text-muted-foreground">Scale {q.scaleMin}–{q.scaleMax}</span>
                        )}
                        {(q.type === 'single_choice' || q.type === 'multi_choice') && q.options && (
                          <span className="text-xs text-muted-foreground">{q.options.length} options</span>
                        )}
                      </div>
                    </div>
                    {!selectedForm.isPublished && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this question?')) {
                            deleteQuestionMutation.mutate({ formId: selectedForm.id, qId: q.id });
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
                        title="Delete question"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {selectedForm.questions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No questions yet. Add one below.</p>
                )}
              </div>

              {/* Add question */}
              {!selectedForm.isPublished && (
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <button
                    onClick={() => setAddingQuestion(v => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    {addingQuestion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {addingQuestion ? 'Cancel' : 'Add Question'}
                  </button>

                  {addingQuestion && (
                    <div className="space-y-3 border-t border-border pt-3">
                      {questionError && <p className="text-xs text-destructive">{questionError}</p>}
                      <div>
                        <label className="block text-xs font-medium mb-1">Question Type</label>
                        <select
                          value={newQ.type}
                          onChange={e => setNewQ(p => ({ ...p, type: e.target.value as QuestionType }))}
                          className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                        >
                          <option value="likert">Likert Scale</option>
                          <option value="single_choice">Single Choice</option>
                          <option value="multi_choice">Multiple Choice</option>
                          <option value="open_text">Open Text</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Question Text</label>
                        <input
                          type="text"
                          value={newQ.text}
                          onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
                          placeholder="e.g. How well did the instructor explain the material?"
                          className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isRequired"
                          checked={newQ.isRequired}
                          onChange={e => setNewQ(p => ({ ...p, isRequired: e.target.checked }))}
                        />
                        <label htmlFor="isRequired" className="text-xs font-medium">Required</label>
                      </div>

                      {/* Likert options */}
                      {newQ.type === 'likert' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Scale Min</label>
                            <input
                              type="number"
                              value={newQ.scaleMin ?? 1}
                              onChange={e => setNewQ(p => ({ ...p, scaleMin: Number(e.target.value) }))}
                              className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Scale Max</label>
                            <input
                              type="number"
                              value={newQ.scaleMax ?? 5}
                              onChange={e => setNewQ(p => ({ ...p, scaleMax: Number(e.target.value) }))}
                              className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                            />
                          </div>
                        </div>
                      )}

                      {/* Choice options */}
                      {(newQ.type === 'single_choice' || newQ.type === 'multi_choice') && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium">Options</label>
                          {newQOptions.map((opt, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={e => {
                                  const updated = [...newQOptions];
                                  updated[idx] = { value: String(idx + 1), label: e.target.value };
                                  setNewQOptions(updated);
                                }}
                                placeholder={`Option ${idx + 1}`}
                                className="flex-1 px-3 py-2 border border-input rounded text-sm bg-background"
                              />
                              {newQOptions.length > 1 && (
                                <button
                                  onClick={() => setNewQOptions(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => setNewQOptions(prev => [...prev, { value: String(prev.length + 1), label: '' }])}
                            className="text-xs text-primary flex items-center gap-1"
                          >
                            <Plus size={12} /> Add option
                          </button>
                        </div>
                      )}

                      <button
                        onClick={handleAddQuestion}
                        disabled={addQuestionMutation.isPending}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
                      >
                        {addQuestionMutation.isPending ? 'Adding…' : 'Add Question'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
