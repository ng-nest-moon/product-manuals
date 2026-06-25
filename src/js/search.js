(function () {
  'use strict';

  var searchOverlay = document.getElementById('pm-search-overlay');
  var searchBtn = document.getElementById('pm-search-btn');
  var searchInput = document.getElementById('pm-search-input');
  var searchResults = document.getElementById('pm-search-results');

  if (!searchOverlay || !searchBtn || !searchInput || !searchResults) return;

  var miniSearch = null;
  var searchData = null;

  /* Initialize MiniSearch */
  try {
    if (typeof MiniSearch !== 'undefined') {
      miniSearch = new MiniSearch({
        fields: ['title', 'content'],
        storeFields: ['title', 'url', 'excerpt'],
        searchOptions: {
          boost: { title: 2 },
          fuzzy: 0.2,
          prefix: true
        }
      });
    }
  } catch (e) {
    console.warn('MiniSearch init error:', e);
  }

  function loadSearchIndex() {
    if (!miniSearch) return;

    var basePath = document.querySelector('meta[name="pm-base"]')?.getAttribute('content') || '.';
    var indexPath = basePath + '/search-index.json';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', indexPath, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          searchData = JSON.parse(xhr.responseText);
          miniSearch.addAll(searchData);
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
      searchResults.innerHTML = '<div class="pm-search-empty">\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22...</div>';
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

    /* Fallback: simple keyword match if minisearch fails */
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
      searchResults.innerHTML = '<div class="pm-search-empty">\u6CA1\u6709\u627E\u5230\u76F8\u5173\u7ED3\u679C</div>';
      return;
    }

    var html = '';
    results.slice(0, 10).forEach(function (r) {
      var title = r.title || 'Untitled';
      var excerpt = r.excerpt || '';
      var url = r.url || '#';
      html += '<a href="' + url + '" class="pm-search-result-item">' +
        '<div class="pm-search-result-title">' + title + '</div>' +
        (excerpt ? '<div class="pm-search-result-excerpt">' + excerpt + '</div>' : '') +
        '</a>';
    });
    searchResults.innerHTML = html;
  }

  function openSearch() {
    searchOverlay.classList.add('open');
    setTimeout(function () { searchInput.focus(); }, 100);
    searchInput.value = '';
    searchResults.innerHTML = '<div class="pm-search-empty">\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22...</div>';
    if (!searchData) loadSearchIndex();
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

  searchInput.addEventListener('input', function () {
    doSearch(this.value);
  });

})();
