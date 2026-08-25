/* ==========================================================================
   CyberGrill — shareable night card renderer
   --------------------------------------------------------------------------
   Pure Canvas 2D. No dependencies, no network. Used in two places:
     1. the dashboard  → export button, draws onto an offscreen canvas
     2. scripts/render-card.mjs → headless Chromium calls the same function
   so the PNG in the repo is byte-for-byte what you get from the browser.
   ========================================================================== */
(function (root) {
  'use strict';

  var PALETTE = ['#22e6ff', '#ff2fb9', '#9cff2e', '#a55bff', '#ff8a2b',
                 '#ffd93c', '#3ce0a0', '#ff5b6e', '#5b8bff', '#ff9ad5'];

  var GAME_ICON = { uno: '🃏', domino: '🀄', fc25: '⚽', efoot: '🥅', topspin: '🎾' };
  var GAME_NAME = { uno: 'UNO', domino: 'DOMINOS', fc25: 'FC 25', efoot: 'EFOOTBALL', topspin: 'TOPSPIN 2K' };

  /* ---------- deterministic pseudo-random, so a night always renders the same ---------- */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function pick(list, seed) { return list[hash(seed) % list.length]; }

  /* ---------- the fun part: a sentence per player ---------- */
  var SENT = {
    en: {
      champ: ['👑🔥 RULED THE TABLE. {pts} points, {wins} wins — somebody check his sleeves 🃏🕵️',
              '👑✨ UNTOUCHABLE TONIGHT. {wins} wins and a permanent seat on the throne 🪑🏆',
              '👑💥 THE BOSS. Walked in, took {pts} points, walked out 😎🎤'],
      second: ['🥈😤 SO CLOSE IT HURTS. {pts} points and a lifetime of "what if" 💔🔁',
               '🥈🔥 Chased all night, ran out of road. Rematch loading… ⏳⚔️',
               '🥈😮‍💨 Silver medal, gold-medal excuses. We heard every single one 🗣️😂'],
      third: ['🥉😅 Made the podium, no idea how. Take it and run 🏃💨',
              '🥉🎯 Quietly efficient. {wins} wins without saying a word 🤫👏',
              '🥉🍀 Third place and zero regrets. Well, maybe one 👀'],
      spoon: ['🥄💀 THE WOODEN SPOON. {played} games, zero wins, infinite optimism 🫡🕯️',
              '🥄😭 Played {played} times and never once tasted victory. A true survivor 🐢💙',
              '🥄🤡 Zero wins but the loudest celebrations. Never change 📣❤️'],
      last: ['🪑🔻 Last on the board, first to the snacks 🍕😌',
             '🔻😬 A rough night at the office. The comeback starts next week 📈🙏',
             '🔻🎲 The cards simply refused. Nothing personal 🃏🚫'],
      sharp: ['⚡🎯 {wins} wins from {played} — deadly when it mattered 🗡️',
              '⚡🔥 Best win rate in the mid-table. Dangerous man 😤',
              '⚡🧊 Ice cold in the big hands. {wins} wins banked 🏦'],
      mid: ['🎮😐 {pts} points of pure "he was there". Solid, forgettable, respected 🫱',
            '🎮🌀 Somewhere between brilliant and disastrous. Mostly the second one 😂',
            '🎮📊 {played} games, {wins} wins, one very long night ☕🌙']
    },
    fr: {
      champ: ['👑🔥 A RÉGNÉ SUR LA TABLE. {pts} points, {wins} victoires — vérifiez ses manches 🃏🕵️',
              '👑✨ INTOUCHABLE CE SOIR. {wins} victoires et une place réservée sur le trône 🪑🏆',
              '👑💥 LE PATRON. Il est entré, il a pris {pts} points, il est reparti 😎🎤'],
      second: ['🥈😤 SI PRÈS QUE ÇA FAIT MAL. {pts} points et une vie de « et si » 💔🔁',
               '🥈🔥 A couru toute la nuit, la route s’est arrêtée avant. Revanche en approche… ⏳⚔️',
               '🥈😮‍💨 Médaille d’argent, excuses en or. On les a toutes entendues 🗣️😂'],
      third: ['🥉😅 Sur le podium, sans savoir comment. On prend et on s’en va 🏃💨',
              '🥉🎯 Efficace en silence. {wins} victoires sans dire un mot 🤫👏',
              '🥉🍀 Troisième et aucun regret. Enfin, peut-être un 👀'],
      spoon: ['🥄💀 LA CUILLÈRE DE BOIS. {played} parties, zéro victoire, optimisme infini 🫡🕯️',
              '🥄😭 {played} parties et jamais le moindre goût de la victoire. Un vrai survivant 🐢💙',
              '🥄🤡 Zéro victoire mais les célébrations les plus bruyantes. Ne change rien 📣❤️'],
      last: ['🪑🔻 Dernier au classement, premier sur les chips 🍕😌',
             '🔻😬 Soirée compliquée au bureau. La remontée commence la semaine prochaine 📈🙏',
             '🔻🎲 Les cartes ont refusé, tout simplement. Rien de personnel 🃏🚫'],
      sharp: ['⚡🎯 {wins} victoires en {played} — redoutable au bon moment 🗡️',
              '⚡🔥 Meilleur ratio du milieu de tableau. Un client 😤',
              '⚡🧊 Glacial dans les grosses mains. {wins} victoires en poche 🏦'],
      mid: ['🎮😐 {pts} points de pur « il était là ». Solide, oubliable, respecté 🫱',
            '🎮🌀 Quelque part entre brillant et catastrophique. Surtout le second 😂',
            '🎮📊 {played} parties, {wins} victoires, une très longue nuit ☕🌙']
    },
    ar: {
      champ: ['👑🔥 سيطر على الطاولة. {pts} نقطة و{wins} انتصارات — فتّشوا أكمامه 🃏🕵️',
              '👑✨ لا يُمسّ الليلة. {wins} انتصارات ومقعد دائم على العرش 🪑🏆',
              '👑💥 الزعيم. دخل، أخذ {pts} نقطة، وخرج 😎🎤'],
      second: ['🥈😤 قريب لدرجة الألم. {pts} نقطة وعمرٌ من «ماذا لو» 💔🔁',
               '🥈🔥 طارد طوال الليل ونفد الطريق. الثأر قادم… ⏳⚔️',
               '🥈😮‍💨 فضية في الميدالية، ذهبية في الأعذار. سمعناها كلها 🗣️😂'],
      third: ['🥉😅 وصل المنصة ولا يدري كيف. خذها واهرب 🏃💨',
              '🥉🎯 فعّال في صمت. {wins} انتصارات دون كلمة واحدة 🤫👏',
              '🥉🍀 المركز الثالث وبلا ندم. ربما ندم واحد 👀'],
      spoon: ['🥄💀 ملعقة الخشب. {played} مباريات، صفر انتصارات، وتفاؤل لا ينتهي 🫡🕯️',
              '🥄😭 لعب {played} مرات ولم يذق الفوز ولا مرة. ناجٍ حقيقي 🐢💙',
              '🥄🤡 صفر انتصارات لكن أعلى احتفالات. لا تتغيّر أبداً 📣❤️'],
      last: ['🪑🔻 الأخير في الجدول، الأول على المقبّلات 🍕😌',
             '🔻😬 ليلة قاسية في المكتب. العودة تبدأ الأسبوع القادم 📈🙏',
             '🔻🎲 الأوراق رفضت ببساطة. لا شيء شخصي 🃏🚫'],
      sharp: ['⚡🎯 {wins} انتصارات من {played} — قاتل في اللحظة المناسبة 🗡️',
              '⚡🔥 أفضل نسبة فوز في وسط الجدول. رجل خطير 😤',
              '⚡🧊 بارد كالثلج في الجولات الكبيرة. {wins} انتصارات في الجيب 🏦'],
      mid: ['🎮😐 {pts} نقطة من نوع «كان موجوداً». ثابت، منسيّ، محترم 🫱',
            '🎮🌀 بين الرائع والكارثي. غالباً الثاني 😂',
            '🎮📊 {played} مباريات و{wins} انتصارات وليلة طويلة جداً ☕🌙']
    }
  };
  function category(p, total) {
    if (p.rank === 1) return 'champ';
    if (p.rank === 2) return 'second';
    if (p.rank === 3) return 'third';
    if (p.wins === 0) return 'spoon';
    if (p.rank === total) return 'last';
    if (p.played && Math.round(p.wins / p.played * 100) >= 30) return 'sharp';
    return 'mid';
  }
  function sentenceFor(p, ctx) {
    var lang = (ctx && ctx.lang) || 'en';
    var bank = SENT[lang] || SENT.en;
    var cat = category(p, (ctx && ctx.total) || 1);
    var list = bank[cat] || SENT.en[cat];
    var seed = ((ctx && ctx.date) || '') + '|' + p.name + '|' + p.pts;
    return pick(list, seed)
      .replace(/\{pts\}/g, p.pts)
      .replace(/\{wins\}/g, p.wins)
      .replace(/\{played\}/g, p.played);
  }

  /* ---------- labels ---------- */
  var LBL = {
    en: { results: 'T O N I G H T ’ S   R E S U L T S', champion: 'CHAMPION OF THE NIGHT', pts: 'PTS',
          played: 'PLAYED', win: 'WIN', wins: 'WINS', rate: 'WIN RATE', matches: 'MATCHES', players: 'PLAYERS',
          mostWins: 'MOST WINS', ironman: 'IRONMAN', spoon: 'WOODEN SPOON', games: 'GAMES', foot: 'cybergrill · game night arcade' },
    fr: { results: 'R É S U L T A T S   D E   L A   S O I R É E', champion: 'CHAMPION DE LA SOIRÉE', pts: 'PTS',
          played: 'JOUÉES', win: 'VICTOIRE', wins: 'VICTOIRES', rate: 'DE VICTOIRES', matches: 'PARTIES', players: 'JOUEURS',
          mostWins: 'PLUS DE VICTOIRES', ironman: 'INFATIGABLE', spoon: 'CUILLÈRE DE BOIS', games: 'PARTIES', foot: 'cybergrill · soirée jeux' },
    ar: { results: 'نتائج الليلة', champion: 'بطل الليلة', pts: 'نقطة',
          played: 'مباراة', win: 'فوز', wins: 'فوز', rate: 'نسبة الفوز', matches: 'مباراة', players: 'لاعبين',
          mostWins: 'الأكثر فوزاً', ironman: 'الأكثر لعباً', spoon: 'ملعقة الخشب', games: 'مباراة', foot: 'سايبرغريل · ليلة الألعاب' }
  };

  /* ---------- awards ---------- */
  function awardsFor(rows, matches, lang) {
    var T = LBL[lang] || LBL.en;
    var out = [];
    var byWins = rows.slice().sort(function (a, b) { return b.wins - a.wins; });
    var byPlayed = rows.slice().sort(function (a, b) { return b.played - a.played; });
    if (byWins[0] && byWins[0].wins > 0) out.push(['🏆', T.mostWins, byWins[0].name + ' · ' + byWins[0].wins]);
    if (byPlayed[0]) out.push(['🐎', T.ironman, byPlayed[0].name + ' · ' + byPlayed[0].played + ' ' + T.games]);
    var spoon = rows.filter(function (r) { return r.wins === 0; }).sort(function (a, b) { return a.pts - b.pts; })[0];
    if (spoon) out.push(['🥄', T.spoon, spoon.name]);
    else out.push(['🎲', T.matches, String(matches)]);
    return out;
  }

  /* ---------- small canvas helpers ---------- */
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function glowText(c, txt, x, y, color, blur) {
    c.save(); c.shadowColor = color; c.shadowBlur = blur || 24;
    c.fillStyle = color; c.fillText(txt, x, y); c.restore();
  }
  /* Text stack: real text families FIRST, emoji only as a fallback — otherwise
     Chromium resolves digits to the emoji font's keycap bases and they come out
     tiny and grey. Emoji stack is only ever used for emoji-only draws. */
  var F  = "'Segoe UI', 'Noto Sans', 'DejaVu Sans', system-ui, -apple-system, Roboto, sans-serif";
  var FE = F + ", 'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji'";
  var EMO = "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', " + F;
  /* colour-emoji glyphs still honour alpha, so always paint them fully opaque */
  function emoji(c, ch, size, x, yy, align) {
    c.save();
    c.globalAlpha = 1; c.fillStyle = '#ffffff';
    c.font = size + 'px ' + EMO; c.textAlign = align || 'center';
    c.fillText(ch, x, yy);
    c.restore();
  }
  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[1][0] : String(name).slice(0, 2)).toUpperCase();
  }
  /* wrap emoji-heavy text */
  function wrap(c, text, maxW) {
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ==========================================================================
     normalise a night record (the JSON in data/nights/) into card rows
     ========================================================================== */
  function computeRows(night) {
    var PTS = [10, 6, 3, 1], TAIL = 1, DRAW = 5;
    var byId = {};
    (night.players || []).forEach(function (p, i) {
      byId[p.id || p.name] = { id: p.id || p.name, name: p.name, color: p.color || PALETTE[i % PALETTE.length], pts: 0, played: 0, wins: 0 };
    });
    (night.matches || []).forEach(function (m) {
      (m.ranking || []).forEach(function (id, i) {
        var r = byId[id]; if (!r) return;
        r.pts += m.draw ? DRAW : (i < PTS.length ? PTS[i] : TAIL);
        r.played++;
        if (i === 0 && !m.draw) r.wins++;
      });
    });
    var rows = Object.keys(byId).map(function (k) { return byId[k]; })
      .sort(function (a, b) { return b.pts - a.pts || b.wins - a.wins || a.played - b.played; });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    return rows;
  }

  /* ==========================================================================
     draw
     ========================================================================== */
  function drawNightCard(canvas, night, opts) {
    opts = opts || {};
    var rows = opts.rows || computeRows(night);
    var LG = (opts.lang || night.lang || 'en');
    if (!LBL[LG]) LG = 'en';
    var T = LBL[LG];
    var W = 1200;
    var ROW_H = 176;
    var headH = 372;
    var heroH = 250;
    var awardH = 168;
    var footH = 122;
    var H = headH + heroH + rows.length * ROW_H + awardH + footH;

    canvas.width = W; canvas.height = H;
    var c = canvas.getContext('2d');
    c.textBaseline = 'alphabetic';

    /* ---- background ---- */
    var bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#080a1c'); bg.addColorStop(0.5, '#05060f'); bg.addColorStop(1, '#0b0620');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    function blob(x, y, r, col, a) {
      var g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
    }
    blob(60, 40, 620, '#22e6ff', 0.20);
    blob(W - 40, 220, 640, '#ff2fb9', 0.18);
    blob(W / 2, H, 760, '#a55bff', 0.18);

    c.strokeStyle = 'rgba(120,150,255,0.075)'; c.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 56) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke(); }
    for (var gy = 0; gy < H; gy += 56) { c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); }

    /* ---- header ---- */
    var wm = c.createLinearGradient(70, 0, 900, 0);
    wm.addColorStop(0, '#22e6ff'); wm.addColorStop(0.55, '#ff2fb9'); wm.addColorStop(1, '#a55bff');
    c.font = '900 78px ' + F; c.textAlign = 'left';
    c.save(); c.shadowColor = 'rgba(34,230,255,.55)'; c.shadowBlur = 30;
    c.fillStyle = wm; c.fillText('CYBERGRILL', 70, 132); c.restore();

    c.font = '800 21px ' + F; c.fillStyle = '#8b93c4';
    c.fillText('G A M E   N I G H T   ·   A R C A D E', 74, 172);

    c.textAlign = 'right';
    c.font = '900 40px ' + F;
    glowText(c, night.date || '', W - 70, 124, '#ffc93c', 22);
    c.font = '800 19px ' + F; c.fillStyle = '#8b93c4';
    c.fillText((night.title || 'GAME NIGHT').toUpperCase(), W - 70, 164);

    /* games strip */
    var games = night.games && night.games.length ? night.games : ['uno'];
    var gx0 = 70;
    c.textAlign = 'left';
    games.forEach(function (g) {
      var label = (GAME_NAME[g] || String(g).toUpperCase());
      c.font = '800 20px ' + F;
      var tw = c.measureText(label).width + 74;
      c.fillStyle = 'rgba(255,255,255,.05)';
      c.strokeStyle = 'rgba(120,140,255,.22)'; c.lineWidth = 2;
      rr(c, gx0, 208, tw, 54, 16); c.fill(); c.stroke();
      emoji(c, GAME_ICON[g] || '🎮', 28, gx0 + 16, 246, 'left');
      c.font = '800 20px ' + F; c.fillStyle = '#cfd8ee';
      c.fillText(label, gx0 + 58, 244);
      gx0 += tw + 12;
    });

    /* divider */
    var dv = c.createLinearGradient(70, 0, W - 70, 0);
    dv.addColorStop(0, 'rgba(34,230,255,0)'); dv.addColorStop(0.5, 'rgba(34,230,255,.75)'); dv.addColorStop(1, 'rgba(255,47,185,0)');
    c.fillStyle = dv; c.fillRect(70, 306, W - 140, 3);

    c.font = '900 26px ' + F; c.fillStyle = '#8b93c4'; c.textAlign = 'center';
    c.fillText(T.results, W / 2, 352);

    /* ---- champion hero ---- */
    var champ = rows[0];
    var hy = headH;
    if (champ) {
      c.fillStyle = 'rgba(255,201,60,.09)';
      c.strokeStyle = 'rgba(255,201,60,.5)'; c.lineWidth = 3;
      rr(c, 70, hy, W - 140, heroH - 40, 26); c.fill(); c.stroke();

      c.textAlign = 'center';
      emoji(c, '🏆', 74, W / 2, hy + 84);

      c.font = '900 82px ' + F;
      var cg = c.createLinearGradient(0, hy + 100, 0, hy + 170);
      cg.addColorStop(0, '#fff'); cg.addColorStop(1, '#ffc93c');
      c.save(); c.shadowColor = 'rgba(255,201,60,.75)'; c.shadowBlur = 34;
      c.fillStyle = cg; c.fillText(String(champ.name).toUpperCase(), W / 2, hy + 162); c.restore();

      c.font = '800 24px ' + F; c.fillStyle = '#22e6ff';
      c.fillText(T.champion + '  ·  ' + champ.pts + ' ' + T.pts + '  ·  ' + champ.wins + ' ' + T.wins, W / 2, hy + 200);
    }

    /* ---- player rows ---- */
    var y = headH + heroH;
    var medal = ['🥇', '🥈', '🥉'];
    var maxPts = Math.max.apply(null, rows.map(function (r) { return r.pts; }).concat([1]));

    rows.forEach(function (p, i) {
      var top = y + i * ROW_H;
      var h = ROW_H - 16;

      c.fillStyle = 'rgba(255,255,255,.035)';
      c.strokeStyle = i === 0 ? 'rgba(255,201,60,.45)' : 'rgba(255,255,255,.09)';
      c.lineWidth = 2;
      rr(c, 70, top, W - 140, h, 22); c.fill(); c.stroke();

      /* points bar behind */
      c.save(); rr(c, 70, top, W - 140, h, 22); c.clip();
      c.globalAlpha = 0.14; c.fillStyle = p.color;
      c.fillRect(70, top, (W - 140) * (p.pts / maxPts), h);
      c.globalAlpha = 1; c.restore();

      /* rank */
      c.textAlign = 'center';
      if (i < 3) { emoji(c, medal[i], 44, 126, top + 62); }
      else { c.font = '900 40px ' + F; c.fillStyle = '#8b93c4'; c.fillText(String(i + 1), 126, top + 60); }

      /* avatar */
      c.fillStyle = p.color;
      c.save(); c.shadowColor = p.color; c.shadowBlur = 22;
      rr(c, 168, top + 20, 62, 62, 18); c.fill(); c.restore();
      c.fillStyle = '#04060f'; c.font = '900 24px ' + F; c.textAlign = 'center';
      c.fillText(initials(p.name), 199, top + 60);

      /* name + stats */
      c.textAlign = 'left';
      c.font = '900 40px ' + F; c.fillStyle = '#ffffff';
      c.fillText(p.name, 252, top + 52);
      c.font = '800 19px ' + F; c.fillStyle = '#8b93c4';
      c.fillText(p.played + ' ' + T.played + '   ·   ' + p.wins + ' ' + (p.wins === 1 ? T.win : T.wins) +
                 '   ·   ' + (p.played ? Math.round(p.wins / p.played * 100) : 0) + '% ' + T.rate, 253, top + 80);

      /* points */
      c.textAlign = 'right';
      c.font = '900 62px ' + F;
      glowText(c, String(p.pts), W - 108, top + 62, p.color, 20);
      c.font = '800 16px ' + F; c.fillStyle = '#8b93c4';
      c.fillText(T.pts, W - 110, top + 86);

      /* sentence */
      c.textAlign = 'left';
      c.font = '600 23px ' + FE;
      c.fillStyle = '#c3cbe8';
      var lines = wrap(c, sentenceFor(p, { date: night.date || '', total: rows.length, lang: LG }), W - 340);
      lines.slice(0, 2).forEach(function (ln, li) { c.fillText(ln, 252, top + 118 + li * 30); });
    });

    /* ---- awards ---- */
    var ay = y + rows.length * ROW_H + 6;
    var aw = awardsFor(rows, (night.matches || []).length, LG);
    var cw = (W - 140 - 24) / 3;
    aw.slice(0, 3).forEach(function (a, i) {
      var x = 70 + i * (cw + 12);
      c.fillStyle = 'rgba(255,255,255,.045)';
      c.strokeStyle = 'rgba(120,140,255,.2)'; c.lineWidth = 2;
      rr(c, x, ay, cw, 128, 20); c.fill(); c.stroke();
      c.textAlign = 'center';
      emoji(c, a[0], 42, x + cw / 2, ay + 56);
      c.font = '800 15px ' + F; c.fillStyle = '#8b93c4';
      c.fillText(a[1], x + cw / 2, ay + 84);
      c.font = '900 24px ' + F; c.fillStyle = '#ffffff';
      c.fillText(a[2], x + cw / 2, ay + 114);
    });

    /* ---- footer ---- */
    var fy = ay + 128 + 30;
    c.fillStyle = dv; c.fillRect(70, fy, W - 140, 2);
    c.textAlign = 'left';
    c.font = '800 20px ' + F; c.fillStyle = '#8b93c4';
    var mins = (night.matches || []).length;
    c.fillText('🎲 ' + mins + ' ' + T.matches + '   ·   👥 ' + rows.length + ' ' + T.players +
               (night.startedAt ? '   ·   🕘 \u2066' + night.startedAt + ' → ' + (night.endedAt || '') + '\u2069' : ''), 74, fy + 44);
    c.textAlign = 'right';
    c.font = '800 18px ' + F; c.fillStyle = 'rgba(139,147,196,.75)';
    c.fillText(T.foot, W - 74, fy + 44);

    return canvas;
  }

  root.CyberCard = {
    drawNightCard: drawNightCard,
    computeRows: computeRows,
    sentenceFor: sentenceFor,
    awardsFor: awardsFor,
    PALETTE: PALETTE
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
