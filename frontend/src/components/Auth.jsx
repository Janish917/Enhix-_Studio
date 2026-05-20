import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Auth.css';

export function Auth({ onLogin, onBack }) {
  const [authMode, setAuthMode] = useState('login'); // login, register, forgot, reset
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [pwValidations, setPwValidations] = useState({
    length: false, uppercase: false, lowercase: false, number: false,
  });

  const handlePasswordChange = (e) => {
    const pw = e.target.value;
    setPassword(pw);
    setPwValidations({
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
    });
  };

  const getStrength = () => {
    const score = Object.values(pwValidations).filter(Boolean).length;
    if (password.length === 0) return { label: '', color: 'transparent', width: '0%' };
    if (score <= 2) return { label: 'Weak', color: '#ff453a', width: '33%' };
    if (score === 3) return { label: 'Medium', color: '#ffd60a', width: '66%' };
    return { label: 'Strong', color: '#32d74b', width: '100%' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    
    if (authMode === 'register' || authMode === 'reset') {
      if (Object.values(pwValidations).some(v => !v)) {
        setAuthError('Please meet all password requirements.');
        return;
      }
      if (authMode === 'reset' && password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (authMode === 'login' || authMode === 'register') {
        const endpoint = authMode === 'login' ? 'http://localhost:4000/api/auth/login' : 'http://localhost:4000/api/auth/register';
        const body = authMode === 'login' ? { email, password } : { email, password, name };
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (data.ok) {
          localStorage.setItem("enhix_token", data.token);
          localStorage.setItem("enhix_user", JSON.stringify(data.user));
          onLogin();
        } else {
          setAuthError(data.message);
        }
      } else if (authMode === 'forgot') {
        const res = await fetch('http://localhost:4000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        setAuthSuccess(data.message);
        if (data.mockToken) {
          // Mock email clicking for prototype
          setTimeout(() => {
             setResetToken(data.mockToken);
             setAuthMode('reset');
             setAuthSuccess('');
             setPassword('');
          }, 3000);
        }
      } else if (authMode === 'reset') {
        const res = await fetch('http://localhost:4000/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: password })
        });
        const data = await res.json();
        if (data.ok) {
          setAuthSuccess(data.message);
          setTimeout(() => {
             setAuthMode('login');
             setAuthSuccess('');
             setPassword('');
          }, 2000);
        } else {
          setAuthError(data.message);
        }
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsGoogleLoading(true);
    
    // Simulate OAuth redirect and consent screen delay
    setTimeout(async () => {
      try {
        const mockGoogleUser = {
          email: "creator@google.com",
          name: "Enhix Creator",
          picture: "https://lh3.googleusercontent.com/a/mock-image",
        };
        const res = await fetch('http://localhost:4000/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockGoogleUser)
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem("enhix_token", data.token);
          localStorage.setItem("enhix_user", JSON.stringify(data.user));
          onLogin();
        } else {
          setAuthError(data.message);
          setIsGoogleLoading(false);
        }
      } catch (err) {
        setAuthError('OAuth network error. Please try again.');
        setIsGoogleLoading(false);
      }
    }, 1500);
  };

  const PasswordRequirementsUI = () => (
    <div className="mt-3 bg-black/20 rounded-lg p-3 border border-white/5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password Strength</span>
        <span className="text-xs font-bold transition-colors" style={{ color: getStrength().color }}>
          {getStrength().label}
        </span>
      </div>
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
        <div className="h-full transition-all duration-300" style={{ width: getStrength().width, backgroundColor: getStrength().color }} />
      </div>
      <ul className="text-xs space-y-1">
        <li className={`flex items-center gap-2 transition-colors ${pwValidations.length ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.length ? '✓' : '○'}</span> At least 8 characters
        </li>
        <li className={`flex items-center gap-2 transition-colors ${pwValidations.uppercase ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.uppercase ? '✓' : '○'}</span> One uppercase letter
        </li>
        <li className={`flex items-center gap-2 transition-colors ${pwValidations.lowercase ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.lowercase ? '✓' : '○'}</span> One lowercase letter
        </li>
        <li className={`flex items-center gap-2 transition-colors ${pwValidations.number ? 'text-[#32d74b]' : 'text-[#8e8e93]'}`}>
          <span>{pwValidations.number ? '✓' : '○'}</span> One number
        </li>
      </ul>
    </div>
  );

  return (
    <div className="auth-container">
      <motion.div className="landing-bg-glow glow-blue" style={{ top: '10%', left: '10%', width: '40vw', height: '40vw' }} />
      <motion.div className="landing-bg-glow glow-violet" style={{ bottom: '10%', right: '10%', width: '40vw', height: '40vw' }} />
      
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
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center shadow-lg text-2xl font-bold text-white">E</div>
        </div>

        <h2 className="auth-title">
          {authMode === 'login' && 'Welcome Back'}
          {authMode === 'register' && 'Create Account'}
          {authMode === 'forgot' && 'Reset Password'}
          {authMode === 'reset' && 'Create New Password'}
        </h2>
        <p className="auth-subtitle">
          {authMode === 'login' && 'Log in to access your creative workspace.'}
          {authMode === 'register' && 'Join the next generation of media editing.'}
          {authMode === 'forgot' && 'Enter your email and we will send you a reset link.'}
          {authMode === 'reset' && 'Please enter a strong password for your account.'}
        </p>

        <form onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <div className="auth-input-group">
              <label>Full Name</label>
              <input type="text" className="auth-input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          
          {(authMode === 'login' || authMode === 'register' || authMode === 'forgot') && (
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
          )}

          {(authMode === 'login' || authMode === 'register' || authMode === 'reset') && (
            <div className="auth-input-group">
              <div className="flex justify-between items-center mb-2">
                <label style={{ marginBottom: 0 }}>Password</label>
                {authMode === 'login' && (
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }} className="text-xs text-[#0a84ff] hover:underline">Forgot password?</a>
                )}
              </div>
              <div className="relative flex items-center">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="auth-input pr-10" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={handlePasswordChange}
                  required 
                />
                <button 
                  type="button" 
                  className="absolute right-3 text-[#8e8e93] hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
              {(authMode === 'register' || authMode === 'reset') && <PasswordRequirementsUI />}
            </div>
          )}

          {authMode === 'reset' && (
             <div className="auth-input-group">
               <label>Confirm Password</label>
               <input 
                 type={showPassword ? "text" : "password"}
                 className="auth-input" 
                 placeholder="••••••••" 
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 required 
               />
             </div>
          )}

          <AnimatePresence>
            {authError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[#ff453a] text-sm mb-4 font-medium text-center">
                {authError}
              </motion.div>
            )}
            {authSuccess && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[#32d74b] text-sm mb-4 font-medium text-center">
                {authSuccess}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" className="auth-btn-primary" disabled={isLoading}>
            {isLoading ? "Please wait..." : (
               authMode === 'login' ? "Sign In to Enhix" : 
               authMode === 'register' ? "Create Account" : 
               authMode === 'forgot' ? "Send Reset Link" : "Reset Password"
            )}
          </button>
        </form>

        {(authMode === 'login' || authMode === 'register') && (
          <>
            <div className="auth-divider">or continue with</div>
            <button 
              type="button" 
              className="auth-btn-social" 
              onClick={handleGoogleSignIn} 
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-500 border-t-slate-200 rounded-full animate-spin"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              {isGoogleLoading ? 'Connecting...' : 'Google'}
            </button>
            <button className="auth-btn-social">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              GitHub
            </button>
          </>
        )}

        <div className="auth-footer">
          {authMode === 'login' && <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}>Sign up</a></>}
          {authMode === 'register' && <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}>Sign in</a></>}
          {(authMode === 'forgot' || authMode === 'reset') && <><a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}>Back to Sign In</a></>}
        </div>
      </motion.div>
    </div>
  );
}
