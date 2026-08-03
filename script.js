document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.primary-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
});

document.addEventListener('DOMContentLoaded', function () {
  var navLinks = document.querySelectorAll('.section-nav a');
  var sections = document.querySelectorAll('section[id]');
  if (!navLinks.length || !sections.length || !('IntersectionObserver' in window)) return;

  var linkMap = {};
  navLinks.forEach(function (link) {
    linkMap[link.getAttribute('href').slice(1)] = link;
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = linkMap[entry.target.id];
      if (!link || !entry.isIntersecting) return;
      navLinks.forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach(function (section) { observer.observe(section); });
});
