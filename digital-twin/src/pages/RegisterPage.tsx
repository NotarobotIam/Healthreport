import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerRequest } from '../data/remote/authApi';
import { useAuth } from '../auth/AuthContext';
import { Button, FormField, fieldClassName, AlertBanner } from '../components/dashboardUi';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
}

const INITIAL_FORM: RegisterFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
};

export function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const { confirmPassword, ...registerData } = formData;
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5">
      <div className="w-full max-w-[400px] rounded-[10px] bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <h1 className="mb-7 text-center text-2xl font-semibold text-hud-text">Register</h1>
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
        <form onSubmit={handleSubmit}>
          <FormField label="Full Name" htmlFor="name">
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Date of Birth" htmlFor="dateOfBirth">
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Gender" htmlFor="gender">
            <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={fieldClassName}>
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
              value={formData.phone}
              onChange={handleChange}
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Password" htmlFor="password">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={fieldClassName}
            />
          </FormField>
          <FormField label="Confirm Password" htmlFor="confirmPassword">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={fieldClassName}
            />
          </FormField>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Registering...' : 'Register'}
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
