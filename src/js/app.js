(function () {
  'use strict';

  /* ------ Theme Toggle ------ */
  var themeToggle = document.getElementById('pm-theme-toggle');
  if (themeToggle) {
    var current = localStorage.getItem('pm-theme') || 'light';
    document.documentElement.setAttribute('data-theme', current);
    themeToggle.textContent = current === 'dark' ? '\u2600' : '\u263E';

  themeToggle.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pm-theme', next);
    themeToggle.textContent = next === 'dark' ? '\u2600' : '\u263E';

    /* Toggle highlight.js theme */
    var hljsLight = document.getElementById('hljs-light');
    var hljsDark = document.getElementById('hljs-dark');
    if (hljsLight && hljsDark) {
      if (next === 'dark') {
        hljsLight.disabled = true;
        hljsDark.disabled = false;
      } else {
        hljsLight.disabled = false;
        hljsDark.disabled = true;
      }
    }
  });
  }

  /* ------ Scroll Animations ------ */
  var animItems = document.querySelectorAll('.pm-fade-in');
  if (animItems.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    animItems.forEach(function (el) { observer.observe(el); });
  }

  /* ------ Active Sidebar Item ------ */
  var sidebarItems = document.querySelectorAll('.pm-sidebar-item');
  if (sidebarItems.length) {
    var currentPath = window.location.pathname.replace(/\/$/, '');
    sidebarItems.forEach(function (item) {
      var href = item.getAttribute('href');
      if (href) {
        var hrefNormalized = href.replace(/\/$/, '');
        if (currentPath === hrefNormalized) {
          item.classList.add('active');
        }
      }
    });
  }

  /* ------ Tabbed Content ------ */
  var tabbedSets = document.querySelectorAll('.pm-tabbed-set');
  tabbedSets.forEach(function (set) {
    var labels = set.querySelectorAll('.pm-tabbed-label');
    var panels = set.querySelectorAll('.pm-tabbed-panel');

    labels.forEach(function (label, index) {
      label.addEventListener('click', function () {
        labels.forEach(function (l) { l.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        label.classList.add('active');
        if (panels[index]) panels[index].classList.add('active');
      });
    });
  });

  /* ------ Mobile Nav Toggle (if exists) ------ */
  var mobileToggle = document.getElementById('pm-mobile-nav-toggle');
  var navEl = document.querySelector('.pm-nav');
  if (mobileToggle && navEl) {
    mobileToggle.addEventListener('click', function () {
      navEl.style.display = navEl.style.display === 'flex' ? 'none' : 'flex';
    });
  }

})();
