require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { createProxyMiddleware } = require('http-proxy-middleware');
const multer = require('multer');

const app = express();

// ── CONFIGURATION ──
const PORT = process.env.PORT || 3000;
const BASE_URL = (
  process.env.BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const USERS_FILE = path.join(__dirname, 'users.json');

// ── REQUIRED ENVIRONMENT VARIABLES ──
const requiredEnv = [
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(
    'Missing environment variables:',
    missingEnv.join(', ')
  );
  process.exit(1);
}

// ── SUPABASE ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// ── MIDDLEWARE ──
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ── GOOGLE OAUTH STRATEGY ──
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,

  // Uses Render URL in production and localhost locally.
  callbackURL: `${BASE_URL}/auth/google/callback`

}, async (accessToken, refreshToken, profile, done) => {

  try {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      return done(new Error('Google did not provide an email address.'));
    }

    const loginTime = new Date().toISOString();

    const user = {
      name: profile.displayName || '',
      email,
      googleId: profile.id,
      photo: profile.photos?.[0]?.value || '',
      loginTime
    };

    console.log('=== NEW GOOGLE LOGIN ===');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Time:', loginTime);
    console.log('========================');

    // ── LOCAL JSON BACKUP ──
    // Render's filesystem may be ephemeral.
    let users = [];

    try {
      if (fs.existsSync(USERS_FILE)) {
        const parsed = JSON.parse(
          fs.readFileSync(USERS_FILE, 'utf8')
        );

        users = Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn(
        'Could not read users.json:',
        err.message
      );
    }

    const existingIndex = users.findIndex(
      u => u.googleId === user.googleId
    );

    if (existingIndex !== -1) {
      users[existingIndex].name = user.name;
      users[existingIndex].email = user.email;
      users[existingIndex].photo = user.photo;
      users[existingIndex].lastLogin = loginTime;
      users[existingIndex].loginCount =
        (users[existingIndex].loginCount || 1) + 1;
    } else {
      user.firstLogin = loginTime;
      user.lastLogin = loginTime;
      user.loginCount = 1;
      users.push(user);
    }

    try {
      fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2)
      );

      console.log(
        'users.json saved. Total users:',
        users.length
      );
    } catch (err) {
      console.warn(
        'Could not save users.json:',
        err.message
      );
    }

    // ── SUPABASE USER SYNC ──
    try {
      const { data: existing, error: selectError } =
        await supabase
          .from('users')
          .select('id, login_count')
          .eq('google_id', profile.id)
          .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: user.name,
            email: user.email,
            photo: user.photo,
            last_login: loginTime,
            login_count: (existing.login_count || 1) + 1
          })
          .eq('google_id', profile.id);

        if (updateError) {
          throw updateError;
        }

        console.log('Supabase user updated');
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            name: user.name,
            email: user.email,
            google_id: profile.id,
            photo: user.photo,
            login_count: 1,
            first_login: loginTime,
            last_login: loginTime
          }]);

        if (insertError) {
          throw insertError;
        }

        console.log('Supabase user inserted');
      }
    } catch (err) {
      // A Supabase failure should not prevent Google login.
      console.warn(
        'Supabase sync failed:',
        err.message
      );
    }

    return done(null, profile);

  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// ── STATIC FILES ──
app.use(express.static(__dirname));

// ── GOOGLE AUTH ROUTES ──
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth.html?error=google_login_failed'
  }),
  (req, res) => {
    const name = encodeURIComponent(
      req.user.displayName || ''
    );

    const photo = encodeURIComponent(
      req.user.photos?.[0]?.value || ''
    );

    const email = encodeURIComponent(
      req.user.emails?.[0]?.value || ''
    );

    res.redirect(
      `/index.html?loggedIn=true&name=${name}&photo=${photo}&email=${email}`
    );
  }
);

// ── EMAIL LOGIN ──
app.post('/auth/email', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.redirect(
      '/auth.html?error=missingcredentials'
    );
  }

  if (!fs.existsSync(USERS_FILE)) {
    return res.redirect(
      '/auth.html?error=nouserfile'
    );
  }

  let users = [];

  try {
    users = JSON.parse(
      fs.readFileSync(USERS_FILE, 'utf8')
    );

    if (!Array.isArray(users)) {
      throw new Error('Invalid users.json format');
    }
  } catch (err) {
    console.error('Could not read users.json:', err.message);

    return res.redirect(
      '/auth.html?error=readerror'
    );
  }

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.redirect(
      '/auth.html?error=invalid'
    );
  }

  user.lastLogin = new Date().toISOString();
  user.loginCount = (user.loginCount || 1) + 1;

  try {
    fs.writeFileSync(
      USERS_FILE,
      JSON.stringify(users, null, 2)
    );
  } catch (err) {
    console.warn(
      'Could not update users.json:',
      err.message
    );
  }

  // Sync email login to Supabase.
  try {
    const { error } = await supabase
      .from('users')
      .update({
        last_login: user.lastLogin,
        login_count: user.loginCount
      })
      .eq('email', email);

    if (error) {
      throw error;
    }

    console.log('Supabase email login synced');
  } catch (err) {
    console.warn(
      'Supabase email sync failed:',
      err.message
    );
  }

  req.session.user = {
    email: user.email,
    name: user.name || '',
    isAdmin: user.isAdmin || false
  };

  const name = encodeURIComponent(user.name || '');
  const photo = encodeURIComponent(user.photo || '');

  res.redirect(
    `/index.html?loggedIn=true&name=${name}&photo=${photo}&email=${encodeURIComponent(user.email)}`
  );
});

