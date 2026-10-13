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
const themeKey = 'scholarhub_theme';
const compactKey = 'scholarhub_compact';
function applyPreferences() {
  document.body.classList.toggle('dark-mode', localStorage.getItem(themeKey) === 'dark');
  document.body.classList.toggle('compact-mode', localStorage.getItem(compactKey) === 'yes');
}
applyPreferences();

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
  return '<article class="material"><div class="file-icon">📄</div><div class="material-info"><strong>'+esc(item.title)+'</strong><span>'+esc(item.description || 'Academic material')+' · '+new Date(item.created_at).toLocaleDateString()+'</span></div><span class="notification-count">'+(item.is_paid?'Premium':'Free')+'</span><button type="button" class="download-btn'+(item.is_paid?' premium':'')+'" data-open-material="'+esc(item.id)+'">'+(item.is_paid?'Open / Unlock':'Open file')+'</button></article>';
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
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">UPDATES</p><h3>Notifications</h3></div><button class="text-btn" data-show-notifications>View all</button></div><div class="notification-preview"><p>Loading notices…</p></div></section></div>`);
}
async function renderNotifications() {
  try {
    const result = await api('/api/notifications');
    const items = result.notifications || [];
    shell('Notifications', `<div class="section-heading"><p class="eyebrow">STUDENT UPDATES</p><h2>Notifications & announcements</h2></div><section class="panel"><div class="notification-list">${items.length ? items.map(n=>'<article class="notification"><span>📢</span><div><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><small>'+new Date(n.created_at).toLocaleString()+'</small></div></article>').join('') : '<p>No notifications yet. New announcements from your administrator will appear here.</p>'}</div></section>`);
  } catch (error) { showToast(error.message); }
}
async function loadHomeNotifications() {
  const preview = document.querySelector('.notification-preview');
  if (!preview) return;
  try {
    const result = await api('/api/notifications');
    const items = result.notifications || [];
    preview.innerHTML = items.length ? items.slice(0,3).map(n=>'<article class="notification"><span>📢</span><div><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><small>'+new Date(n.created_at).toLocaleDateString()+'</small></div></article>').join('') : '<p>No new notices yet.</p>';
    const badge = document.querySelector('#notificationBtn .badge');
    if (badge) { badge.textContent = items.length; badge.style.display = items.length ? 'grid' : 'none'; }
  } catch (error) { preview.innerHTML = '<p>Notifications could not be loaded.</p>'; }
}
const packageOptions = [
  {id:'daily',name:'Daily',duration:'24-hour access',price:'KSh 50',detail:'Great for a quick study session',icon:'☀️',className:'package-daily'},
  {id:'weekly',name:'Weekly',duration:'7-day access',price:'KSh 250',detail:'A full week of focused learning',icon:'🚀',className:'package-weekly'},
  {id:'monthly',name:'Monthly',duration:'30-day access',price:'KSh 700',detail:'Best for ongoing coursework',icon:'🎓',className:'package-monthly',popular:true},
  {id:'yearly',name:'Yearly',duration:'365-day access',price:'KSh 5,000',detail:'Your all-year academic companion',icon:'🏆',className:'package-yearly'}
];
function renderPackages() {
  shell(titles.packages,`<div class="section-heading"><p class="eyebrow">UNLOCK YOUR POTENTIAL</p><h2>Choose your learning pass</h2><p>Get access to premium academic materials with a package that suits your study plan.</p></div><div class="package-grid">${packageOptions.map(p=>'<button type="button" class="package-card '+p.className+'" data-package="'+p.id+'">'+(p.popular?'<span class="package-popular">MOST POPULAR</span>':'')+'<span class="package-icon">'+p.icon+'</span><strong class="package-name">'+p.name+'</strong><span class="package-duration">'+p.duration+'</span><strong class="package-price">'+p.price+'</strong><span class="package-detail">'+p.detail+'</span><span class="package-cta">Choose package →</span></button>').join('')}</div><p class="package-footnote">Select a package to continue to available payment methods. Payment processing is not connected yet.</p>`);
}
function renderPaymentMethods(packageId) {
  const p=packageOptions.find(item=>item.id===packageId);
  if(!p) return renderPackages();
  shell('Payment methods',`<div class="section-heading"><p class="eyebrow">SECURE CHECKOUT</p><h2>Choose a payment method</h2><p>You're selecting the <strong>${p.name}</strong> package.</p></div><section class="checkout-summary"><div><span>Selected package</span><strong>${p.name} · ${p.duration}</strong></div><strong class="checkout-price">${p.price}</strong></section><div class="payment-method-grid"><article class="payment-method"><span class="payment-icon">📱</span><div><strong>M-Pesa</strong><p>Pay securely using your M-Pesa mobile money account.</p></div><span class="payment-status">Coming soon</span></article><article class="payment-method"><span class="payment-icon">💳</span><div><strong>Bank card</strong><p>Visa or Mastercard payment option.</p></div><span class="payment-status">Coming soon</span></article></div><p class="payment-note">This is the payment-method selection step only. No money will be charged and your package will not activate until a payment provider is connected.</p><button type="button" class="outline-btn" data-back-packages>← Back to packages</button>`);
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
    const courseName = profile?.course_name || user?.user_metadata?.course || 'Not set';
    const normalizedCourse = String(courseName).toLowerCase().replace(/\\s+/g, ' ').trim();
    const isEducationScience = normalizedCourse.includes('bachelor of education science') || normalizedCourse === 'education science';
    const educationScienceCombinations = ['Math/Chem', 'Math/Physics', 'Math/Bio', 'Bio/Chem', 'Chem/Physics'];
    const combinationContent = isEducationScience
      ? `<p>Select from the available combinations for Bachelor of Education Science:</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px">${educationScienceCombinations.map((combination,index)=>'<article class="stat-card" style="display:flex;align-items:center;gap:12px"><span class="stat-icon">📘</span><div><small>Combination '+(index+1)+'</small><strong>'+combination+'</strong></div></article>').join('')}</div>`
      : '<p>Combination options will be shown here according to your enrolled course.</p>';
    shell(titles.combination,`<div class="section-heading"><p class="eyebrow">YOUR PROGRAMME</p><h2>Course Combination</h2></div><section class="panel"><h3>${esc(profile?.combination_name||'Available combinations')}</h3><p>Course: ${esc(courseName)}</p>${combinationContent}</section>`);
  } else if (section === 'packages') {
    renderPackages();
  } else if (section === 'settings') {
    shell(titles.settings,`<div class="section-heading"><p class="eyebrow">PREFERENCES</p><h2>Settings</h2></div><section class="panel settings-panel"><h3>Appearance</h3><div class="setting-row"><div><strong>Day / night mode</strong><p>Choose light or dark appearance.</p></div><button class="outline-btn" id="themeToggle" type="button">${document.body.classList.contains('dark-mode')?'Switch to day mode':'Switch to night mode'}</button></div><div class="setting-row"><div><strong>Compact layout</strong><p>Reduce spacing to fit more content on screen.</p></div><button class="outline-btn" id="compactToggle" type="button">${document.body.classList.contains('compact-mode')?'Turn off compact layout':'Turn on compact layout'}</button></div><div class="setting-row"><div><strong>Account</strong><p>${esc(user?.email||'')}</p></div><button class="outline-btn" id="settingsLogout" type="button">Log out</button></div><p style="font-size:12px;color:#718096">Your appearance preferences are saved on this device.</p></section>`);
    document.getElementById('themeToggle')?.addEventListener('click',()=>{const dark=!document.body.classList.contains('dark-mode');localStorage.setItem(themeKey,dark?'dark':'light');applyPreferences();renderSection('settings');});
    document.getElementById('compactToggle')?.addEventListener('click',()=>{const compact=!document.body.classList.contains('compact-mode');localStorage.setItem(compactKey,compact?'yes':'no');applyPreferences();renderSection('settings');});
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
  await loadHomeNotifications();
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-section]');
  if (target) { event.preventDefault(); renderSection(target.dataset.section); return; }
  if (event.target.closest('[data-show-notifications]')) { renderNotifications(); return; }
  const packageButton = event.target.closest('[data-package]');
  if (packageButton) { renderPaymentMethods(packageButton.dataset.package); return; }
  if (event.target.closest('[data-back-packages]')) renderPackages();
});
appRoot.addEventListener('click', async event => {
  const openButton = event.target.closest('[data-open-material]');
  if (!openButton) return;
  const newTab = window.open('about:blank', '_blank');
  if (newTab) newTab.document.write('<p style="font-family:system-ui;padding:2rem">Opening your academic material…</p>');
  openButton.disabled = true;
  const oldLabel = openButton.textContent;
  openButton.textContent = 'Opening…';
  try {
    const result = await api('/api/materials/' + encodeURIComponent(openButton.dataset.openMaterial) + '/open');
    if (newTab) newTab.location.href = result.url;
    else window.location.href = result.url;
  } catch (error) {
    if (newTab) newTab.close();
    showToast(error.message);
  } finally {
    openButton.disabled = false;
    openButton.textContent = oldLabel;
  }
});
document.getElementById('notificationBtn')?.addEventListener('click',()=>renderNotifications());
document.getElementById('menuBtn')?.addEventListener('click',()=>sidebar?.classList.toggle('open'));
document.getElementById('logoutBtn')?.addEventListener('click',logout);
init();
