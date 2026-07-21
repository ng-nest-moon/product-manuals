(function () {
  'use strict';

  var searchOverlay = document.getElementById('pm-search-overlay');
  var searchBtn = document.getElementById('pm-search-btn');
  var searchInput = document.getElementById('pm-search-input');
  var searchResults = document.getElementById('pm-search-results');

  if (!searchOverlay || !searchBtn || !searchInput || !searchResults) return;

  var miniSearch = null;
  var searchData = null;
  var indexLoaded = false;
  var debounceTimer = null;
  var DEBOUNCE_MS = 200;

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function makeSnippet(text, query) {
    if (!text) return '';
    var raw = String(text);
    var q = String(query).toLowerCase();
    var idx = raw.toLowerCase().indexOf(q);
    if (idx === -1) {
      var t = raw.slice(0, 80);
      return t + (raw.length > 80 ? '...' : '');
    }
    var start = Math.max(0, idx - 30);
    var end = Math.min(raw.length, idx + q.length + 50);
    return (start > 0 ? '...' : '') + raw.slice(start, end) + (end < raw.length ? '...' : '');
  }

  /* Lazy-init MiniSearch when needed */
  function initMiniSearch() {
    if (miniSearch) return true;
    try {
      if (typeof MiniSearch !== 'undefined') {
        miniSearch = new MiniSearch({
          fields: ['title', 'content'],
          storeFields: ['title', 'url', 'excerpt', 'content'],
          searchOptions: {
            boost: { title: 2 },
            fuzzy: 0.2,
            prefix: true
          }
        });
        return true;
      }
    } catch (e) {
      console.warn('MiniSearch init error:', e);
    }
    return false;
  }

  function loadSearchIndex() {
    if (indexLoaded) return;
    if (!initMiniSearch()) return;

    var basePath = document.querySelector('meta[name="pm-base"]')?.getAttribute('content') || '.';
    var indexPath = basePath + '/search-index.json';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', indexPath, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          searchData = JSON.parse(xhr.responseText);
          miniSearch.addAll(searchData);
          indexLoaded = true;
        } catch (e) {
          console.error('Search index parse error:', e);
        }
      }
    };
    xhr.onerror = function () {
      console.error('Failed to load search index');
    };
    xhr.send();
  }

  function doSearch(query) {
    if (!query || query.length < 1 || !searchData) {
      searchResults.innerHTML = '<div class="pm-search-empty">请输入关键词...</div>';
      return;
    }

    var results = [];
    if (miniSearch) {
      try {
        results = miniSearch.search(query, { prefix: true, fuzzy: 0.2 });
      } catch (e) {
        console.warn('Search error, using fallback:', e);
      }
    }

    /* Fallback: simple keyword match */
    if (!results || results.length === 0) {
      var q = query.toLowerCase();
      searchData.forEach(function (item) {
        if (item.title.toLowerCase().indexOf(q) !== -1 ||
            item.content.toLowerCase().indexOf(q) !== -1 ||
            item.excerpt.toLowerCase().indexOf(q) !== -1) {
          results.push(item);
        }
      });
    }

    if (!results.length) {
      searchResults.innerHTML = '<div class="pm-search-empty">没有找到相关结果</div>';
      return;
    }

    var html = '';
    results.slice(0, 10).forEach(function (r) {
      var title = r.title || 'Untitled';
      var excerpt = '';
      if (r.content && query) {
        excerpt = makeSnippet(r.content, query);
      }
      if (!excerpt) excerpt = r.excerpt || '';
      var url = r.url || '#';
      html += '<a href="' + url + '" class="pm-search-result-item">' +
        '<div class="pm-search-result-title">' + escapeHtml(title) + '</div>' +
        (excerpt ? '<div class="pm-search-result-excerpt">' + escapeHtml(excerpt) + '</div>' : '') +
        '</a>';
    });
    searchResults.innerHTML = html;
  }

  function openSearch() {
    searchOverlay.classList.add('open');
    setTimeout(function () { searchInput.focus(); }, 100);
    searchInput.value = '';
    searchResults.innerHTML = '<div class="pm-search-empty">请输入关键词...</div>';
    loadSearchIndex();
  }

  function closeSearch() {
    searchOverlay.classList.remove('open');
  }

  searchBtn.addEventListener('click', openSearch);

  searchOverlay.addEventListener('click', function (e) {
    if (e.target === searchOverlay) closeSearch();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchOverlay.classList.contains('open')) {
      closeSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  /* Debounced input for better performance */
  searchInput.addEventListener('input', function () {
    var query = this.value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      doSearch(query);
    }, DEBOUNCE_MS);
  });

})();
