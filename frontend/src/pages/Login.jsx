import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(formData.email, formData.password);
    
    if (success) {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-indigo-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-4 rounded-2xl shadow-2xl shadow-primary-600/30">
              <Phone className="text-white" size={40} />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">CareCall AI</h2>
          <p className="mt-2 text-sm text-gray-400">
            Autonomous Voice Agents for Healthcare
          </p>
        </div>

        {/* Login Card */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-100 mb-6">Sign in to your account</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="admin@carecall.ai"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
            <p className="text-xs font-semibold text-primary-400 mb-2">Demo Credentials:</p>
            <p className="text-xs text-gray-400">Admin: admin@carecall.ai / admin123</p>
            <p className="text-xs text-gray-400">Staff: staff@carecall.ai / staff123</p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Built for healthcare innovation
        </p>
      </div>
    </div>
  );
};

export default Login;
