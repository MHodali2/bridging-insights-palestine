document.addEventListener('DOMContentLoaded', function () {
  var flipCards = document.querySelectorAll('.flip-card');
  flipCards.forEach(function (card) {
    function toggle() {
      var flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-expanded', flipped ? 'true' : 'false');
    }
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggle();
      }
    });
  });
});

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
  var navRail = document.querySelector('.section-nav');
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
      if (navRail) {
        navRail.classList.toggle('on-dark', entry.target.dataset.navTheme === 'dark');
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach(function (section) { observer.observe(section); });
});

(function () {
  var svg = document.getElementById('ringAnim');
  var dot = document.getElementById('ringAnimDot');
  if (!svg || !dot) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var nodes = Array.prototype.slice.call(svg.querySelectorAll('.ring-anim-node'));

  var CX = 450, CY = 450, R = 300, NODE_R = 44;
  var DURATION = 10; // seconds per loop
  var PAUSE_CENTERS = [0.05, 0.30, 0.55, 0.80];
  var FLAT = 0.05, RAMP = 0.05;
  var GLOW_INTENSITY = 1.6;

  // Each pillar gets its own hue from the site palette (the same four used
  // by the value-pill accents): idle "accent" -> peak "hot" as the dot
  // arrives.
  var NODE_COLORS = [
    { accent: [0xD6, 0xA4, 0x28], hot: [0xF0, 0xC4, 0x55] }, // --brass -> --brass-2
    { accent: [0x7A, 0x1E, 0x58], hot: [0x9C, 0x2E, 0x74] }, // --blueprint -> --blueprint-2
    { accent: [0x9C, 0x2E, 0x74], hot: [0xC2, 0x4B, 0x85] }, // --blueprint-2 -> lighter tint
    { accent: [0x86, 0x68, 0x0D], hot: [0xD6, 0xA4, 0x28] }  // --brass-ink -> --brass
  ];

  // fraction-of-loop schedule: dwell at each node, then travel to the next
  var SEGMENTS = [
    { a: -90, b: -90, s: 0.00, e: 0.10, from: 0, to: 0 },
    { a: -90, b: 0, s: 0.10, e: 0.25, from: 0, to: 1 },
    { a: 0, b: 0, s: 0.25, e: 0.35, from: 1, to: 1 },
    { a: 0, b: 90, s: 0.35, e: 0.50, from: 1, to: 2 },
    { a: 90, b: 90, s: 0.50, e: 0.60, from: 2, to: 2 },
    { a: 90, b: 180, s: 0.60, e: 0.75, from: 2, to: 3 },
    { a: 180, b: 180, s: 0.75, e: 0.85, from: 3, to: 3 },
    { a: 180, b: 270, s: 0.85, e: 1.00, from: 3, to: 0 }
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function circDist(a, b) { var d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); }
  function smoothstep(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function mixChannel(a, b, t) { return Math.round(a + (b - a) * t); }

  function activation(progress, center) {
    var d = circDist(progress, center);
    if (d <= FLAT) return 1;
    if (d <= FLAT + RAMP) return smoothstep(1 - (d - FLAT) / RAMP);
    return 0;
  }

  function segmentAt(progress) {
    for (var i = 0; i < SEGMENTS.length; i++) {
      var seg = SEGMENTS[i];
      if (progress >= seg.s && progress <= seg.e) {
        var raw = seg.e > seg.s ? (progress - seg.s) / (seg.e - seg.s) : 0;
        return { seg: seg, t: easeInOutQuad(raw) };
      }
    }
    return { seg: SEGMENTS[0], t: 0 };
  }

  var nodeEls = nodes.map(function (node) {
    return {
      cx: parseFloat(node.getAttribute('data-cx')),
      cy: parseFloat(node.getAttribute('data-cy')),
      scaleEl: node.querySelector('.ring-anim-scale'),
      glowEl: node.querySelector('.ring-anim-glow'),
      circleEl: node.querySelector('.ring-anim-circle'),
      idEl: node.querySelector('.ring-anim-id')
    };
  });

  // Click/keyboard interactivity: selecting a node highlights the matching
  // item in the audience-list table to its left.
  var audienceItems = Array.prototype.slice.call(document.querySelectorAll('#audienceList [data-node]'));
  var selectedIdx = null;

  function setSelected(idx) {
    selectedIdx = selectedIdx === idx ? null : idx;
    nodes.forEach(function (node, i) {
      var isSelected = i === selectedIdx;
      node.classList.toggle('is-selected', isSelected);
      node.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
    audienceItems.forEach(function (item) {
      var i = parseInt(item.getAttribute('data-node'), 10);
      var isSelected = i === selectedIdx;
      item.classList.toggle('is-active', isSelected);
      item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  nodes.forEach(function (node, i) {
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-pressed', 'false');
    node.addEventListener('click', function () { setSelected(i); });
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setSelected(i);
      }
    });
  });

  audienceItems.forEach(function (item) {
    var i = parseInt(item.getAttribute('data-node'), 10);
    item.addEventListener('click', function () { setSelected(i); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setSelected(i);
      }
    });
  });

  var start = null;

  function frame(ts) {
    if (start === null) start = ts;
    var progress = ((ts - start) / 1000 % DURATION) / DURATION;

    var segInfo = segmentAt(progress);
    var angle = lerp(segInfo.seg.a, segInfo.seg.b, segInfo.t);
    var rad = (angle * Math.PI) / 180;
    var dotX = CX + R * Math.cos(rad);
    var dotY = CY + R * Math.sin(rad);

    var acts = PAUSE_CENTERS.map(function (c) { return activation(progress, c); });
    var coveringIdx = -1, coveringAct = 0.5;
    acts.forEach(function (act, i) { if (act > coveringAct) { coveringAct = act; coveringIdx = i; } });

    if (coveringIdx === -1) {
      var fromHot = NODE_COLORS[segInfo.seg.from].hot;
      var toHot = NODE_COLORS[segInfo.seg.to].hot;
      dot.setAttribute('cx', dotX);
      dot.setAttribute('cy', dotY);
      dot.style.opacity = '1';
      dot.style.fill = 'rgb(' +
        mixChannel(fromHot[0], toHot[0], segInfo.t) + ',' +
        mixChannel(fromHot[1], toHot[1], segInfo.t) + ',' +
        mixChannel(fromHot[2], toHot[2], segInfo.t) + ')';
    } else {
      dot.style.opacity = '0';
    }

    nodeEls.forEach(function (n, i) {
      var act = acts[i];
      var scale = 1 + 0.18 * act;
      n.scaleEl.setAttribute('transform', 'translate(' + n.cx + ' ' + n.cy + ') scale(' + scale + ')');

      n.glowEl.setAttribute('r', NODE_R + 6 + act * 10);
      n.glowEl.style.opacity = String(0.30 * act * GLOW_INTENSITY);

      var colors = NODE_COLORS[i];
      var strokeColor = 'rgb(' +
        mixChannel(colors.accent[0], colors.hot[0], act) + ',' +
        mixChannel(colors.accent[1], colors.hot[1], act) + ',' +
        mixChannel(colors.accent[2], colors.hot[2], act) + ')';
      n.circleEl.style.stroke = strokeColor;
      n.idEl.style.fill = strokeColor;
      n.glowEl.style.stroke = 'rgb(' + colors.hot[0] + ',' + colors.hot[1] + ',' + colors.hot[2] + ')';
    });

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

// Reveal content on scroll: any direct child of a .wrap block fades/slides
// in, and children of known grid/list containers stagger individually.
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var groupSelector = '.grid-3, .lens-grid, .audience-list, .action-grid, ' +
    '.team-grid, .stage-timeline, .steps-list, .values-row, .footer-grid, ' +
    '.spec-list, .contributors';

  var targets = [];
  document.querySelectorAll('.wrap').forEach(function (wrap) {
    Array.prototype.forEach.call(wrap.children, function (child) {
      if (child.matches(groupSelector)) {
        Array.prototype.forEach.call(child.children, function (grandchild) {
          targets.push(grandchild);
        });
      } else {
        targets.push(child);
      }
    });
  });

  targets.forEach(function (el) {
    var siblings = Array.prototype.slice.call(el.parentElement.children);
    var idx = Math.min(siblings.indexOf(el), 5);
    el.classList.add('reveal');
    el.style.transitionDelay = (idx * 70) + 'ms';
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function (el) { observer.observe(el); });
})();
