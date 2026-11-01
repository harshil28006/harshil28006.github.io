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

  // --------------------------------------------------------------------------
  // Architecture Diagram Lightbox Modal
  // --------------------------------------------------------------------------
  const diagramModal = document.getElementById('diagram-modal');
  const diagramTrigger = document.querySelector('.diagram-image-container');
  const diagramCloseBtn = document.getElementById('diagram-modal-close');
  let lastActiveElement = null;

  function openDiagramModal() {
    if (!diagramModal) return;
    lastActiveElement = document.activeElement;
    diagramModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    if (diagramCloseBtn) {
      diagramCloseBtn.focus();
    }
  }

  function closeDiagramModal() {
    if (!diagramModal || diagramModal.hasAttribute('hidden')) return;
    diagramModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  if (diagramTrigger) {
    diagramTrigger.addEventListener('click', openDiagramModal);
    diagramTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDiagramModal();
      }
    });
  }

  if (diagramCloseBtn) {
    diagramCloseBtn.addEventListener('click', closeDiagramModal);
  }

  if (diagramModal) {
    diagramModal.addEventListener('click', (e) => {
      // Close when clicking backdrop
      if (e.target === diagramModal) {
        closeDiagramModal();
      }
    });
  }

  // Keyboard navigation for modal (Escape to close)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && diagramModal && !diagramModal.hasAttribute('hidden')) {
      closeDiagramModal();
    }
  });

  // Initialize on DOM ready
  initTheme();
})();



// --------------------------------------------------------------------------
// Multi-Page Navigation: Dropdown + Mobile Menu + Active Page Detection
// --------------------------------------------------------------------------

// Dropdown menus (CSS hover on desktop; JS click for mobile/keyboard)
var navDropdowns = document.querySelectorAll('.nav-dropdown');
navDropdowns.forEach(function(dd) {
  var toggle = dd.querySelector('.nav-dropdown-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = dd.classList.contains('open');
    navDropdowns.forEach(function(other) {
      other.classList.remove('open');
      var t = other.querySelector('.nav-dropdown-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      dd.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('click', function() {
  navDropdowns.forEach(function(dd) {
    dd.classList.remove('open');
    var toggle = dd.querySelector('.nav-dropdown-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
});

// Mobile menu toggle (hamburger ↔ close)
var mobileToggleBtn = document.querySelector('.nav-mobile-toggle');
var navbarNavEl = document.querySelector('.navbar-nav');
if (mobileToggleBtn && navbarNavEl) {
  mobileToggleBtn.addEventListener('click', function() {
    var isOpen = navbarNavEl.classList.contains('mobile-open');
    navbarNavEl.classList.toggle('mobile-open');
    mobileToggleBtn.textContent = isOpen ? '☰' : '✕';
    mobileToggleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    mobileToggleBtn.setAttribute('aria-label', isOpen ? 'Open navigation menu' : 'Close navigation menu');
  });
}

// Active page detection
(function() {
  var path = window.location.pathname;
  var segs = path.split('/').filter(function(s) { return s.length > 0; });
  var filename = segs.length > 0 ? segs[segs.length - 1] : 'index.html';
  if (!filename || !filename.includes('.')) filename = 'index.html';

  document.querySelectorAll('.nav-link, .dropdown-menu a').forEach(function(link) {
    var href = (link.getAttribute('href') || '');
    // Strip leading ../ for project pages
    var normalized = href.replace(/^(\.\.\/)+/, '');
    var hrefFile = normalized.split('/').pop();
    if (!hrefFile) return;
    if (hrefFile === filename) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
      var parentDd = link.closest('.nav-dropdown');
      if (parentDd) {
        var ddToggle = parentDd.querySelector('.nav-dropdown-toggle');
        if (ddToggle) ddToggle.classList.add('active');
      }
    }
  });
})();
