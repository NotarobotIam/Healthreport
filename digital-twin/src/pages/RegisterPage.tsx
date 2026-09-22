import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerRequest } from '../data/remote/authApi';
import { useAuth } from '../auth/AuthContext';
import { Button, FormField, fieldClassName, AlertBanner } from '../components/dashboardUi';
import { AuthBanner } from '../components/layout/AuthBanner';

interface RegisterFormData {
  name: string;
  email: string;
  handle: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  ageConfirmed: boolean;
  acceptTerms: boolean;
}

const ADJECTIVES = ['quiet', 'brave', 'gentle', 'steady', 'bright', 'calm', 'patient', 'hopeful', 'kind', 'sturdy'];
const NOUNS = ['river', 'willow', 'harbor', 'meadow', 'lantern', 'maple', 'ember', 'summit', 'sparrow', 'cedar'];

/** A friendly random username, so nobody feels pushed to use their real name. */
function suggestHandle(): string {
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  return `${pick(ADJECTIVES)}_${pick(NOUNS)}${Math.floor(Math.random() * 90) + 10}`;
}

export function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>(() => ({
    name: '',
    email: '',
    handle: suggestHandle(),
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    ageConfirmed: false,
    acceptTerms: false,
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const next = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: name === 'handle' ? String(next).toLowerCase() : next }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _confirm, ...registerData } = formData;
      const res = await registerRequest(registerData);
      login(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5">
      <AuthBanner />
      <div className="w-full max-w-[440px] rounded-[10px] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <h1 className="mb-1 text-center text-2xl font-semibold text-hud-text">Join the community</h1>
        <p className="mb-6 text-center text-sm text-hud-muted">
          Track your pain, and connect with people who understand. You choose what to share.
        </p>
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
        <form onSubmit={handleSubmit}>
          <FormField label="Username (shown to other members)" htmlFor="handle">
            <input
              type="text"
              id="handle"
              name="handle"
              value={formData.handle}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9_]{3,20}"
              autoComplete="off"
              spellCheck={false}
              className={fieldClassName}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-hud-muted">
              <span>Lowercase letters, numbers, underscores. Please don't use your real name.</span>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, handle: suggestHandle() }))}
                className="shrink-0 pl-2 font-medium text-[#667eea] hover:underline"
              >
                Suggest another
              </button>
            </div>
          </FormField>

          <div className="mb-4 rounded-md bg-hud-panel2 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-hud-muted">Private — never shown to anyone</p>
            <FormField label="Full name" htmlFor="name">
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={fieldClassName} />
            </FormField>
            <FormField label="Email" htmlFor="email">
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className={fieldClassName} />
            </FormField>
            <FormField label="Date of birth (optional)" htmlFor="dateOfBirth">
              <input type="date" id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={fieldClassName} />
            </FormField>
            <FormField label="Gender (optional)" htmlFor="gender">
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={fieldClassName}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Phone (optional)" htmlFor="phone">
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className={fieldClassName} />
            </FormField>
          </div>

          <FormField label="Password" htmlFor="password">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              className={fieldClassName}
            />
            <p className="mt-1 text-xs text-hud-muted">At least 10 characters. A few random words makes a strong passphrase.</p>
          </FormField>
          <FormField label="Confirm password" htmlFor="confirmPassword">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={fieldClassName}
            />
          </FormField>

          <label className="mb-2 flex cursor-pointer items-start gap-2 text-sm text-hud-text">
            <input type="checkbox" name="ageConfirmed" checked={formData.ageConfirmed} onChange={handleChange} required className="mt-0.5 h-4 w-4" />
            <span>I am 18 years old or older.</span>
          </label>
          <label className="mb-5 flex cursor-pointer items-start gap-2 text-sm text-hud-text">
            <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} required className="mt-0.5 h-4 w-4" />
            <span>
              I have read and agree to the{' '}
              <Link to="/terms" target="_blank" className="font-medium text-[#667eea] underline">
                Terms
              </Link>
              ,{' '}
              <Link to="/privacy" target="_blank" className="font-medium text-[#667eea] underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/guidelines" target="_blank" className="font-medium text-[#667eea] underline">
                Community Guidelines
              </Link>
              . I understand this is not medical advice.
            </span>
          </label>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-hud-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#667eea] hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
