import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchReport, updateReport } from '../data/remote/reportsApi';
import {
  PageContainer,
  Card,
  Button,
  FormField,
  fieldClassName,
  AlertBanner,
  LoadingScreen,
  Table,
  TableHeadCell,
  TableCell,
} from '../components/dashboardUi';
import { Badge } from '../components/common';
import { fieldLabel as examFieldLabel } from '../data/physiology/examCatalog';
import { GUT_BACTERIA_INFO, gutFieldLabel } from '../data/pathology/gutCatalog';
import type { ReportDTO } from '../types';

interface EditFormData {
  notes: string;
  normal: boolean;
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({ notes: '', normal: true });

  useEffect(() => {
    if (id) loadReport(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadReport = async (reportId: string) => {
    setLoading(true);
    try {
      const res = await fetchReport(reportId);
      setReport(res.report);
      setFormData({ notes: res.report.notes ?? '', normal: res.report.normal ?? true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'normal') {
      setFormData((prev) => ({ ...prev, normal: value === 'true' }));
    } else {
      setFormData((prev) => ({ ...prev, notes: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const res = await updateReport(id, formData);
      setReport(res.report);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report');
    }
  };

  if (loading) return <LoadingScreen message="Loading report..." />;
  if (error) {
    return (
      <PageContainer>
        <AlertBanner tone="danger">{error}</AlertBanner>
      </PageContainer>
    );
  }
  if (!report) {
    return (
      <PageContainer>
        <AlertBanner tone="danger">Report not found</AlertBanner>
      </PageContainer>
    );
  }

  // `examKind` (e.g. "sequencing", "ecg") picks the right catalogue of friendly names for this report's raw
  // result keys — without it, the table below would just show the stored field names verbatim (firmicutesPct,
  // heartRate, ...). It's an internal detail used only for that lookup, so it's excluded from the table itself.
  const rawResults = report.results as Record<string, unknown>;
  const examKind = typeof rawResults.examKind === 'string' ? rawResults.examKind : undefined;
  const isMicrobiome = report.testType === 'Microbiome';
  const labelFor = (key: string) => (isMicrobiome ? gutFieldLabel(examKind, key) : examFieldLabel(examKind, key));
  const resultEntries = Object.entries(report.results || {}).filter(([key]) => key !== 'examKind');
  // Only a microbiome *sequencing* panel names individual bacterial groups; the other gut tests (calprotectin,
  // stool analysis, breath test) don't, so this stays empty for them.
  const bacteriaGlossary = isMicrobiome ? resultEntries.filter(([key]) => key in GUT_BACTERIA_INFO) : [];

  return (
    <PageContainer>
      <div className="mx-auto max-w-[900px]">
        <Card className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-hud-text">{report.testName}</h1>
            <p className="text-sm text-hud-muted">{new Date(report.testDate).toLocaleDateString()}</p>
          </div>
          <Badge tone={report.normal === false ? 'danger' : 'success'}>
            {report.normal === false ? 'Abnormal' : 'Normal'}
          </Badge>
        </Card>

        {!editing ? (
          <div className="overflow-hidden rounded-lg bg-hud-panel shadow">
            <div className="border-b border-hud-border p-5">
              <h3 className="mb-4 text-base font-semibold text-hud-text">Test Information</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
                <InfoItem label="Test Type" value={report.testType} />
                <InfoItem label="Test Date" value={new Date(report.testDate).toLocaleDateString()} />
                {report.doctor?.name && <InfoItem label="Doctor" value={report.doctor.name} />}
                {report.doctor?.clinic && <InfoItem label="Clinic" value={report.doctor.clinic} />}
              </div>
            </div>

            <div className="border-b border-hud-border p-5">
              <h3 className="mb-4 text-base font-semibold text-hud-text">Test Results</h3>
              <Table>
                <thead>
                  <tr>
                    <TableHeadCell>Parameter</TableHeadCell>
                    <TableHeadCell>Value</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {resultEntries.map(([key, value]) => {
                    const { label, unit } = labelFor(key);
                    const shown = typeof value === 'object' && value !== null ? JSON.stringify(value) : `${String(value)}${unit ? ` ${unit}` : ''}`;
                    return (
                      <tr key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell>{shown}</TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {bacteriaGlossary.length > 0 && (
              <div className="border-b border-hud-border p-5">
                <h3 className="mb-1 text-base font-semibold text-hud-text">What are these bacteria?</h3>
                <p className="mb-4 text-xs text-hud-muted">General background on each group found in this test — not an interpretation of your own results. There's no agreed "healthy" share for any of them.</p>
                <dl className="flex flex-col gap-3">
                  {bacteriaGlossary.map(([key]) => (
                    <div key={key}>
                      <dt className="text-sm font-semibold text-hud-text">{labelFor(key).label}</dt>
                      <dd className="mt-0.5 text-sm leading-relaxed text-hud-muted">{GUT_BACTERIA_INFO[key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {report.notes && (
              <div className="border-b border-hud-border p-5 last:border-b-0">
                <h3 className="mb-4 text-base font-semibold text-hud-text">Notes</h3>
                <p className="leading-relaxed text-hud-text">{report.notes}</p>
              </div>
            )}

            <div className="flex gap-2.5 p-5">
              <Button onClick={() => setEditing(true)}>Edit Report</Button>
              <Button variant="secondary" onClick={() => navigate('/reports')}>
                Back to Reports
              </Button>
            </div>
          </div>
        ) : (
          <Card as="form" onSubmit={handleSubmit}>
            <FormField label="Notes" htmlFor="notes">
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                rows={4}
                className={fieldClassName}
              />
            </FormField>
            <FormField label="Status" htmlFor="normal">
              <select
                id="normal"
                name="normal"
                value={formData.normal ? 'true' : 'false'}
                onChange={handleFormChange}
                className={fieldClassName}
              >
                <option value="true">Normal</option>
                <option value="false">Abnormal</option>
              </select>
            </FormField>
            <div className="flex gap-2.5">
              <Button type="submit">Save Changes</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setFormData({ notes: report.notes ?? '', normal: report.normal ?? true });
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-sm font-semibold text-hud-muted">{label}:</span>
      <span className="text-base text-hud-text">{value}</span>
    </div>
  );
}
