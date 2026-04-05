document.addEventListener('DOMContentLoaded', () => {

  // Highlight the current page link
  const currentPath = window.location.pathname.replace('/', '');
  document.querySelectorAll('.navbar-link, .dropdown-item-custom').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.style.textDecoration = 'underline';
      link.style.fontWeight = '900';
    }
  });

  // Mobile: tap to toggle dropdowns (since hover doesn't work on touch)
  document.querySelectorAll('.nav-item-custom').forEach(item => {
    const dropdown = item.querySelector('.dropdown-menu-custom');
    if (!dropdown) return;

    item.addEventListener('click', (e) => {
      const isOpen = dropdown.style.display === 'block';
      // Close all dropdowns first
      document.querySelectorAll('.dropdown-menu-custom').forEach(d => d.style.display = 'none');
      // Toggle this one
      dropdown.style.display = isOpen ? 'none' : 'block';
      e.stopPropagation();
    });
  });

  // Tap anywhere else to close all dropdowns
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu-custom').forEach(d => d.style.display = 'none');
  });

});