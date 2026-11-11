/**
 * Harshil Chauhan Portfolio - Privacy-Focused Modular Analytics Engine
 * Version: 1.0.0
 * 
 * Features:
 * - Compatible with GitHub Pages (100% client-side, zero mandatory backend)
 * - Automatic tracking for pageviews, session duration, and bounce rate
 * - Auto-tracking for Custom Interactions:
 *     * Resume/CV downloads
 *     * GitHub repository clicks (including NEXUSDATA_WAREHOUSE)
 *     * LinkedIn profile visits
 *     * Project card interactions
 *     * Contact/email link clicks
 *     * In-page section scroll depth
 * - Dual Engine:
 *     1. Local Privacy-Safe Telemetry Store (powers the private terminal dashboard)
 *     2. Optional Google Analytics 4 (GA4) integration via Measurement ID
 * - Privacy first: Zero PII (no IP storage, no names, no personal data), respects Do-Not-Track.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Configuration & Constants
  // --------------------------------------------------------------------------
  const CONFIG = {
    // Optional GA4 Measurement ID - user can set here or via the Dashboard UI
    gaMeasurementId: localStorage.getItem('harshil_ga_id') || '',
    storageKeyEvents: 'harshil_analytics_events',
    storageKeySessions: 'harshil_analytics_sessions',
    storageKeyVisitor: 'harshil_analytics_vid',
    maxStoredEvents: 200,
    heartbeatIntervalMs: 15000, // 15 seconds engagement ping
    debug: false
  };

  // Respect Do Not Track header
  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';
  if (dnt) {
    if (CONFIG.debug) console.log('[Analytics] Respecting Do Not Track preference.');
  }

  // --------------------------------------------------------------------------
  // Helpers: Identity, Device & Environment
  // --------------------------------------------------------------------------
  function generateId(prefix = 'id') {
    return prefix + '_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  function getVisitorId() {
    try {
      let vid = localStorage.getItem(CONFIG.storageKeyVisitor);
      let isNew = false;
      if (!vid) {
        vid = generateId('v');
        localStorage.setItem(CONFIG.storageKeyVisitor, vid);
        isNew = true;
      }
      return { vid, isNew };
    } catch (e) {
      return { vid: 'anonymous', isNew: true };
    }
  }

  function getSessionId() {
    try {
      let sid = sessionStorage.getItem('harshil_sid');
      if (!sid) {
        sid = generateId('s');
        sessionStorage.setItem('harshil_sid', sid);
        sessionStorage.setItem('harshil_sid_start', Date.now().toString());
      }
      return sid;
    } catch (e) {
      return 'session_' + Date.now();
    }
  }

  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    if (ua.includes('Edge') || ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  }

  function getOSName() {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    return 'Other';
  }

  function getReferrerSource() {
    const ref = document.referrer;
    if (!ref) return 'Direct';
    try {
      const url = new URL(ref);
      const host = url.hostname.toLowerCase();
      if (host.includes('github.com')) return 'GitHub';
      if (host.includes('linkedin.com')) return 'LinkedIn';
      if (host.includes('google.')) return 'Google Search';
      if (host.includes('bing.com')) return 'Bing';
      if (host.includes('twitter.com') || host.includes('t.co') || host.includes('x.com')) return 'Twitter / X';
      if (host === window.location.hostname) return 'Internal';
      return host.replace(/^www\./, '');
    } catch (e) {
      return 'Referral';
    }
  }

  // --------------------------------------------------------------------------
  // Local Event Buffer (Powers the Terminal Analytics Dashboard)
  // --------------------------------------------------------------------------
  function saveEventLocally(eventObj) {
    try {
      const raw = localStorage.getItem(CONFIG.storageKeyEvents);
      let list = raw ? JSON.parse(raw) : [];
      list.unshift(eventObj);
      if (list.length > CONFIG.maxStoredEvents) {
        list = list.slice(0, CONFIG.maxStoredEvents);
      }
      localStorage.setItem(CONFIG.storageKeyEvents, JSON.stringify(list));
      
      // Update session metrics
      updateSessionRecord(eventObj);
    } catch (e) {
      if (CONFIG.debug) console.warn('[Analytics] Local storage write error:', e);
    }
  }

  function updateSessionRecord(eventObj) {
    try {
      const sid = eventObj.session_id;
      const raw = localStorage.getItem(CONFIG.storageKeySessions);
      let sessions = raw ? JSON.parse(raw) : {};
      
      const now = Date.now();
      if (!sessions[sid]) {
        sessions[sid] = {
          session_id: sid,
          visitor_id: eventObj.visitor_id,
          start_time: now,
          last_active: now,
          pageviews: 0,
          events_count: 0,
          referrer: eventObj.referrer,
          device: eventObj.device,
          browser: eventObj.browser,
          os: eventObj.os,
          country: eventObj.country || 'Unknown',
          pages_visited: []
        };
      }

      const s = sessions[sid];
      s.last_active = now;
      s.events_count += 1;
      if (eventObj.event_name === 'page_view') {
        s.pageviews += 1;
        if (!s.pages_visited.includes(eventObj.page_path)) {
          s.pages_visited.push(eventObj.page_path);
        }
      }

      // Cleanup sessions older than 30 days
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      Object.keys(sessions).forEach(k => {
        if (sessions[k].start_time < thirtyDaysAgo) {
          delete sessions[k];
        }
      });

      localStorage.setItem(CONFIG.storageKeySessions, JSON.stringify(sessions));
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // Google Analytics 4 (GA4) Integration
  // --------------------------------------------------------------------------
  function initGA4(measurementId) {
    if (!measurementId || dnt) return;
    if (window._ga4_initialized) return;

    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false // We trigger manual page_view for precision
    });

    // Asynchronously insert gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);

    window._ga4_initialized = true;
    if (CONFIG.debug) console.log('[Analytics] GA4 initialized with ID:', measurementId);
  }

  function sendToGA4(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  // --------------------------------------------------------------------------
  // Core Dispatcher
  // --------------------------------------------------------------------------
  const visitorInfo = getVisitorId();
  const sessionId = getSessionId();

  function trackEvent(eventName, customParams = {}) {
    if (dnt) return;

    const baseEvent = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      epoch_ms: Date.now(),
      session_id: sessionId,
      visitor_id: visitorInfo.vid,
      is_new_visitor: visitorInfo.isNew,
      page_path: window.location.pathname.replace(/\/$/, '') || '/index.html',
      page_title: document.title,
      referrer: getReferrerSource(),
      device: getDeviceType(),
      browser: getBrowserName(),
      os: getOSName(),
      screen_res: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language || 'en-US',
      ...customParams
    };

    // 1. Save locally for the terminal dashboard
    saveEventLocally(baseEvent);

    // 2. Dispatch to GA4 if active
    sendToGA4(eventName, baseEvent);

    // 3. Dispatch DOM CustomEvent for custom dashboard listeners
    window.dispatchEvent(new CustomEvent('portfolio_analytics_event', { detail: baseEvent }));

    if (CONFIG.debug) {
      console.log(`[Analytics Event] ${eventName}:`, baseEvent);
    }
  }

  // --------------------------------------------------------------------------
  // Auto-Trackers: Page Views, Time Spent, Clicks, Downloads
  // --------------------------------------------------------------------------
  let sessionStartTime = Date.now();
  let totalActiveTimeSeconds = 0;
  let isPageActive = true;
  let lastHeartbeat = Date.now();

  function recordPageview() {
    trackEvent('page_view', {
      entry_page: !sessionStorage.getItem('harshil_entry_recorded')
    });
    sessionStorage.setItem('harshil_entry_recorded', 'true');
  }

  // Heartbeat to measure active engagement duration
  function sendHeartbeat() {
    if (!isPageActive) return;
    const now = Date.now();
    const elapsed = Math.round((now - lastHeartbeat) / 1000);
    lastHeartbeat = now;
    totalActiveTimeSeconds += elapsed;

    trackEvent('user_engagement', {
      engagement_time_sec: elapsed,
      total_time_sec: totalActiveTimeSeconds
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      isPageActive = false;
      sendHeartbeat();
    } else {
      isPageActive = true;
      lastHeartbeat = Date.now();
    }
  });

  window.addEventListener('beforeunload', function () {
    sendHeartbeat();
  });

  // Track link clicks, downloads, and social media
  function setupLinkInterceptors() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href') || '';
      const text = (link.textContent || '').trim().replace(/\s+/g, ' ');

      // 1. Resume / CV Download Click
      if (
        href.includes('Harshil_Chauhan_CV.pdf') ||
        link.hasAttribute('download') ||
        href.endsWith('.pdf') ||
        link.classList.contains('nav-cv') ||
        text.toLowerCase().includes('download cv')
      ) {
        trackEvent('resume_download', {
          target_url: href,
          file_name: 'Harshil_Chauhan_CV.pdf',
          source_text: text,
          category: 'credentials'
        });
        return;
      }

      // 2. GitHub Repository or Profile Clicks
      if (href.includes('github.com')) {
        let repo = 'profile';
        if (href.includes('NEXUSDATA_WAREHOUSE')) {
          repo = 'NEXUSDATA_WAREHOUSE';
        } else if (href.includes('uav-portfolio')) {
          repo = 'uav-portfolio';
        }
        trackEvent('github_click', {
          target_url: href,
          repository: repo,
          link_text: text
        });
        return;
      }

      // 3. LinkedIn Profile Click
      if (href.includes('linkedin.com')) {
        trackEvent('linkedin_click', {
          target_url: href,
          link_text: text
        });
        return;
      }

      // 4. Contact / Email Clicks
      if (href.startsWith('mailto:') || href === 'contact.html' || href.endsWith('/contact.html')) {
        trackEvent('contact_click', {
          target_url: href,
          channel: href.startsWith('mailto:') ? 'email' : 'contact_page',
          link_text: text
        });
        return;
      }

      // 5. Project Card Clicks
      if (link.classList.contains('project-card') || link.closest('.project-card')) {
        const card = link.classList.contains('project-card') ? link : link.closest('.project-card');
        const title = card.querySelector('.project-card-title')?.textContent?.trim() || text;
        trackEvent('project_card_click', {
          project_name: title,
          target_url: href
        });
        return;
      }

      // 6. Architecture Diagram & Video Demo clicks
      if (link.classList.contains('diagram-tag') || link.classList.contains('video-tag') || href.includes('youtu')) {
        trackEvent('media_showcase_click', {
          media_type: href.includes('youtu') ? 'youtube_video' : 'architecture_diagram',
          target_url: href,
          label: text
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // Scroll Depth & Section Visibility Tracking
  // --------------------------------------------------------------------------
  function setupScrollAndSectionTracking() {
    // Scroll depth milestones
    const trackedDepths = new Set();
    window.addEventListener('scroll', function () {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const currentProgress = Math.round((window.scrollY / scrollHeight) * 100);

      [25, 50, 75, 100].forEach(milestone => {
        if (currentProgress >= milestone && !trackedDepths.has(milestone)) {
          trackedDepths.add(milestone);
          trackEvent('scroll_depth', {
            percent: milestone
          });
        }
      });
    }, { passive: true });

    // Section visibility via IntersectionObserver
    if ('IntersectionObserver' in window) {
      const sections = document.querySelectorAll('section[id], .project-item[id]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            const title = entry.target.querySelector('h2, h3')?.textContent?.trim() || id;
            trackEvent('section_view', {
              section_id: id,
              section_title: title
            });
            observer.unobserve(entry.target); // Track once per section per pageview
          }
        });
      }, { threshold: 0.3 });

      sections.forEach(s => observer.observe(s));
    }
  }

  // --------------------------------------------------------------------------
  // Initialize
  // --------------------------------------------------------------------------
  function init() {
    // If GA4 ID is configured, load it
    const gaId = localStorage.getItem('harshil_ga_id') || CONFIG.gaMeasurementId;
    if (gaId) {
      initGA4(gaId);
    }

    recordPageview();
    setupLinkInterceptors();
    setupScrollAndSectionTracking();
    setInterval(sendHeartbeat, CONFIG.heartbeatIntervalMs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global interface for manual tracking and dashboard access
  window.PortfolioAnalytics = {
    track: trackEvent,
    getVisitorId: () => visitorInfo.vid,
    getSessionId: () => sessionId,
    setGAId: (id) => {
      localStorage.setItem('harshil_ga_id', id);
      initGA4(id);
    },
    getEvents: () => {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.storageKeyEvents) || '[]');
      } catch (e) {
        return [];
      }
    },
    getSessions: () => {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.storageKeySessions) || '{}');
      } catch (e) {
        return {};
      }
    },
    clearData: () => {
      localStorage.removeItem(CONFIG.storageKeyEvents);
      localStorage.removeItem(CONFIG.storageKeySessions);
      sessionStorage.removeItem('harshil_sid');
      sessionStorage.removeItem('harshil_entry_recorded');
    }
  };

})();

