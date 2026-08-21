import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../data/remote/authApi';
import { useAuth } from '../auth/AuthContext';
import { Button, FormField, fieldClassName, AlertBanner } from '../components/dashboardUi';

export function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginRequest(formData);
      login(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5">
      <div className="w-full max-w-[400px] rounded-[10px] bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <h1 className="mb-7 text-center text-2xl font-semibold text-hud-text">Login</h1>
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
        <form onSubmit={handleSubmit}>
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-hud-muted">
          Don&rsquo;t have an account?{' '}
          <Link to="/register" className="font-semibold text-[#667eea] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
