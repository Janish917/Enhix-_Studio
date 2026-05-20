import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '../lib/config.js';
import './Settings.css';

export function Settings({ onClose, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({ name: '', email: '', username: '', bio: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState('');
  
  // Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Fetch profile
    const token = localStorage.getItem('enhix_token');
    if (!token) return;
    fetch(apiUrl('/api/users/profile'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.ok && data.user) {
        setUser({
          name: data.user.name || '',
          email: data.user.email || '',
          username: data.user.username || data.user.name?.split(' ')[0]?.toLowerCase() || '',
          bio: data.user.bio || ''
        });
      }
    });
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('enhix_token');
    try {
      const res = await fetch(apiUrl('/api/users/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (data.ok) {
        setToast('Profile updated successfully.');
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    const token = localStorage.getItem('enhix_token');
    try {
      const res = await fetch(apiUrl('/api/users/account'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.removeItem('enhix_token');
        localStorage.removeItem('enhix_user');
        onLogout(); // Force logout
      } else {
        alert(data.message || 'Failed to delete account');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [pwValidations, setPwValidations] = useState({
    length: false, uppercase: false, lowercase: false, number: false,
  });

  const onNewPasswordChange = (e) => {
    const pw = e.target.value;
    setNewPassword(pw);
    setPwValidations({
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
    });
  };

  const getStrength = () => {
    const score = Object.values(pwValidations).filter(Boolean).length;
    if (newPassword.length === 0) return { label: '', color: 'transparent', width: '0%' };
    if (score <= 2) return { label: 'Weak', color: '#ff453a', width: '33%' };
    if (score === 3) return { label: 'Medium', color: '#ffd60a', width: '66%' };
    return { label: 'Strong', color: '#32d74b', width: '100%' };
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (Object.values(pwValidations).some(v => !v)) {
      setPasswordError('Please meet all password requirements.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    const token = localStorage.getItem('enhix_token');
    try {
      const res = await fetch(apiUrl('/api/users/password'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setToast('Password changed successfully. Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('enhix_token');
          localStorage.removeItem('enhix_user');
          onLogout();
        }, 2000);
      } else {
        setPasswordError(data.message);
      }
    } catch (err) {
      setPasswordError('Connection error.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const navItems = [
    { id: 'profile', label: 'Edit Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'storage', label: 'Cloud Storage', icon: '☁️' },
    { id: 'sessions', label: 'Active Sessions', icon: '🔒' },
  ];

  return (
    <div className="settings-overlay">
      <motion.div 
        className="settings-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
      >
        <button className="settings-close" onClick={onClose}>✕</button>
        
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">Account Settings</div>
          <div className="settings-nav">
            {navItems.map(item => (
              <div 
                key={item.id} 
                className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div className="settings-nav-item" style={{ color: '#ff9f0a' }} onClick={onLogout}>
              <span>🚪</span> Sign Out
            </div>
            <div className="settings-nav-item danger" onClick={() => setActiveTab('delete')}>
              <span>⚠️</span> Delete Account
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="settings-content">
          <AnimatePresence mode="wait">
            {toast && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur z-20"
              >
                {toast}
              </motion.div>
            )}
            
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="settings-section-title">Edit Profile</h2>
                
                <div className="settings-avatar-upload">
                  <div className="avatar-preview">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <div>
                    <div className="flex gap-3 mb-2">
                      <button className="btn-settings-primary">Upload New Photo</button>
                      <button className="btn-settings-secondary">Remove</button>
                    </div>
                    <div className="text-xs text-[#8e8e93]">JPG, GIF or PNG. Max size of 800K.</div>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="settings-card">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="settings-input-group">
                      <label>Full Name</label>
                      <input type="text" className="settings-input" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required />
                    </div>
                    <div className="settings-input-group">
                      <label>Username</label>
                      <input type="text" className="settings-input" value={user.username} onChange={e => setUser({...user, username: e.target.value})} required />
                    </div>
                  </div>
                  <div className="settings-input-group">
                    <label>Email Address</label>
                    <input type="email" className="settings-input" value={user.email} onChange={e => setUser({...user, email: e.target.value})} required />
                  </div>
                  <div className="settings-input-group">
                    <label>Bio</label>
                    <textarea className="settings-input" rows="3" value={user.bio} onChange={e => setUser({...user, bio: e.target.value})} placeholder="Tell us about your creative journey..." />
                  </div>
                  <div className="flex justify-end mt-6">
                    <button type="submit" className="btn-settings-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="settings-section-title">Change Password</h2>
                <form onSubmit={handleChangePassword} className="settings-card">
                  <div className="settings-input-group relative">
                    <label>Current Password</label>
                    <input type={showPasswords ? "text" : "password"} className="settings-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                  </div>
                  
                  <div className="settings-input-group relative">
                    <label>New Password</label>
                    <input type={showPasswords ? "text" : "password"} className="settings-input" value={newPassword} onChange={onNewPasswordChange} required />
                    <button type="button" className="absolute right-3 top-[34px] text-[#8e8e93] hover:text-white" onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? "👁️" : "🙈"}
                    </button>
                  </div>
                  
                  {newPassword.length > 0 && (
                    <div className="mb-4 bg-black/20 rounded-lg p-3 border border-white/5">
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
                  )}

                  <div className="settings-input-group relative">
                    <label>Confirm New Password</label>
                    <input type={showPasswords ? "text" : "password"} className="settings-input" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required />
                  </div>

                  <AnimatePresence>
                    {passwordError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[#ff453a] text-sm mb-4 font-medium">
                        {passwordError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-end mt-4">
                    <button type="submit" className="btn-settings-primary" disabled={isChangingPassword}>
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div key="pref" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="settings-section-title">Preferences</h2>
                <div className="settings-card space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <div>
                      <div className="font-semibold mb-1">Dark Mode</div>
                      <div className="text-xs text-[#8e8e93]">Toggle the appearance of the studio.</div>
                    </div>
                    <div className="w-12 h-6 bg-[#0a84ff] rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute top-[2px] right-[2px] shadow-sm"></div></div>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <div>
                      <div className="font-semibold mb-1">Auto-Save Projects</div>
                      <div className="text-xs text-[#8e8e93]">Automatically sync your edits to Cloudinary.</div>
                    </div>
                    <div className="w-12 h-6 bg-[#0a84ff] rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute top-[2px] right-[2px] shadow-sm"></div></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold mb-1">Rendering Quality</div>
                      <div className="text-xs text-[#8e8e93]">Default export quality for video/images.</div>
                    </div>
                    <select className="bg-black/30 border border-white/10 rounded-lg text-sm p-2 text-white outline-none">
                       <option>High (4K/Lossless)</option>
                       <option>Medium (1080p)</option>
                       <option>Web Optimized (720p)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'storage' && (
              <motion.div key="storage" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="settings-section-title">Cloud Storage Management</h2>
                <div className="settings-card">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">24.5 GB Used</span>
                    <span className="text-[#8e8e93]">100 GB Total</span>
                  </div>
                  <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden mb-8">
                    <div className="h-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]" style={{ width: '24.5%' }}></div>
                  </div>

                  <div className="space-y-3">
                     {[1, 2, 3].map(i => (
                       <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-black/30 rounded flex items-center justify-center text-xl">🎬</div>
                           <div>
                             <div className="font-medium text-sm">Project_Render_v{i}.mp4</div>
                             <div className="text-xs text-[#8e8e93]">Updated 2 days ago • {120 * i} MB</div>
                           </div>
                         </div>
                         <button className="text-[#ff453a] text-sm hover:underline">Delete</button>
                       </div>
                     ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sessions' && (
              <motion.div key="sess" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="settings-section-title">Session Management</h2>
                <div className="settings-card">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <div>
                         <div className="font-bold flex items-center gap-2">MacBook Pro - Chrome <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">Active</span></div>
                         <div className="text-xs text-[#8e8e93] mt-1">San Francisco, CA • Current Session</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                      <div>
                         <div className="font-bold">iPhone 14 Pro - Safari</div>
                         <div className="text-xs text-[#8e8e93] mt-1">San Francisco, CA • Last seen yesterday</div>
                      </div>
                      <button className="btn-settings-secondary text-xs">Revoke</button>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                     <button className="btn-settings-danger">Log Out of All Devices</button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'delete' && (
              <motion.div key="del" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="settings-section-title text-[#ff453a]">Delete Account</h2>
                <div className="settings-card border-[#ff453a]/30 bg-[#ff453a]/5">
                  <h3 className="font-bold text-lg mb-2 text-white">Irreversible Action</h3>
                  <p className="text-sm text-[#8e8e93] mb-6">
                    Permanently delete your Enhix account, all uploaded media, saved projects, AI history, and revoke all active sessions. This cannot be undone.
                  </p>
                  <button onClick={() => setShowDeleteModal(true)} className="btn-settings-danger w-full justify-center text-lg py-3">
                    Delete My Account
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div 
              className="delete-modal-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div 
                className="delete-modal"
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              >
                <h3>Are you absolutely sure?</h3>
                <p>This will permanently delete your profile, media, and projects. Please type <strong>DELETE</strong> to confirm.</p>
                <div className="settings-input-group">
                  <input 
                    type="text" 
                    className="settings-input" 
                    placeholder="Type DELETE" 
                    value={deleteConfirmText} 
                    onChange={e => setDeleteConfirmText(e.target.value)}
                  />
                </div>
                <div className="settings-input-group">
                  <input 
                    type="password" 
                    className="settings-input" 
                    placeholder="Enter your password" 
                    value={deletePassword} 
                    onChange={e => setDeletePassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowDeleteModal(false)} className="btn-settings-secondary flex-1">Cancel</button>
                  <button 
                    onClick={handleDeleteAccount} 
                    className="btn-settings-danger flex-1"
                    disabled={deleteConfirmText !== 'DELETE' || !deletePassword || isDeleting}
                    style={{ opacity: (deleteConfirmText === 'DELETE' && deletePassword) ? 1 : 0.5 }}
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
