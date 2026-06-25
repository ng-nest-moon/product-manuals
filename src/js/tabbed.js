(function () {
  'use strict';

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
})();
