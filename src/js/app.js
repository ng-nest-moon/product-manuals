(function () {
  'use strict';

  /* ------ Theme Toggle ------ */
  var themeToggle = document.getElementById('pm-theme-toggle');
  if (themeToggle) {
    var current = localStorage.getItem('pm-theme') || 'light';
    document.documentElement.setAttribute('data-theme', current);
    /* 图标由 CSS 依据 data-theme 显隐，无需 JS 换字形 */

  themeToggle.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    // 冻结过渡 -> 换主题 -> 下一帧恢复，避免全页明暗拖影
    document.documentElement.classList.add('pm-theme-switching');
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pm-theme', next);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('pm-theme-switching');
      });
    });

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
    if (!labels.length) return;

    labels.forEach(function (label, index) {
      label.addEventListener('click', function () {
        labels.forEach(function (l) { l.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        label.classList.add('active');
        if (panels[index]) panels[index].classList.add('active');
      });
    });
  });

  /* ------ Category Filter (homepage, curated B layout) ------ */
  var filterBar = document.getElementById('pm-filter-bar');
  if (filterBar) {
    var chips = filterBar.querySelectorAll('.pm-filter-chip');
    var sections = document.querySelectorAll('.pm-cat-section');
    var viewAllBtns = document.querySelectorAll('[data-view-all]');

    function applyFilter(f) {
      chips.forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === f);
      });
      sections.forEach(function (sec) {
        var cat = sec.getAttribute('data-category');
        sec.classList.toggle('is-hidden', !(f === 'all' || cat === f));
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        applyFilter(chip.getAttribute('data-filter'));
      });
    });

    viewAllBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var cat = btn.getAttribute('data-view-all');
        applyFilter(cat);
        var target = document.getElementById('cat-' + cat);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ------ Scroll-spy: highlight active TOC item ------ */
  var tocNav = document.getElementById('pm-toc-nav');
  if (tocNav) {
    var headings = document.querySelectorAll('.pm-manual-body h2, .pm-manual-body h3');
    if (headings.length) {
      var tocLinks = tocNav.querySelectorAll('.pm-toc-item');
      var tocMap = {};
      tocLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          tocMap[href.substring(1)] = link;
        }
      });

      var spyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            tocLinks.forEach(function (l) { l.classList.remove('active'); });
            if (id && tocMap[id]) tocMap[id].classList.add('active');
          }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });

      headings.forEach(function (h) { spyObserver.observe(h); });
    }
  }

  /* ------ Back to top button ------ */
  /* 按钮由 template 静态渲染（见 templates/base.html），此处只接管交互 */
  var backToTop = document.getElementById('pm-back-to-top');
  if (backToTop) {
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        backToTop.classList.toggle('visible', window.scrollY > 300);
      }, 50);
    }, { passive: true });

    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
