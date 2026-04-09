document.addEventListener('DOMContentLoaded', () => {

  // FIX: was doing pathname.replace('/', '') which only strips the FIRST slash.
  // '/coach-dashboard' became 'coach-dashboard' but href attributes in navbar.html
  // are written without a leading slash (e.g. href="coach-dashboard"), so this
  // accidentally worked — but broke for any path with a sub-segment like '/player/1'.
  // Using a proper strip of the leading slash is more reliable.
  const currentPath = window.location.pathname.replace(/^\//, '');

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/index';
    });
  }

  document.querySelectorAll('.navbar-link, .dropdown-item-custom').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentPath) {
      link.style.textDecoration = 'underline';
      link.style.fontWeight     = '700';
    }
  });

});