/**
 * @file navbar.js
 * @description Handles shared navigation bar behaviour across all pages.
 *
 * Responsibilities
 * ----------------
 * - Highlights the nav link that corresponds to the current page by
 *   comparing each link's href against the URL pathname.
 * - Wires up the logout button to POST to /api/auth/logout and redirect
 *   the user to the landing page.
 *
 * Active-link detection
 * ---------------------
 * The leading slash is stripped from `window.location.pathname` before
 * comparison (e.g. '/coach-dashboard' → 'coach-dashboard'), matching the
 * format used in navbar href attributes.
 *
 * API endpoint used
 * -----------------
 *   POST /api/auth/logout   Destroys the server-side session.
 */

document.addEventListener('DOMContentLoaded', () => {

  // Strip the leading '/' from the pathname so it matches the href values
  // used in the navbar markup (e.g. href="coach-dashboard").
  const currentPath = window.location.pathname.replace(/^\//, '');

  // ── LOGOUT ──────────────────────────────────────────────────────────────

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/index';
    });
  }

  // ── ACTIVE LINK HIGHLIGHT ────────────────────────────────────────────────

  // Underline and bold the navbar link whose href matches the current page.
  document.querySelectorAll('.navbar-link, .dropdown-item-custom').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentPath) {
      link.style.textDecoration = 'underline';
      link.style.fontWeight     = '700';
    }
  });

});