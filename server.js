require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = 'ebeitimothy19@gmail.com';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|ppt|pptx|txt|jpg|jpeg|png)$/i.test(file.originalname || '');
    cb(allowed ? null : new Error('Allowed files: PDF, Word, PowerPoint, TXT, JPG and PNG.'), allowed);
  }
});
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function requireSupabase(_req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Render.' });
  next();
}
async function authenticate(req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured.' });
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please log in first.' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  req.user = data.user;
  req.userSupabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  next();
}
function requireAdmin(req, res, next) {
  if (String(req.user.email || '').toLowerCase() !== ADMIN_EMAIL) return res.status(403).json({ error: 'Administrator access is restricted to the authorized account.' });
  next();
}

app.get('/', (_req, res) => res.redirect('/login'));
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/signup', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'signup.html')));
app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ScholarHub' }));

app.post('/api/auth/signup', requireSupabase, async (req, res) => {
  const { fullName, email, password, yearOfStudy, course } = req.body || {};
  if (!fullName || !email || !password || !yearOfStudy || !course) return res.status(400).json({ error: 'Please complete all required fields.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const normalizedEmail = String(email).trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail, password: String(password),
    options: { data: { full_name: String(fullName).trim(), year_of_study: String(yearOfStudy), course: String(course).trim() } }
  });
  if (error) return res.status(400).json({ error: error.message });
  if (!data.session) return res.status(200).json({ message: 'Account created. Check your email to confirm your account, then log in.' });
  return res.status(201).json({ message: 'Account created successfully.', session: data.session, user: data.user });
});
app.post('/api/auth/login', requireSupabase, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password: String(password) });
  if (error) return res.status(401).json({ error: 'Invalid email or password, or your email has not been confirmed.' });
  return res.json({ message: 'Logged in successfully.', session: data.session, user: data.user });
});
app.post('/api/auth/logout', (_req, res) => res.json({ message: 'Logged out.' }));

app.get('/api/profile', authenticate, async (req, res) => {
  const { data, error } = await req.userSupabase.from('profiles').select('id,full_name,email,phone,profile_image,course_id,course_name,year_of_study,combination_id,role,created_at').eq('id', req.user.id).maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not load profile. Make sure supabase/schema.sql has been run.' });
  return res.json({ profile: data, user: { id: req.user.id, email: req.user.email } });
});
app.get('/api/materials', authenticate, async (req, res) => {
  const { data, error } = await req.userSupabase.from('materials').select('id,title,description,unit_id,file_path,is_paid,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: 'Could not load materials. Run the latest database schema and policies.' });
  return res.json({ materials: data || [] });
});
app.get('/api/admin/summary', authenticate, requireAdmin, async (req, res) => {
  const [profiles, materials, notifications] = await Promise.all([
    req.userSupabase.from('profiles').select('id', { count: 'exact', head: true }),
    req.userSupabase.from('materials').select('id', { count: 'exact', head: true }),
    req.userSupabase.from('notifications').select('id', { count: 'exact', head: true })
  ]);
  return res.json({ users: profiles.count || 0, materials: materials.count || 0, notifications: notifications.count || 0 });
});
app.post('/api/admin/materials', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a lecture note or revision file to upload.' });
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const isPaid = String(req.body.is_paid || 'false') === 'true';
  if (!title) return res.status(400).json({ error: 'Material title is required.' });
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = req.user.id + '/' + Date.now() + '-' + safeName;
  const client = req.userSupabase;
  const { error: storageError } = await client.storage.from('materials').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
  if (storageError) return res.status(400).json({ error: 'File upload failed: ' + storageError.message + '. Check the private materials bucket and Storage policies in supabase/schema.sql.' });
  const { data, error } = await client.from('materials').insert({
    title, description: description || null, file_path: storagePath, is_paid: isPaid, uploaded_by: req.user.id
  }).select('id,title,description,file_path,is_paid,created_at').single();
  if (error) {
    await client.storage.from('materials').remove([storagePath]);
    return res.status(400).json({ error: 'File uploaded but database record failed: ' + error.message });
  }
  return res.status(201).json({ message: 'Material uploaded successfully.', material: data });
});
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File size must be 20 MB or less.' });
  return res.status(400).json({ error: err.message || 'Request failed.' });
});
app.listen(PORT, () => console.log(`ScholarHub running on port ${PORT}`));
