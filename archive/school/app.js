/* ============================================
   SANCHUAN Academy — Shared JavaScript
   Countdown, Scroll Animations, FAQ, Floating CTA
   ============================================ */

(function () {
  'use strict';

  // --- Countdown Timer ---
  function updateCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var deadline = new Date('2026-03-07T23:59:59+07:00');
    var now = new Date();
    var diff = deadline - now;
    if (diff <= 0) {
      el.textContent = 'หมดเขตแล้ว!';
      return;
    }
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    el.textContent = '\u0E2D\u0E35\u0E01 ' + days + ' \u0E27\u0E31\u0E19 ' + hours + ' \u0E0A\u0E21. ' + mins + ' \u0E19\u0E32\u0E17\u0E35';
  }
  updateCountdown();
  setInterval(updateCountdown, 30000);

  // --- Scroll Fade-Up Animation ---
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.fade-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // --- FAQ Accordion ---
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = this.closest('.faq-item');
      if (!item) return;
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) openItem.classList.remove('open');
      });
      item.classList.toggle('open');
    });
  });

  // --- Floating CTA: Hide when near register/final-cta section ---
  var floatingCta = document.querySelector('.floating-cta');
  if (floatingCta) {
    var target = document.getElementById('register') || document.querySelector('.final-cta');
    if (target && 'IntersectionObserver' in window) {
      var regObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          floatingCta.style.transform = entry.isIntersecting ? 'translateY(100%)' : 'translateY(0)';
          floatingCta.style.transition = 'transform 0.3s ease';
        });
      }, { threshold: 0.3 });
      regObserver.observe(target);
    }

    var hero = document.querySelector('.hero');
    if (hero && 'IntersectionObserver' in window) {
      floatingCta.style.opacity = '0';
      floatingCta.style.transform = 'translateY(100%)';
      var heroObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            floatingCta.style.opacity = '1';
            floatingCta.style.transform = 'translateY(0)';
            floatingCta.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          } else {
            floatingCta.style.opacity = '0';
            floatingCta.style.transform = 'translateY(100%)';
          }
        });
      }, { threshold: 0.1 });
      heroObserver.observe(hero);
    }
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var navHeight = 60;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // --- Nav background on scroll ---
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        nav.style.background = 'rgba(10, 10, 10, 0.98)';
        nav.style.borderBottomColor = 'rgba(212, 168, 83, 0.25)';
      } else {
        nav.style.background = 'rgba(10, 10, 10, 0.92)';
        nav.style.borderBottomColor = 'rgba(212, 168, 83, 0.15)';
      }
    }, { passive: true });
  }

})();
