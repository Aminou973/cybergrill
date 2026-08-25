/* ==========================================================================
   CyberGrill — the language switch for the table pages
   --------------------------------------------------------------------------
   The tables are written in English and stay that way. This walks the DOM
   after every change and swaps the short strings for whatever language is
   chosen, so no render function anywhere has to know a second word.

   The trick that makes it safe: we remember both what the app last wrote
   into a text node (SRC) and what we last wrote (OUT). If a node's current
   text is not what we wrote, the app has changed it, so that new text
   becomes the source. Without that, a live score or a ticking clock would be
   frozen at whatever it said the first time it was translated.

   The choice is shared with the dashboard through localStorage, so picking
   Arabic on the scoreboard and walking into a game keeps you in Arabic.
   ========================================================================== */
(function (root) {
  'use strict';

  var I18 = root.CyberI18N || { LANGS: [], dict: {}, patterns: [] };
  var GAME = root.CyberGameI18N || { dict: {}, patterns: [] };
  var KEY = 'cybergrill_lang';

  var LANGS = I18.LANGS && I18.LANGS.length ? I18.LANGS : [
    { id: 'en', flag: '🇬🇧', label: 'EN', name: 'English', rtl: false },
    { id: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français', rtl: false },
    { id: 'ar', flag: '🇩🇿', label: 'AR', name: 'العربية', rtl: true }
  ];

  var cur = 'en';
  try { var v = localStorage.getItem(KEY); if (v && LANGS.some(function (l) { return l.id === v; })) cur = v; } catch (e) { }

  var SRC = new WeakMap(), OUT = new WeakMap();
  var busy = false;

  function meta() { return LANGS.filter(function (l) { return l.id === cur; })[0] || LANGS[0]; }
  function rtl() { return !!meta().rtl; }

  /* look a string up: the game dictionary first, then the dashboard's, then
     the patterns for anything with a name or a number inside it */
  function lookup(k) {
    if (cur === 'en') return null;
    var g = (GAME.dict || {})[cur], d = (I18.dict || {})[cur];
    if (g && g[k] !== undefined) return g[k];
    if (d && d[k] !== undefined) return d[k];
    var pats = (GAME.patterns || []).concat(I18.patterns || []);
    for (var i = 0; i < pats.length; i++) {
      var fn = pats[i][1] && pats[i][1][cur];
      if (!fn) continue;
      var m = pats[i][0].exec(k);
      if (m) { try { var out = fn(m, g || d || {}); if (out) return out; } catch (e) { } }
    }
    return null;
  }

  function node(nd) {
    var now = nd.nodeValue;
    if (OUT.get(nd) !== now) SRC.set(nd, now);      /* the app wrote this */
    var raw = SRC.get(nd);
    if (raw === undefined) { OUT.set(nd, now); return; }
    var k = raw.trim(), want = raw;
    if (k && k.length <= 240 && cur !== 'en') {
      var v = lookup(k);
      if (v !== null) want = raw.replace(k, v);
    }
    if (nd.nodeValue !== want) nd.nodeValue = want;
    OUT.set(nd, want);
  }

  function tree(el) {
    if (!el || el.nodeType !== 1 || busy) return;
    busy = true;
    try {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), list = [];
      while (w.nextNode()) list.push(w.currentNode);
      list.forEach(node);
      var ph = el.querySelectorAll ? el.querySelectorAll('[placeholder]') : [];
      Array.prototype.forEach.call(ph, function (e) {
        if (e.dataset.phSrc === undefined) e.dataset.phSrc = e.getAttribute('placeholder') || '';
        var raw = e.dataset.phSrc;
        if (cur === 'en') { e.setAttribute('placeholder', raw); return; }
        var v = lookup(raw.trim());
        e.setAttribute('placeholder', v === null ? raw : v);
      });
    } finally { busy = false; }
  }

  var mo = new MutationObserver(function (muts) {
    if (busy) return;
    var roots = [];
    muts.forEach(function (m) {
      if (m.type === 'childList') {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType === 1) roots.push(n);
          else if (n.nodeType === 3 && n.parentNode && n.parentNode.nodeType === 1) roots.push(n.parentNode);
        });
      } else if (m.type === 'characterData' && cur !== 'en' && m.target && m.target.nodeType === 3) {
        busy = true; try { node(m.target); } finally { busy = false; }
      }
    });
    roots.forEach(tree);
  });

  function apply() {
    var r = rtl();
    document.documentElement.lang = cur;
    document.documentElement.dir = r ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', r);
    var chip = document.getElementById('langChip');
    if (chip) {
      busy = true;
      var i = chip.querySelector('i'), s = chip.querySelector('span');
      if (i) i.textContent = meta().flag;
      if (s) { s.textContent = meta().label; SRC.set(s.firstChild, s.textContent); OUT.set(s.firstChild, s.textContent); }
      busy = false;
    }
    tree(document.body);
  }

  function set(id) {
    if (!LANGS.some(function (l) { return l.id === id; })) return;
    cur = id;
    try { localStorage.setItem(KEY, id); } catch (e) { }
    apply();
  }

  function cycle() {
    var i = 0;
    LANGS.forEach(function (l, n) { if (l.id === cur) i = n; });
    set(LANGS[(i + 1) % LANGS.length].id);
    return meta();
  }

  function start() {
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    apply();
  }

  root.CGLang = {
    LANGS: LANGS,
    get: function () { return cur; },
    meta: meta,
    rtl: rtl,
    set: set,
    cycle: cycle,
    apply: apply,
    refresh: function () { tree(document.body); },
    /* for text the render code builds itself and wants translated up front */
    t: function (s) { var v = lookup(String(s).trim()); return v === null ? s : v; },
    start: start
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : this);
