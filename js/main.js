/**
 * Harshil Chauhan - Personal Portfolio JavaScript
 * Lightweight, high-performance logic: Theme toggle, keyboard shortcuts, smooth interactions.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Dark / Light Theme Management
  // --------------------------------------------------------------------------
  const html = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle');

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      html.dataset.theme = savedTheme;
    } else {
      // Default to dark theme for modern terminal aesthetic
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.dataset.theme = prefersDark ? 'dark' : 'dark';
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const currentTheme = html.dataset.theme === 'dark' ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = newTheme;
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    updateThemeIcon();
  }

  function updateThemeIcon() {
    if (!themeToggleBtn) return;
    const isDark = html.dataset.theme === 'dark';
    themeToggleBtn.textContent = isDark ? '◐' : '◑';
    themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Keyboard shortcut: Press 't' or 'T' to toggle theme
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (['INPUT', 'TEXTAREA'].includes(tag)) return;

    if (e.key === 't' || e.key === 'T') {
      toggleTheme();
    }
  });

  // Smooth scroll active nav link indicator
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  function onScroll() {
    const scrollPos = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.style.color = 'var(--text-primary)';
          } else {
            link.style.color = '';
          }
        });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initialize on DOM ready
  initTheme();
})();
