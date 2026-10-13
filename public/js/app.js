const sessionKey = 'scholarhub_session';
const userKey = 'scholarhub_user';
const session = (() => { try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { return null; } })();
if (!session?.access_token) window.location.replace('/login');

const user = (() => { try { return JSON.parse(sessionStorage.getItem(userKey) || 'null'); } catch { return null; } })();
const toast = document.getElementById('toast');
const sidebar = document.getElementById('sidebar');
const pageTitle = document.getElementById('pageTitle');
const appRoot = document.getElementById('app');
const titles = {home:'Welcome back 👋',profile:'My Profile',year:'Year of Study',units:'My Units',combination:'Course Combination',packages:'Packages',settings:'Settings'};
let profile = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message; toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: 'Bearer ' + session.access_token, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { sessionStorage.clear(); window.location.replace('/login'); throw new Error('Your session expired. Please log in again.'); }
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function shell(title, body) {
  pageTitle.textContent = title;
  appRoot.innerHTML = body;
  sidebar?.classList.remove('open');
}
function materialCard(item) {
  return '<article class="material"><div class="file-icon">📄</div><div class="material-info"><strong>'+esc(item.title)+'</strong><span>'+esc(item.description || 'Academic material')+' · '+new Date(item.created_at).toLocaleDateString()+'</span></div><span class="notification-count">'+(item.is_paid?'Premium':'Available')+'</span></article>';
}
async function loadMaterials() {
  const data = await api('/api/materials');
  return data.materials || [];
}
async function renderHome() {
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Student';
  const course = profile?.course_name || user?.user_metadata?.course || 'Course not set';
  const year = profile?.year_of_study ? 'Year '+profile.year_of_study : (user?.user_metadata?.year_of_study || 'Not set');
  const combo = profile?.combination_name || 'Not set';
  let materials = [];
  try { materials = await loadMaterials(); } catch (e) { showToast(e.message); }
  shell(titles.home, `
    <div class="hero-card"><div><p class="eyebrow light">YOUR ACADEMIC SPACE</p><h2>Welcome, ${esc(name)}!</h2><p>Access your units, revision materials and academic updates from one place.</p><button class="primary-btn" data-section="units">Explore my units →</button></div><div class="hero-icon">🎓</div></div>
    <div class="profile-strip"><div class="profile-avatar">${esc(name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</div><div class="profile-copy"><span>Student profile</span><strong>${esc(name)}</strong><small>${esc(course)} · ${esc(year)}</small></div><button class="outline-btn" data-section="profile">View profile</button></div>
    <div class="section-heading"><div><p class="eyebrow">OVERVIEW</p><h2>Your academic dashboard</h2></div></div>
    <div class="stats-grid"><article class="stat-card"><span class="stat-icon">📚</span><div><small>My Units</small><strong>Browse units</strong></div></article><article class="stat-card"><span class="stat-icon">📑</span><div><small>Combination</small><strong>${esc(combo)}</strong></div></article><article class="stat-card"><span class="stat-icon">🕓</span><div><small>Year of Study</small><strong>${esc(year)}</strong></div></article><article class="stat-card"><span class="stat-icon">🔐</span><div><small>Account</small><strong>Signed in</strong></div></article></div>
    <div class="two-column"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">LATEST</p><h3>Academic materials</h3></div><button class="text-btn" data-section="units">View all</button></div><div class="material-list">${materials.length?materials.slice(0,4).map(materialCard).join(''):'<p>No materials uploaded yet. Check back soon.</p>'}</div></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">UPDATES</p><h3>Notifications</h3></div></div><p>Your academic notices will appear here when notifications are connected.</p></section></div>`);
}
async function renderSection(section) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === section));
  if (section === 'home') return renderHome();
  if (section === 'profile') {
    const p=profile||{}, name=p.full_name||user?.user_metadata?.full_name||user?.email||'Student';
    shell(titles.profile,`<div class="section-heading"><p class="eyebrow">YOUR ACCOUNT</p><h2>My Profile</h2></div><section class="panel"><div class="profile-strip"><div class="profile-avatar">${esc(name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</div><div class="profile-copy"><strong>${esc(name)}</strong><small>Student profile</small></div></div><div class="stats-grid" style="margin-top:18px"><article class="stat-card"><div><small>User ID</small><strong style="font-size:11px;overflow-wrap:anywhere">${esc(p.id||user?.id||'Not available')}</strong></div></article><article class="stat-card"><div><small>Email</small><strong>${esc(p.email||user?.email||'—')}</strong></div></article><article class="stat-card"><div><small>Course</small><strong>${esc(p.course_name||user?.user_metadata?.course||'Not set')}</strong></div></article><article class="stat-card"><div><small>Year of study</small><strong>${esc(p.year_of_study?'Year '+p.year_of_study:(user?.user_metadata?.year_of_study||'Not set'))}</strong></div></article></div><p style="color:#718096;font-size:12px;margin-top:18px">Your unique Supabase user ID links this profile to your login account.</p></section>`);
  } else if (section === 'year') {
    shell(titles.year,`<div class="section-heading"><p class="eyebrow">ACADEMIC DETAILS</p><h2>Year of Study</h2></div><section class="panel"><h3>${esc(profile?.year_of_study?'Year '+profile.year_of_study:(user?.user_metadata?.year_of_study||'Year not set'))}</h3><p>Your current year is shown from your Supabase student profile. If it needs correcting, contact the administrator.</p></section>`);
  } else if (section === 'units') {
    let materials=[]; try { materials=await loadMaterials(); } catch(e) { showToast(e.message); }
    shell(titles.units,`<div class="section-heading"><p class="eyebrow">LEARNING RESOURCES</p><h2>Units & lecture materials</h2></div><section class="panel"><p>Latest lecture notes and revision resources published by the ScholarHub administrator.</p><div class="material-list">${materials.length?materials.map(materialCard).join(''):'<p>No materials are available yet.</p>'}</div></section>`);
  } else if (section === 'combination') {
    shell(titles.combination,`<div class="section-heading"><p class="eyebrow">YOUR PROGRAMME</p><h2>Course Combination</h2></div><section class="panel"><h3>${esc(profile?.combination_name||'No combination selected')}</h3><p>Course: ${esc(profile?.course_name||user?.user_metadata?.course||'Not set')}</p><p>Combination details will appear here once configured by the administrator.</p></section>`);
  } else if (section === 'packages') {
    shell(titles.packages,`<div class="section-heading"><p class="eyebrow">PREMIUM ACCESS</p><h2>Choose a package</h2></div><div class="stats-grid"><article class="panel"><h3>Daily</h3><p>24-hour access</p><strong>KSh 50</strong></article><article class="panel"><h3>Weekly</h3><p>7-day access</p><strong>KSh 250</strong></article><article class="panel"><h3>Monthly</h3><p>30-day access</p><strong>KSh 700</strong></article><article class="panel"><h3>Yearly</h3><p>365-day access</p><strong>KSh 5,000</strong></article></div><p style="margin-top:18px">Payment and automatic subscription activation are not enabled yet.</p>`);
  } else if (section === 'settings') {
    shell(titles.settings,`<div class="section-heading"><p class="eyebrow">PREFERENCES</p><h2>Settings</h2></div><section class="panel"><h3>Account</h3><p>${esc(user?.email||'')}</p><button class="outline-btn" id="themeToggle">Toggle day/night mode</button> <button class="outline-btn" id="settingsLogout">Log out</button><p style="font-size:12px;color:#718096">Appearance preference applies to this page only for now.</p></section>`);
    document.getElementById('themeToggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark-mode');});
    document.getElementById('settingsLogout')?.addEventListener('click',logout);
  }
}
async function logout() {
  try { await fetch('/api/auth/logout',{method:'POST'}); } catch {}
  sessionStorage.removeItem(sessionKey); sessionStorage.removeItem(userKey); window.location.replace('/login');
}
async function init() {
  try {
    const result=await api('/api/profile');
    profile=result.profile||{};
    if(result.user) { const merged={...(user||{}),...result.user}; sessionStorage.setItem(userKey,JSON.stringify(merged)); }
    const name=profile.full_name||user?.user_metadata?.full_name||user?.email||'Student';
    const avatar=document.getElementById('userAvatar'); if(avatar) avatar.textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
    const nameEl=document.querySelector('.profile-copy strong'); if(nameEl) nameEl.textContent=name;
  } catch(e) { showToast(e.message); }
  await renderHome();
}
appRoot.addEventListener('click', event => { const target = event.target.closest('[data-section]'); if (target && appRoot.contains(target)) renderSection(target.dataset.section); });
document.getElementById('notificationBtn')?.addEventListener('click',()=>showToast('Notifications will appear here when published by the administrator.'));
document.getElementById('menuBtn')?.addEventListener('click',()=>sidebar?.classList.toggle('open'));
document.getElementById('logoutBtn')?.addEventListener('click',logout);
init();