// ── LOGOUT ──
app.get('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }

    req.session.destroy(err => {
      if (err) {
        return next(err);
      }

      res.clearCookie('connect.sid');
      res.redirect('/auth.html');
    });
  });
});

// ── ADMIN USERS PAGE ──
app.get('/admin/users', async (req, res) => {
  // IMPORTANT:
  // Add proper admin authentication before making this page public.
  let users = [];

  // Prefer persistent Supabase records.
  try {
    const { data, error } = await supabase
      .from('users')
      .select(
        'name, email, photo, first_login, last_login, login_count'
      )
      .order('last_login', { ascending: false });

    if (error) {
      throw error;
    }

    users = (data || []).map(u => ({
      name: u.name || '',
      email: u.email || '',
      photo: u.photo || '',
      firstLogin: u.first_login || '',
      lastLogin: u.last_login || '',
      loginCount: u.login_count || 1
    }));

  } catch (err) {
    console.warn(
      'Could not fetch users from Supabase:',
      err.message
    );

    try {
      if (fs.existsSync(USERS_FILE)) {
        const parsed = JSON.parse(
          fs.readFileSync(USERS_FILE, 'utf8')
        );

        users = Array.isArray(parsed) ? parsed : [];
      }
    } catch (readError) {
      console.error(
        'Could not read users.json:',
        readError.message
      );

      return res.status(500).send(
        'Error reading user records.'
      );
    }
  }

  // Escape user-controlled text before rendering HTML.
  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PharmaTrack — Users</title>

    <style>
      body {
        font-family: sans-serif;
        background: #0A1628;
        color: white;
        padding: 2rem;
      }

      h1 { color: #02C39A; }

      p {
        color: rgba(255,255,255,0.7);
        font-size: 0.9rem;
      }

      .table-wrap { overflow-x: auto; }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th {
        background: #0F2A3D;
        color: #02C39A;
        padding: 0.75rem 1rem;
        text-align: left;
        font-size: 0.8rem;
      }

      td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        font-size: 0.88rem;
      }

      img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }

      .count {
        background: rgba(2,195,154,0.15);
        color: #02C39A;
        padding: 0.2rem 0.6rem;
        border-radius: 100px;
      }
    </style>
  </head>

  <body>
    <h1>PharmaTrack — Users</h1>

    <p>
      Total users:
      <strong style="color:#02C39A">${users.length}</strong>
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Photo</th>
            <th>Name</th>
            <th>Email</th>
            <th>First Login</th>
            <th>Last Login</th>
            <th>Logins</th>
          </tr>
        </thead>

        <tbody>
          ${users.map((u, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>
                ${u.photo
                  ? `<img src="${escapeHtml(u.photo)}" alt="">`
                  : '—'}
              </td>
              <td>${escapeHtml(u.name)}</td>
              <td>${escapeHtml(u.email)}</td>
              <td>${escapeHtml(u.firstLogin || u.loginTime || '')}</td>
              <td>${escapeHtml(u.lastLogin || u.loginTime || '')}</td>
              <td>
                <span class="count">
                  ${escapeHtml(u.loginCount || 1)}x
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </body>
  </html>`;

  res.send(html);
});

// ── CURRENT USER API ──
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      loggedIn: true,
      user: req.user
    });
  }

  if (req.session?.user) {
    return res.json({
      loggedIn: true,
      user: req.session.user
    });
  }

  return res.json({
    loggedIn: false
  });
});

// ── EXISTING API ROUTES ──
const apiRoutes = require('./server_api_route');
app.use('/api', apiRoutes);

const hospitalsRoute = require('./routes/hospitals');
app.use('/api/hospitals', hospitalsRoute);

const prescriptionRoute = require('./routes/prescription');
app.use('/api/prescription', prescriptionRoute);

// ── COSINE ALTERNATIVES PROXY ──
// Local development default: http://localhost:5000
// On Render, set COSINE_API_URL to the deployed Flask service URL.
const cosineTarget =
  process.env.COSINE_API_URL || 'http://localhost:5000';

app.use(
  '/api/cosine-alternatives',
  createProxyMiddleware({
    target: cosineTarget,
    changeOrigin: true
  })
);

// ── PRESCRIPTION UPLOAD CONFIGURATION ──
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ];

    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error('Invalid file type'));
  }
});

app.locals.upload = upload;

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Request error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).send(
    'Something went wrong. Please try again.'
  );
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`PharmaTrack listening on port ${PORT}`);
  console.log(`Configured base URL: ${BASE_URL}`);
  console.log(`Production mode: ${IS_PRODUCTION}`);
});