require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs   = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ── SUPABASE ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── USERS FILE — always relative to this file, not the terminal CWD ──
const USERS_FILE = path.join(__dirname, 'users.json');

// ── MIDDLEWARE ──
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

// ── GOOGLE OAUTH STRATEGY ──
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  'http://localhost:3000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {

  console.log('=== NEW LOGIN ===');
  console.log('Name:  ', profile.displayName);
  console.log('Email: ', profile.emails[0].value);
  console.log('Time:  ', new Date().toLocaleString());
  console.log('================');

  const user = {
    name:      profile.displayName,
    email:     profile.emails[0].value,
    googleId:  profile.id,
    photo:     profile.photos?.[0]?.value || '',
    loginTime: new Date().toLocaleString()
  };

  // ── 1. SAFE: Always write to users.json first ──
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

  // ── 2. SAFE: Also sync to Supabase (won't crash app if fails) ──
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id, login_count')
      .eq('google_id', profile.id)
      .single();

    if (existing) {
      await supabase
        .from('users')
        .update({
          name:        user.name,
          photo:       user.photo,
          last_login:  new Date().toISOString(),
          login_count: (existing.login_count || 1) + 1
        })
        .eq('google_id', profile.id);
      console.log('✅ Supabase user updated');
    } else {
      await supabase
        .from('users')
        .insert([{
          name:        user.name,
          email:       user.email,
          google_id:   profile.id,
          photo:       user.photo,
          login_count: 1,
          first_login: new Date().toISOString(),
          last_login:  new Date().toISOString()
        }]);
      console.log('✅ Supabase new user inserted');
    }
  } catch (err) {
    console.warn('⚠️ Supabase sync failed (JSON backup still works):', err.message);
  }

  return done(null, profile);
}));

passport.serializeUser((user, done)   => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ── STATIC FILES ──
app.use(express.static(path.join(__dirname)));

// ── GOOGLE AUTH ROUTES ──
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

// ── EMAIL LOGIN ROUTE ──
app.post('/auth/email', (req, res) => {
  const { email, password } = req.body;

  if (!fs.existsSync(USERS_FILE)) {
    return res.redirect('/auth.html?error=nouserfile');
  }

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return res.redirect('/auth.html?error=readerror');
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.redirect('/auth.html?error=invalid');
  }

  // Update login time / count in JSON
  user.lastLogin  = new Date().toLocaleString();
  user.loginCount = (user.loginCount || 1) + 1;
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch {}

  // Also sync to Supabase safely
  supabase
    .from('users')
    .update({ last_login: new Date().toISOString(), login_count: user.loginCount })
    .eq('email', email)
    .then(() => console.log('✅ Supabase email login synced'))
    .catch(err => console.warn('⚠️ Supabase email sync failed:', err.message));

  req.session.user = {
    email:   user.email,
    name:    user.name    || '',
    isAdmin: user.isAdmin || false
  };

  const name  = encodeURIComponent(user.name  || '');
  const photo = encodeURIComponent(user.photo || '');
  res.redirect(`/index.html?loggedIn=true&name=${name}&photo=${photo}&email=${encodeURIComponent(user.email)}`);
});

// ── LOGOUT ──
app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/auth.html'));
});

// ── ADMIN USERS PAGE ──
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

// ── API ──
app.get('/api/me', (req, res) => {
  res.json(req.isAuthenticated()
    ? { loggedIn: true,  user: req.user }
    : { loggedIn: false });
});

// ── API ROUTES ──
const apiRoutes = require('./server_api_route');
app.use('/api', apiRoutes);
// ── HOSPITALS ROUTE ──
const hospitalsRoute = require('./routes/hospitals');
app.use('/api/hospitals', hospitalsRoute);

// ── PRESCRIPTION ROUTE ──
const prescriptionRoute = require('./routes/prescription');
app.use('/api/prescription', prescriptionRoute);

// ── PROXY: /api/cosine-alternatives → Flask :5000 ──
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use(
  '/api/cosine-alternatives',
  createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
  })
);

// ── MULTER (prescription uploads) ──
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  }
});
app.locals.upload = upload;

// ── START SERVER ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PharmaTrack running at http://localhost:${PORT}`);
});