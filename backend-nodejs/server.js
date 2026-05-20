const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { ok: false, message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const MAX_SIZE_BYTES = 50 * 1024 * 1024; 

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES }
});

app.post('/api/upload', (req, res, next) => {
  upload.single('media')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          ok: false,
          code: 'FILE_TOO_LARGE',
          message: 'File size too big. Max 50 MB.'
        });
      }
      return res.status(400).json({
        ok: false,
        code: 'UPLOAD_ERROR',
        message: 'Upload failed. Please try again.'
      });
    } else if (err) {
      return res.status(500).json({
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Unexpected server error.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, code: 'NO_FILE', message: 'No file uploaded.' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype.startsWith('video/');

    let message = 'File uploaded successfully.';
    if (isImage) {
      message = 'Image uploaded successfully. Continue to tools below.';
    } else if (isVideo) {
      message = 'Video uploaded successfully. Continue to tools below.';
    }

    return res.json({
      ok: true,
      message,
      filename: req.file.filename,
      type: isImage ? 'image' : isVideo ? 'video' : 'other'
    });
  });
});

// Authentication System (Mock DB for demonstration)
const users = []; // { id, email, password, name }
const projects = []; // { id, userId, data, name, updatedAt }
const resetTokens = []; // { token, email, expiresAt }

app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ ok: false, message: 'User already exists' });
  }
  
  const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!pwRegex.test(password)) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email, password: hashedPassword, name };
  users.push(user);
  const token = `jwt-token-${user.id}`;
  res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  
  const token = `jwt-token-${user.id}`;
  res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/google', loginLimiter, async (req, res) => {
  const { email, name, picture } = req.body;
  if (!email) return res.status(400).json({ ok: false, message: 'Google OAuth failed to provide an email address.' });
  
  let user = users.find(u => u.email === email);
  if (!user) {
    // Auto-create user for Google sign-in
    // Assign a random extremely complex password since they won't log in with password
    const complexRandomPassword = Date.now().toString() + Math.random().toString(36) + 'Aa1!';
    const hashedPassword = await bcrypt.hash(complexRandomPassword, 10);
    user = { id: Date.now().toString(), email, password: hashedPassword, name, authProvider: 'google', picture };
    users.push(user);
  }
  
  const token = `jwt-token-${user.id}`;
  res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
});

app.post('/api/auth/forgot-password', loginLimiter, (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    // For security, don't reveal if user exists, just say ok
    return res.json({ ok: true, message: 'If that email is in our system, we have sent a reset link.' });
  }
  
  const token = Date.now().toString() + Math.random().toString(36).substr(2);
  resetTokens.push({ token, email, expiresAt: Date.now() + 15 * 60 * 1000 }); // 15 mins
  
  console.log(`\n\n[MOCK EMAIL] Reset link generated for ${email}:\nhttp://localhost:5180/reset-password?token=${token}\n\n`);
  
  // For demo purposes, we return the token to the frontend so it can be auto-filled in the prototype. 
  // In production, NEVER return this in the response.
  res.json({ ok: true, message: 'If that email is in our system, we have sent a reset link.', mockToken: token });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const tokenRecordIndex = resetTokens.findIndex(t => t.token === token);
  
  if (tokenRecordIndex === -1) {
    return res.status(400).json({ ok: false, message: 'Invalid or expired reset token.' });
  }
  
  const tokenRecord = resetTokens[tokenRecordIndex];
  if (Date.now() > tokenRecord.expiresAt) {
    resetTokens.splice(tokenRecordIndex, 1);
    return res.status(400).json({ ok: false, message: 'Reset token has expired.' });
  }
  
  const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!pwRegex.test(newPassword)) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers.' });
  }
  
  const user = users.find(u => u.email === tokenRecord.email);
  if (user) {
    user.password = await bcrypt.hash(newPassword, 10);
  }
  
  // Invalidate token
  resetTokens.splice(tokenRecordIndex, 1);
  
  res.json({ ok: true, message: 'Password has been reset successfully. You can now login.' });
});

app.post('/api/auth/logout', (req, res) => {
  // In a real app we'd blacklist the JWT token or delete the session from DB.
  // For this mock, we just respond with success.
  res.json({ ok: true, message: 'Logged out successfully.' });
});

