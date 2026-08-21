import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchReports, createReport, deleteReport } from '../data/remote/reportsApi';
import {
  PageContainer,
  PageHeader,
  Card,
  Button,
  FormField,
  fieldClassName,
  AlertBanner,
  LoadingScreen,
} from '../components/dashboardUi';
import { Badge } from '../components/common';
import { useAuth } from '../auth/AuthContext';
import type { ReportDTO } from '../types';

const TEST_TYPES = ['Blood', 'Urine', 'Imaging', 'Genetic', 'Other'];

interface ReportFormData {
  testName: string;
  testDate: string;
  testType: string;
  results: string;
  notes: string;
}

const INITIAL_FORM: ReportFormData = { testName: '', testDate: '', testType: '', results: '', notes: '' };

export function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReportFormData>(INITIAL_FORM);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchReports();
      setReports(res.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    let parsedResults: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(formData.results);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('not an object');
      }
      parsedResults = parsed as Record<string, unknown>;
    } catch {
      setFormError('Results must be valid JSON, e.g. {"hemoglobin": "13.5 g/dL"}');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createReport({
        testName: formData.testName,
        testDate: formData.testDate,
        testType: formData.testType,
        results: parsedResults,
        notes: formData.notes || undefined,
      });
      setReports((prev) => [res.report, ...prev]);
      setFormData(INITIAL_FORM);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading reports..." />;

  return (
    <PageContainer>
      <PageHeader title={user ? `Welcome, ${user.name}!` : 'Welcome'} subtitle="Here are your health test reports" />

      {error && <AlertBanner tone="danger">{error}</AlertBanner>}

      <div className="mb-7">
        <Button onClick={() => setShowForm((prev) => !prev)}>{showForm ? 'Cancel' : '+ Add New Report'}</Button>
      </div>

      {showForm && (
        <Card as="form" onSubmit={handleFormSubmit} className="mb-7">
          <h3 className="mb-5 text-lg font-semibold text-hud-text">Add New Test Report</h3>
          {formError && <AlertBanner tone="danger">{formError}</AlertBanner>}
          <FormField label="Test Name" htmlFor="testName">
            <input
              type="text"
              id="testName"
              name="testName"
              value={formData.testName}
              onChange={handleFormChange}
              placeholder="e.g., Blood Test"
              required
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Test Date" htmlFor="testDate">
            <input
              type="date"
              id="testDate"
              name="testDate"
              value={formData.testDate}
              onChange={handleFormChange}
              required
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Test Type" htmlFor="testType">
            <select
              id="testType"
              name="testType"
              value={formData.testType}
              onChange={handleFormChange}
              required
              className={fieldClassName}
            >
              <option value="">Select Type</option>
              {TEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Results (JSON format)" htmlFor="results">
            <textarea
              id="results"
              name="results"
              value={formData.results}
              onChange={handleFormChange}
              placeholder='{"hemoglobin": "13.5 g/dL", "glucose": "95 mg/dL"}'
              rows={4}
              required
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Additional notes about the test"
              rows={3}
              className={fieldClassName}
            />
          </FormField>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Report'}
          </Button>
        </Card>
      )}

      {reports.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-base text-hud-muted">No reports yet. Add your first health test report!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {reports.map((report) => (
            <Card key={report._id} className="transition-transform duration-300 hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-start justify-between border-b-2 border-hud-border pb-2.5">
                <h3 className="flex-1 text-lg font-semibold text-hud-text">{report.testName}</h3>
                <Badge tone={report.normal === false ? 'danger' : 'success'}>
                  {report.normal === false ? 'Abnormal' : 'Normal'}
                </Badge>
              </div>
              <div className="my-4 text-hud-text">
                <p className="my-2 text-sm">
                  <strong>Type:</strong> {report.testType}
                </p>
                <p className="my-2 text-sm">
                  <strong>Date:</strong> {new Date(report.testDate).toLocaleDateString()}
                </p>
                {report.doctor?.name && (
                  <p className="my-2 text-sm">
                    <strong>Doctor:</strong> {report.doctor.name}
                  </p>
                )}
              </div>
              <div className="mt-4 flex gap-2.5">
                <Link to={`/report/${report._id}`} className="flex-1">
                  <Button className="w-full">View Details</Button>
                </Link>
                <Button variant="danger" onClick={() => handleDelete(report._id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
