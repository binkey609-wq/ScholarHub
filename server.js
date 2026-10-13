require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Render Environment.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  : null;

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function requireSupabase(_req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      error: 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to your Render environment variables.'
    });
  }
  next();
}

app.get('/', (_req, res) => res.redirect('/login'));
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/signup', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'signup.html')));
app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ScholarHub' }));

// Supabase Auth handles password hashing and account security; passwords are never stored by ScholarHub.
app.post('/api/auth/signup', requireSupabase, async (req, res) => {
  const { fullName, email, password, yearOfStudy, course } = req.body || {};
  if (!fullName || !email || !password || !yearOfStudy || !course) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password: String(password),
    options: { data: { full_name: String(fullName).trim(), year_of_study: String(yearOfStudy), course: String(course).trim() } }
  });

  if (error) return res.status(400).json({ error: error.message });
  if (!data.session) {
    return res.status(200).json({ message: 'Account created. Check your email to confirm your account, then log in.' });
  }
  return res.status(201).json({ message: 'Account created successfully.', session: data.session, user: data.user });
});

app.post('/api/auth/login', requireSupabase, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password: String(password)
  });
  if (error) return res.status(401).json({ error: 'Invalid email or password, or your email has not been confirmed.' });
  return res.json({ message: 'Logged in successfully.', session: data.session, user: data.user });
});

app.post('/api/auth/logout', (_req, res) => {
  // The browser clears its local session. Supabase access tokens expire automatically;
  // use supabase.auth.signOut() with the user's session if server-side revocation is needed.
  res.json({ message: 'Logged out.' });
});

app.listen(PORT, () => console.log(`ScholarHub running on port ${PORT}`));