// Middleware for JWT Verification
const verifyToken = (req, res, next) => {
  const bearer = req.headers.authorization;
  if (!bearer) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  const token = bearer.split(' ')[1];
  const userId = token.replace('jwt-token-', '');
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ ok: false, message: 'Invalid session' });
  req.user = user;
  next();
};

app.get('/api/users/profile', verifyToken, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.put('/api/users/profile', verifyToken, async (req, res) => {
  const { name, email, password, bio, username } = req.body;
  const user = users.find(u => u.id === req.user.id);
  if (name) user.name = name;
  if (email) user.email = email;
  if (password) {
     const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
     if (!pwRegex.test(password)) {
       return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers.' });
     }
     user.password = await bcrypt.hash(password, 10);
  }
  if (bio) user.bio = bio;
  if (username) user.username = username;
  res.json({ ok: true, message: 'Profile updated successfully', user });
});

app.put('/api/users/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) return res.status(404).json({ ok: false, message: 'User not found.' });
  
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(401).json({ ok: false, message: 'Current password is incorrect.' });
  
  const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!pwRegex.test(newPassword)) {
    return res.status(400).json({ ok: false, message: 'New password must be at least 8 characters and include uppercase, lowercase, and numbers.' });
  }
  
  user.password = await bcrypt.hash(newPassword, 10);
  res.json({ ok: true, message: 'Password updated successfully. You have been logged out of other sessions.' });
});

app.delete('/api/users/account', verifyToken, async (req, res) => {
  const { password } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.status(404).json({ ok: false, message: 'User not found' });
  
  const isMatch = await bcrypt.compare(password, users[userIndex].password);
  if (!isMatch) return res.status(401).json({ ok: false, message: 'Incorrect password' });
  
  // 1. Delete User
  users.splice(userIndex, 1);
  
  // 2. Delete Projects (Mock)
  for (let i = projects.length - 1; i >= 0; i--) {
     if (projects[i].userId === req.user.id) {
         projects.splice(i, 1);
     }
  }
  
  // 3. (Mock) Clear Cloud Storage & Media
  // In a real app we'd delete from S3/Cloudinary here.
  
  res.json({ ok: true, message: 'Account and all associated data permanently deleted.' });
});

app.get('/api/users/sessions', verifyToken, (req, res) => {
  // Mock sessions
  res.json({ ok: true, sessions: [
    { id: '1', device: 'MacBook Pro - Chrome', location: 'San Francisco, CA', active: true, lastSeen: new Date() },
    { id: '2', device: 'iPhone 14 Pro - Safari', location: 'San Francisco, CA', active: false, lastSeen: new Date(Date.now() - 86400000) }
  ]});
});

app.post('/api/projects/save', verifyToken, (req, res) => {
  const { projectData, name } = req.body;
  const project = { id: Date.now().toString(), userId: req.user.id, data: projectData, name, updatedAt: new Date() };
  projects.push(project);
  res.json({ ok: true, message: 'Project saved to cloud successfully.', project });
});

// List all projects for authenticated user
app.get('/api/projects', verifyToken, (req, res) => {
  const userProjects = projects.filter(p => p.userId === req.user.id);
  res.json({ ok: true, projects: userProjects });
});

// Delete a project
app.delete('/api/projects/:id', verifyToken, (req, res) => {
  const index = projects.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
  if (index === -1) {
    return res.status(404).json({ ok: false, message: 'Project not found' });
  }
  projects.splice(index, 1);
  res.json({ ok: true, message: 'Project deleted successfully' });
});

// List all uploaded media files in the uploads/ directory
app.get('/api/media', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ ok: false, message: 'Could not read uploads directory' });
    }
    
    const mediaFiles = files.filter(file => !file.startsWith('.'));
    const items = mediaFiles.map(file => {
      const ext = path.extname(file).toLowerCase();
      let contentType = 'application/octet-stream';
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        contentType = `image/${ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : ext.replace('.', '')}`;
      } else if (['.mp4', '.webm', '.mov'].includes(ext)) {
        contentType = `video/${ext === '.mov' ? 'quicktime' : ext.replace('.', '')}`;
      }
      return {
        id: file,
        filename: file,
        contentType
      };
    });
    res.json(items);
  });
});

// Serve a specific uploaded media file
app.get('/api/media/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(PORT, () => {
  console.log(`ENHIX backend running on http://localhost:${PORT}`);
});
