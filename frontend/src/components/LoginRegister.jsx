import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import API from '../services/api';

function LoginRegister({ onLogin }) {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Family Member');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleToggleView = (newView) => {
    resetMessages();
    setView(newView);
  };

  // Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Please enter both email and password.');
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email, password });
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      return setError('Please fill in all details.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/auth/register', { name, email, password, role });
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password reset handler
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!email || !newPassword) {
      return setError('Please provide email and new password.');
    }
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { email, newPassword });
      setSuccess('Your password has been successfully reset. You can now login.');
      setTimeout(() => {
        handleToggleView('login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please check the email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 py-5" style={{ minHeight: '100vh' }}>
      <div className="glass-panel p-4 p-md-5 w-100 animate-slide-up shadow" style={{ maxWidth: '480px' }}>
        
        {/* Brand */}
        <div className="text-center mb-4">
          <h1 className="fw-bold text-white glow-text-purple mb-1" style={{ letterSpacing: '-0.5px' }}>FamSync</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Coordinate shared chores, activities, and calendars</p>
        </div>

        {/* Error or Success alerts */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 bg-danger bg-opacity-25 text-danger-emphasis rounded-3 mb-3 animate-fade-in" style={{ fontSize: '0.85rem' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 bg-success bg-opacity-25 text-success-emphasis rounded-3 mb-3 animate-fade-in" style={{ fontSize: '0.85rem' }}>
            <UserCheck size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* View 1: LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="animate-fade-in">
            <div className="mb-3">
              <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Email Address</label>
              <div className="position-relative">
                <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                  <Mail size={16} />
                </span>
                <input 
                  type="email" 
                  className="form-control form-control-dark glow-border-purple" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <label className="form-label text-white-50 mb-0" style={{ fontSize: '0.85rem' }}>Password</label>
                <a 
                  href="#" 
                  onClick={() => handleToggleView('forgot')} 
                  className="text-cyan text-decoration-none" 
                  style={{ fontSize: '0.8rem' }}
                >
                  Forgot Password?
                </a>
              </div>
              <div className="position-relative">
                <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                  <Lock size={16} />
                </span>
                <input 
                  type="password" 
                  className="form-control form-control-dark glow-border-purple" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-purple w-100 d-flex align-items-center justify-content-center gap-2 py-2 mb-3"
              disabled={loading}
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="text-center">
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Need a family account? </span>
              <a 
                href="#" 
                onClick={() => handleToggleView('register')} 
                className="text-cyan text-decoration-none font-weight-bold"
                style={{ fontSize: '0.85rem' }}
              >
                Sign Up
              </a>
            </div>
          </form>
        )}

        {/* View 2: REGISTER */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="animate-fade-in">
            <div className="mb-3">
              <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Full Name</label>
              <div className="position-relative">
                <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                  <UserIcon size={16} />
                </span>
                <input 
                  type="text" 
                  className="form-control form-control-dark glow-border-cyan" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="Gomez Adams"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Email Address</label>
              <div className="position-relative">
                <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                  <Mail size={16} />
                </span>
                <input 
                  type="email" 
                  className="form-control form-control-dark glow-border-cyan" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Password</label>
                <div className="position-relative">
                  <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                    <Lock size={16} />
                  </span>
                  <input 
                    type="password" 
                    className="form-control form-control-dark glow-border-cyan" 
                    style={{ paddingLeft: '38px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Confirm</label>
                <div className="position-relative">
                  <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                    <Lock size={16} />
                  </span>
                  <input 
                    type="password" 
                    className="form-control form-control-dark glow-border-cyan" 
                    style={{ paddingLeft: '38px' }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Initial Role</label>
              <select 
                className="form-select form-select-dark glow-border-cyan"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Family Member">Family Member (Will join via invite code)</option>
                <option value="Family Admin">Family Admin (Will create a new family)</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn btn-cyan w-100 d-flex align-items-center justify-content-center gap-2 py-2 mb-3"
              disabled={loading}
            >
              <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="text-center">
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Already registered? </span>
              <a 
                href="#" 
                onClick={() => handleToggleView('login')} 
                className="text-purple text-decoration-none font-weight-bold"
                style={{ fontSize: '0.85rem' }}
              >
                Sign In
              </a>
            </div>
          </form>
        )}

        {/* View 3: FORGOT PASSWORD / PASSWORD RESET */}
        {view === 'forgot' && (
          <form onSubmit={handleResetSubmit} className="animate-fade-in">
            <div className="mb-4 text-center border-bottom border-secondary pb-2">
              <h5 className="text-white">Recover Password</h5>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Enter email and your new password to reset instantly.</p>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Email Address</label>
              <div className="position-relative">
                <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                  <Mail size={16} />
                </span>
                <input 
                  type="email" 
                  className="form-control form-control-dark glow-border-purple" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Choose New Password</label>
              <div className="position-relative">
                <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                  <Lock size={16} />
                </span>
                <input 
                  type="password" 
                  className="form-control form-control-dark glow-border-purple" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-purple w-100 py-2 mb-3"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <a 
                href="#" 
                onClick={() => handleToggleView('login')} 
                className="text-cyan text-decoration-none"
                style={{ fontSize: '0.85rem' }}
              >
                Back to Sign In
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginRegister;
