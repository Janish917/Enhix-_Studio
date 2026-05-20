import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Auth.css';

export function Auth({ onLogin, onBack }) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [authMode, setAuthMode] = useState('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [pwValidations, setPwValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  });

  const handlePasswordChange = (e) => {

    const pw = e.target.value;

    setPassword(pw);

    setPwValidations({
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw)
    });

  };

  const getStrength = () => {

    const score = Object.values(pwValidations).filter(Boolean).length;

    if (password.length === 0) {
      return {
        label: '',
        color: 'transparent',
        width: '0%'
      };
    }

    if (score <= 2) {
      return {
        label: 'Weak',
        color: '#ff453a',
        width: '33%'
      };
    }

    if (score === 3) {
      return {
        label: 'Medium',
        color: '#ffd60a',
        width: '66%'
      };
    }

    return {
      label: 'Strong',
      color: '#32d74b',
      width: '100%'
    };

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    setAuthError('');
    setAuthSuccess('');

    if (authMode === 'register') {

      if (Object.values(pwValidations).some(v => !v)) {
        setAuthError('Please meet all password requirements.');
        return;
      }

    }

    setIsLoading(true);

    try {

      // LOGIN
      if (authMode === 'login') {

        const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password
          })
        });

        const data = await response.json();

        if (data.ok) {

          localStorage.setItem('enhix_token', data.token);

          localStorage.setItem(
            'enhix_user',
            JSON.stringify(data.user)
          );

          setAuthSuccess('Login successful');

          setTimeout(() => {
            onLogin();
          }, 1000);

        } else {

          setAuthError(data.message);

        }

      }

      // REGISTER
      else if (authMode === 'register') {

        const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: name,
            email,
            password
          })
        });

        const data = await response.json();

        if (data.ok) {

          setAuthSuccess('Account created successfully');

          localStorage.setItem('enhix_token', data.token || '');

          localStorage.setItem(
            'enhix_user',
            JSON.stringify(data.user)
          );

          setTimeout(() => {
            onLogin();
          }, 1000);

        } else {

          setAuthError(data.message);

        }

      }

    } catch (err) {

      setAuthError('Connection error. Backend may not be running.');

    } finally {

      setIsLoading(false);

    }

  };

  const PasswordRequirementsUI = () => (

    <div className="mt-3 bg-black/20 rounded-lg p-3 border border-white/5">

      <div className="flex justify-between items-center mb-2">

        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Password Strength
        </span>

        <span
          className="text-xs font-bold transition-colors"
          style={{ color: getStrength().color }}
        >
          {getStrength().label}
        </span>

      </div>

      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">

        <div
          className="h-full transition-all duration-300"
          style={{
            width: getStrength().width,
            backgroundColor: getStrength().color
          }}
        />

      </div>

      <ul className="text-xs space-y-1">

        <li className={`flex items-center gap-2 ${pwValidations.length ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.length ? '✓' : '○'}</span>
          At least 8 characters
        </li>

        <li className={`flex items-center gap-2 ${pwValidations.uppercase ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.uppercase ? '✓' : '○'}</span>
          One uppercase letter
        </li>

        <li className={`flex items-center gap-2 ${pwValidations.lowercase ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.lowercase ? '✓' : '○'}</span>
          One lowercase letter
        </li>

        <li className={`flex items-center gap-2 ${pwValidations.number ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.number ? '✓' : '○'}</span>
          One number
        </li>

      </ul>

    </div>

  );

  return (

    <div className="auth-container">

      <motion.div
        className="landing-bg-glow glow-blue"
        style={{
          top: '10%',
          left: '10%',
          width: '40vw',
          height: '40vw'
        }}
      />

      <motion.div
        className="landing-bg-glow glow-violet"
        style={{
          bottom: '10%',
          right: '10%',
          width: '40vw',
          height: '40vw'
        }}
      />

      <button
        onClick={onBack}
        className="absolute top-8 left-8 text-white/50 hover:text-white transition flex items-center gap-2 font-medium z-20"
      >
        <span>&larr;</span> Back to Home
      </button>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >

        <div className="flex justify-center mb-6">

          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center shadow-lg text-2xl font-bold text-white">
            E
          </div>

        </div>

        <h2 className="auth-title">
          {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>

        <p className="auth-subtitle">
          {authMode === 'login'
            ? 'Login to continue.'
            : 'Create your Enhix account.'}
        </p>

        <form onSubmit={handleSubmit}>

          {authMode === 'register' && (

            <div className="auth-input-group">

              <label>Full Name</label>

              <input
                type="text"
                className="auth-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

            </div>

          )}

          <div className="auth-input-group">

            <label>Email Address</label>

            <input
              type="email"
              className="auth-input"
              placeholder="hello@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

          </div>

          <div className="auth-input-group">

            <label>Password</label>

            <div className="relative flex items-center">

              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                required
              />

              <button
                type="button"
                className="absolute right-3 text-[#8e8e93]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>

            </div>

            {authMode === 'register' && <PasswordRequirementsUI />}

          </div>

          <AnimatePresence>

            {authError && (

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[#ff453a] text-sm mb-4 text-center"
              >
                {authError}
              </motion.div>

            )}

            {authSuccess && (

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[#32d74b] text-sm mb-4 text-center"
              >
                {authSuccess}
              </motion.div>

            )}

          </AnimatePresence>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={isLoading}
          >

            {isLoading
              ? 'Please wait...'
              : authMode === 'login'
                ? 'Sign In'
                : 'Create Account'}

          </button>

        </form>

        <div className="auth-footer">

          {authMode === 'login' ? (

            <>
              Don&apos;t have an account?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setAuthMode('register');
                  setAuthError('');
                }}
              >
                Sign up
              </a>
            </>

          ) : (

            <>
              Already have an account?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setAuthMode('login');
                  setAuthError('');
                }}
              >
                Sign in
              </a>
            </>

          )}

        </div>

      </motion.div>

    </div>

  );

}