const storedSession = sessionStorage.getItem('scholarhub_session');
if (!storedSession) {
  window.location.replace('/login');
}

const storedUser = sessionStorage.getItem('scholarhub_user');
if (storedUser) {
  try {
    const user = JSON.parse(storedUser);
    const fullName = user.user_metadata?.full_name || user.email || 'Student';
    const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
    const avatar = document.getElementById('userAvatar');
    if (avatar) avatar.textContent = initials || 'SH';
    const profileName = document.querySelector('.profile-copy strong');
    if (profileName) profileName.textContent = fullName;
    const profileSubtitle = document.querySelector('.profile-copy small');
    const metadata = user.user_metadata || {};
    if (profileSubtitle && (metadata.course || metadata.year_of_study)) {
      profileSubtitle.textContent = [metadata.course, metadata.year_of_study].filter(Boolean).join(' • ');
    }
  } catch (_error) {
    sessionStorage.removeItem('scholarhub_user');
  }
}

const toast = document.getElementById('toast');
const sidebar = document.getElementById('sidebar');
const pageTitle = document.getElementById('pageTitle');

const titles = {
  home: 'Welcome back 👋', profile: 'My Profile', year: 'Year of Study',
  units: 'My Units', combination: 'Course Combination', packages: 'Packages', settings: 'Settings'
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function navigate(section) {
  pageTitle.textContent = titles[section] || titles.home;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === section));
  sidebar.classList.remove('open');
  if (section !== 'home') showToast(`${titles[section]} will be connected to Supabase in the next stage.`);
}

document.querySelectorAll('[data-section]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.section));
});

document.querySelectorAll('.download-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('premium')) navigate('packages');
    else showToast('Download will use protected Supabase Storage links.');
  });
});

document.getElementById('notificationBtn')?.addEventListener('click', () => showToast('You have 3 new notifications.'));
document.getElementById('menuBtn')?.addEventListener('click', () => sidebar.classList.toggle('open'));
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (_error) {}
  sessionStorage.removeItem('scholarhub_session');
  sessionStorage.removeItem('scholarhub_user');
  window.location.replace('/login');
});
