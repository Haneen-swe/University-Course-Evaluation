import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  type: 'likert' | 'single_choice' | 'multi_choice' | 'open_text';
  text: string;
  isRequired: boolean;
  options?: { value: string; label: string }[];
  scaleMin?: number;
  scaleMax?: number;
  orderIndex: number;
}

export function EvaluationPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ['eval-form', offeringId],
    queryFn: () => api.get<{ success: true; data: { questions: Question[]; title: string } }>(`/evaluations/${offeringId}/form`).then(r => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { answers: { questionId: string; value: string }[] }) =>
      api.post(`/evaluations/${offeringId}/submit`, payload),
    onSuccess: () => setSubmitted(true),
  });

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[questionId]; return n; });
  };

  const handleMultiAnswer = (questionId: string, optionValue: string, checked: boolean) => {
    // Parse from JSON array; fall back to empty array for first selection
    let current: string[] = [];
    try { current = JSON.parse(answers[questionId] ?? '[]'); } catch { current = []; }
    const updated = checked ? [...current, optionValue] : current.filter(v => v !== optionValue);
    // Serialise as a JSON array so option values containing commas are safe
    handleAnswer(questionId, JSON.stringify(updated));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    form?.questions.filter(q => q.isRequired).forEach(q => {
      if (!answers[q.id] || answers[q.id].trim() === '') newErrors[q.id] = 'This question is required.';
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    const payload = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    submitMutation.mutate({ answers: payload });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-6">Loading evaluation…</div>;
  if (!form) return <div className="text-destructive p-6">Evaluation not found or window is closed.</div>;

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center space-y-4">
        <CheckCircle className="mx-auto text-green-500" size={48} />
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p className="text-muted-foreground text-sm">Your evaluation has been submitted anonymously. Your identity is never linked to your responses.</p>
        <button onClick={() => navigate('/student/evaluations')} className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-medium">Back to evaluations</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{form.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Your responses are fully anonymous. Your identity will never be linked to your answers.</p>
      </div>

      {submitMutation.isError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {(submitMutation.error as any)?.response?.data?.error?.message ?? 'Submission failed. Please try again.'}
        </div>
      )}

      {form.questions.sort((a, b) => a.orderIndex - b.orderIndex).map((q, i) => (
        <div key={q.id} className={`bg-card border rounded-lg p-5 ${errors[q.id] ? 'border-destructive' : 'border-border'}`}>
          <p className="text-sm font-medium mb-3">
            {i + 1}. {q.text}
            {q.isRequired && <span className="text-destructive ml-1" aria-label="required">*</span>}
          </p>

          {/* Likert scale */}
          {q.type === 'likert' && (
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 }, (_, idx) => (q.scaleMin ?? 1) + idx).map(val => (
                <label key={val} className={`flex flex-col items-center gap-1 cursor-pointer px-3 py-2 border rounded-md text-sm transition-colors ${answers[q.id] === String(val) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                  <input type="radio" name={q.id} value={String(val)} className="sr-only" onChange={() => handleAnswer(q.id, String(val))} />
                  {val}
                </label>
              ))}
              <div className="w-full flex justify-between text-xs text-muted-foreground mt-1 px-1">
                <span>Not at all</span><span>Strongly agree</span>
              </div>
            </div>
          )}

          {/* Single choice */}
          {q.type === 'single_choice' && q.options && (
            <div className="space-y-2">
              {q.options.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name={q.id} value={opt.value} checked={answers[q.id] === opt.value} onChange={() => handleAnswer(q.id, opt.value)} className="text-primary" />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {/* Multi choice */}
          {q.type === 'multi_choice' && q.options && (
            <div className="space-y-2">
              {q.options.map(opt => {
                let parsedSelected: string[] = [];
                try { parsedSelected = JSON.parse(answers[q.id] ?? '[]'); } catch { parsedSelected = []; }
                const selected = parsedSelected.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" value={opt.value} checked={selected} onChange={(e) => handleMultiAnswer(q.id, opt.value, e.target.checked)} />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          )}

          {/* Open text */}
          {q.type === 'open_text' && (
            <textarea
              rows={4}
              maxLength={2000}
              value={answers[q.id] ?? ''}
              onChange={e => handleAnswer(q.id, e.target.value)}
              placeholder="Your response (optional)"
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background resize-none"
              aria-label={q.text}
            />
          )}

          {errors[q.id] && <p className="mt-2 text-xs text-destructive" role="alert">{errors[q.id]}</p>}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
      >
        {submitMutation.isPending ? 'Submitting…' : 'Submit Evaluation'}
      </button>
      <p className="text-xs text-center text-muted-foreground">Once submitted, you cannot modify your responses.</p>
    </div>
  );
}
