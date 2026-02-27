require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();

// ── USERS FILE — always relative to this file, not the terminal CWD ──
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {

  console.log('=== NEW LOGIN ===');
  console.log('Name:  ', profile.displayName);
  console.log('Email: ', profile.emails[0].value);
  console.log('Time:  ', new Date().toLocaleString());
  console.log('Saving to:', USERS_FILE);
  console.log('================');

  const user = {
    name:      profile.displayName,
    email:     profile.emails[0].value,
    googleId:  profile.id,
    photo:     profile.photos?.[0]?.value || '',
    loginTime: new Date().toLocaleString()
  };

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
      console.error('Error reading users.json:', err.message);
      users = [];
    }
  }

  const existingIndex = users.findIndex(u => u.googleId === user.googleId);
  if (existingIndex !== -1) {
    users[existingIndex].lastLogin  = user.loginTime;
    users[existingIndex].loginCount = (users[existingIndex].loginCount || 1) + 1;
    users[existingIndex].name       = user.name;
    users[existingIndex].photo      = user.photo;
  } else {
    user.loginCount = 1;
    users.push(user);
  }

  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('✅ users.json saved! Total users:', users.length);
  } catch (err) {
    console.error('❌ Failed to write users.json:', err.message);
  }

  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(express.static(path.join(__dirname)));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth.html' }),
  (req, res) => {
    const name  = encodeURIComponent(req.user.displayName || '');
    const photo = encodeURIComponent(req.user.photos?.[0]?.value || '');
    const email = encodeURIComponent(req.user.emails?.[0]?.value || '');
    res.redirect(`/index.html?loggedIn=true&name=${name}&photo=${photo}&email=${email}`);
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/auth.html'));
});

app.get('/admin/users', (req, res) => {
  if (!fs.existsSync(USERS_FILE)) {
    return res.send('No users yet. Expected file at: ' + USERS_FILE);
  }
  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return res.send('Error reading users file.');
  }

  const html = `<!DOCTYPE html><html><head><title>PharmaTrack — Admin</title>
    <style>
      body { font-family: sans-serif; background: #0A1628; color: white; padding: 2rem; }
      h1 { color: #02C39A; } p { color: rgba(255,255,255,0.4); font-size:0.9rem; margin-bottom:1.5rem; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #0F2A3D; color: #02C39A; padding: 0.75rem 1rem; text-align:left; font-size:0.8rem; letter-spacing:1px; text-transform:uppercase; }
      td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.07); font-size:0.88rem; }
      tr:hover td { background: rgba(2,195,154,0.05); }
      img { width:32px; height:32px; border-radius:50%; vertical-align:middle; }
      .count { background:rgba(2,195,154,0.15); color:#02C39A; padding:0.2rem 0.6rem; border-radius:100px; font-size:0.75rem; font-weight:600; }
    </style></head><body>
    <h1>PharmaTrack — Users</h1>
    <p>Total: <strong style="color:#02C39A">${users.length}</strong></p>
    <table><tr><th>#</th><th>Photo</th><th>Name</th><th>Email</th><th>First Login</th><th>Last Login</th><th>Logins</th></tr>
    ${users.map((u, i) => `<tr>
      <td>${i+1}</td>
      <td>${u.photo ? `<img src="${u.photo}">` : '—'}</td>
      <td>${u.name}</td><td>${u.email}</td>
      <td>${u.loginTime}</td><td>${u.lastLogin || u.loginTime}</td>
      <td><span class="count">${u.loginCount || 1}x</span></td>
    </tr>`).join('')}
    </table></body></html>`;
  res.send(html);
});

app.get('/api/me', (req, res) => {
  res.json(req.isAuthenticated() ? { loggedIn: true, user: req.user } : { loggedIn: false });
});

app.listen(3000, () => {
  console.log('✅ PharmaTrack running on http://localhost:3000');
  console.log('📁 Users file will be saved to:', USERS_FILE);
});