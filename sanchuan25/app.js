// ============================================
// SANCHUAN MISSION CONTROL — APP ENGINE v2.0
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // ---- LANGUAGE SYSTEM ----
  const savedLang = localStorage.getItem('sanchuan-lang') || 'zh';
  setLanguage(savedLang);

  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
    });
  });

  // ---- ACTIVE NAV LINK ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ---- SCROLL NAV SHADOW ----
  const nav = document.querySelector('.nav-bar');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // ---- SCROLL ANIMATIONS ----
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.card, .timeline-item, .person-card, .module-card, .case-study, .stat-block, .principle, .flow-step, .vision-milestone, .value-card, .quote-block, .vision-phase, .money-source, .team-member-highlight, .highlight-box').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    observer.observe(el);
  });

  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  // ---- SMOOTH SCROLL FOR ANCHOR LINKS ----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});

// ---- LANGUAGE SETTER ----
function setLanguage(lang) {
  document.body.setAttribute('data-lang', lang);
  localStorage.setItem('sanchuan-lang', lang);

  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Update font family
  if (lang === 'th') {
    document.body.style.fontFamily = "'Noto Sans Thai', 'Noto Sans SC', -apple-system, sans-serif";
  } else {
    document.body.style.fontFamily = "'Noto Sans SC', 'Noto Sans Thai', -apple-system, sans-serif";
  }
}

// ---- MOBILE NAV TOGGLE ----
function toggleMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    mobileNav.classList.toggle('open');
  }
}

// ---- INSIGHT TOGGLE (expandable sections) ----
function toggleInsight(el) {
  const content = el.nextElementSibling;
  if (content && content.classList.contains('insight-content')) {
    content.classList.toggle('open');
    // Toggle arrow indicator
    if (content.classList.contains('open')) {
      el.style.borderColor = 'rgba(232,184,48,0.5)';
      el.style.background = 'rgba(232,184,48,0.15)';
    } else {
      el.style.borderColor = '';
      el.style.background = '';
    }
  }
}

// ---- CLOSE MOBILE NAV ON LINK CLICK ----
document.addEventListener('click', (e) => {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav && mobileNav.classList.contains('open')) {
    if (e.target.tagName === 'A' || (!e.target.closest('.mobile-nav') && !e.target.closest('.mobile-menu-btn'))) {
      mobileNav.classList.remove('open');
    }
  }
});
