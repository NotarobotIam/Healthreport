import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { fetchUserProfile, updateUserProfile } from '../data/remote/userApi';
import { useAuth } from '../auth/AuthContext';
import { PageContainer, PageHeader, Card, Button, FormField, fieldClassName, AlertBanner, LoadingScreen } from '../components/dashboardUi';
import type { AuthUser } from '../types';

type ProfileFormData = Partial<AuthUser>;

export function ProfilePage() {
  const { setUser } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetchUserProfile();
      setFormData(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await updateUserProfile({
        name: formData.name ?? '',
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
      });
      setFormData(res.user);
      setUser(res.user);
      setEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  if (loading) return <LoadingScreen message="Loading profile..." />;

  return (
    <PageContainer>
      <div className="mx-auto max-w-[600px]">
        <PageHeader title="My Profile" subtitle="Manage your health information" />

        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
        {success && <AlertBanner tone="success">{success}</AlertBanner>}

        {!editing ? (
          <Card>
            <div className="mb-5">
              <ProfileRow label="Name" value={formData.name} />
              <ProfileRow label="Email" value={formData.email} />
              {formData.dateOfBirth && (
                <ProfileRow label="Date of Birth" value={new Date(formData.dateOfBirth).toLocaleDateString()} />
              )}
              {formData.gender && <ProfileRow label="Gender" value={formData.gender} />}
              {formData.phone && <ProfileRow label="Phone" value={formData.phone} />}
            </div>
            <Button onClick={() => setEditing(true)}>Edit Profile</Button>
          </Card>
        ) : (
          <Card as="form" onSubmit={handleSubmit}>
            <FormField label="Full Name" htmlFor="name">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name ?? ''}
                onChange={handleChange}
                required
                className={fieldClassName}
              />
            </FormField>
            <FormField label="Email (Read-only)" htmlFor="email">
              <input type="email" id="email" value={formData.email ?? ''} disabled className={fieldClassName} />
            </FormField>
            <FormField label="Date of Birth" htmlFor="dateOfBirth">
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                onChange={handleChange}
                className={fieldClassName}
              />
            </FormField>
            <FormField label="Gender" htmlFor="gender">
              <select
                id="gender"
                name="gender"
                value={formData.gender ?? ''}
                onChange={handleChange}
                className={fieldClassName}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Phone" htmlFor="phone">
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone ?? ''}
                onChange={handleChange}
                className={fieldClassName}
              />
            </FormField>
            <div className="mt-5 flex gap-2.5">
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setEditing(false);
                  loadProfile();
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

function ProfileRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-hud-border py-3.5">
      <span className="font-semibold text-hud-muted">{label}:</span>
      <span className="text-base text-hud-text">{value}</span>
    </div>
  );
}
