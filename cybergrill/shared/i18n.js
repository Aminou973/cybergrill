/* ==========================================================================
   CyberGrill — English / Français / العربية
   --------------------------------------------------------------------------
   Two halves:
     dict      short labels, keyed by the exact English string the UI renders.
               A DOM walker swaps them after every render, so no render code
               needs to know about languages.
     patterns  the same job for strings with numbers or names inside them.
     prose     the long stuff (UNO rulebook, mode and format explanations) —
               these are picked directly by the render code, because splitting
               a paragraph across text nodes would wreck the grammar.
   ========================================================================== */
(function (root) {
  'use strict';

  var LANGS = [
    { id: 'en', flag: '🇬🇧', label: 'EN', name: 'English', rtl: false },
    { id: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français', rtl: false },
    { id: 'ar', flag: '🇩🇿', label: 'AR', name: 'العربية', rtl: true }
  ];

  /* ---------------------------------------------------------------- labels */
  var dict = {
    fr: {
      /* intro */
      'GAME NIGHT ARCADE': 'SOIRÉE JEUX ARCADE',
      "WHO'S IN TONIGHT?": 'QUI JOUE CE SOIR ?',
      'ENTER NAME': 'ENTREZ UN NOM',
      'ENTER THE ARENA ▶': "ENTRER DANS L'ARÈNE ▶",
      'ENTER (ADD PLAYERS LATER) ▶': 'ENTRER (JOUEURS PLUS TARD) ▶',
      'RESUME THE NIGHT ▶': 'REPRENDRE LA SOIRÉE ▶',
      'SKIP ▸▸': 'PASSER ▸▸',
      'GAME NIGHT · ARCADE': 'SOIRÉE JEUX · ARCADE',

      /* topbar */
      '🎮 ARCADE': '🎮 ARCADE', '🏆 CUP': '🏆 COUPE', '🃏 UNO ROOM': '🃏 SALLE UNO',
      '🥇 PODIUM': '🥇 PODIUM', '🔊 SFX': '🔊 SONS', '🔇 MUTED': '🔇 MUET',
      '♪ MUSIC': '♪ MUSIQUE', '♪ MUSIC OFF': '♪ MUSIQUE OFF',
      '⛶ FULL': '⛶ PLEIN ÉCRAN', '↩ UNDO': '↩ ANNULER', '⟲ RESET': '⟲ RÉINIT.',
      '💾 SAVE NIGHT': '💾 SAUVEGARDER',

      /* arcade */
      'CYBERGRILL CHAMPION': 'CHAMPION CYBERGRILL',
      'GAME STANDINGS': 'CLASSEMENT DU JEU',
      'LIVE FEED': 'EN DIRECT',
      'MATCHES': 'PARTIES', 'PLAYERS': 'JOUEURS', 'MOST WINS': 'PLUS DE VICTOIRES',
      'ADD PLAYER…': 'AJOUTER UN JOUEUR…',
      'NO PLAYERS YET': 'AUCUN JOUEUR',
      'ADD SOMEONE BELOW ↓': 'AJOUTEZ QUELQU’UN CI-DESSOUS ↓',
      'NOTHING PLAYED YET': 'RIEN DE JOUÉ',
      'LET THE GAMES BEGIN': 'QUE LES JEUX COMMENCENT',
      'ADD PLAYERS FIRST ←': 'AJOUTEZ DES JOUEURS ←',
      'USE THE BOX ON THE LEFT': 'UTILISEZ LA CASE À GAUCHE',
      'RECORD RESULT': 'ENREGISTRER',
      'RECORD RESULT ⏎': 'ENREGISTRER ⏎',
      'RECORD DRAW ⏎': 'ENREGISTRER LE NUL ⏎',
      'CLEAR': 'EFFACER', '✕ CLEAR': '✕ EFFACER',
      '🤝 DRAW': '🤝 MATCH NUL',
      'SCORE (OPTIONAL)': 'SCORE (FACULTATIF)',
      'PTS': 'PTS', 'P': 'J', 'W': 'V', 'D': 'N', 'L': 'D', 'GF': 'BP', 'GA': 'BC', 'GD': 'DB',
      '— CLICK PLAYERS IN FINISHING ORDER (1st → LAST)': '— CLIQUEZ DANS L’ORDRE D’ARRIVÉE (1er → DERNIER)',
      '— CLICK THE WINNER FIRST, THEN THE LOSER': '— CLIQUEZ D’ABORD LE GAGNANT, PUIS LE PERDANT',
      'pick': 'choisir', 'game': 'jeu', 'record': 'valider', 'clear': 'effacer',
      'add': 'ajouter', 'undo': 'annuler', 'podium': 'podium', 'cup': 'coupe',
      'uno room': 'salle uno', 'save night': 'sauvegarder', 'mute': 'muet',

      /* cup */
      'CYBERGRILL CUP': 'COUPE CYBERGRILL',
      'FC 25 · EFOOTBALL · MIX AND MATCH': 'FC 25 · EFOOTBALL · AU CHOIX',
      '1 · WHO ENTERS': '1 · QUI PARTICIPE',
      '2 · FORMAT': '2 · FORMAT',
      '3 · WHICH GAME': '3 · QUEL JEU',
      'START THE DRAW 🎲': 'LANCER LE TIRAGE 🎲',
      'THE DRAW': 'LE TIRAGE',
      'DRAW COMPLETE': 'TIRAGE TERMINÉ',
      "LET'S PLAY ▶": 'ON JOUE ▶',
      'GROUP TABLES': 'CLASSEMENTS DES GROUPES',
      'LEAGUE PHASE TABLE': 'CLASSEMENT DE LA PHASE DE LIGUE',
      'LEAGUE TABLE': 'CLASSEMENT',
      'LEAGUE PHASE': 'PHASE DE LIGUE',
      'ENTRANTS': 'PARTICIPANTS',
      'KNOCKOUT BRACKET': 'TABLEAU FINAL',
      'PLAY-OFF': 'BARRAGE', 'FINAL': 'FINALE', 'SEMI-FINALS': 'DEMI-FINALES',
      'QUARTER-FINALS': 'QUARTS DE FINALE', 'ROUND OF 16': 'HUITIÈMES DE FINALE',
      'PLAYER': 'JOUEUR', 'TBD': 'À VENIR', 'BYE': 'EXEMPT',
      'CYBERGRILL CUP WINNER': 'VAINQUEUR DE LA COUPE',
      '⟲ NEW CUP': '⟲ NOUVELLE COUPE',
      'SAVE RESULT': 'ENREGISTRER LE SCORE',
      'CANCEL': 'ANNULER',
      'PICK THE PENALTY WINNER': 'CHOISISSEZ LE VAINQUEUR AUX TIRS AU BUT',
      'LEVEL AFTER FULL TIME — WHO WON ON PENALTIES?': 'ÉGALITÉ — QUI GAGNE AUX TIRS AU BUT ?',
      'TONIGHT’S STANDINGS': 'CLASSEMENT DE LA SOIRÉE',
      'CLICK ANYWHERE TO CLOSE': 'CLIQUEZ N’IMPORTE OÙ POUR FERMER',
      'CYBERGRILL PODIUM': 'PODIUM CYBERGRILL',
      'WINNER': 'VAINQUEUR',
      'TAKES THE ROUND': 'REMPORTE LA MANCHE',
      'WINS THE CYBERGRILL CUP': 'REMPORTE LA COUPE CYBERGRILL',
      'WINS THE UNO SESSION': 'REMPORTE LA SESSION UNO',
      '🏆 CHAMPION 🏆': '🏆 CHAMPION 🏆',
      'NO FIXTURES YET': 'AUCUN MATCH',

      /* uno room */
      'UNO TABLE': 'TABLE UNO',
      'THE RULEBOOK': 'LE RÈGLEMENT',
      '① SCORING MODE — PICK BEFORE YOU DEAL': '① MODE DE SCORE — À CHOISIR AVANT DE DISTRIBUER',
      '② WHO DEALS · WHO STARTS · WHICH WAY': '② QUI DISTRIBUE · QUI COMMENCE · QUEL SENS',
      'WHO WENT OUT FIRST?': 'QUI A FINI EN PREMIER ?',
      'CARDS LEFT IN EVERY OTHER HAND — TAP TO ADD · SHIFT-TAP TO REMOVE':
        'CARTES RESTANTES DANS CHAQUE MAIN — TAPEZ POUR AJOUTER · MAJ+TAP POUR RETIRER',
      'FINISHING ORDER — CLICK 1st, THEN 2nd, THEN 3rd…': 'ORDRE D’ARRIVÉE — 1er, PUIS 2e, PUIS 3e…',
      '✅ RECORD HAND': '✅ ENREGISTRER LA MANCHE',
      '↺ RESET HAND': '↺ RÉINITIALISER',
      '🎴 DRAW FOR DEALER': '🎴 TIRER LE DONNEUR',
      '🔀 SHUFFLE SEATS': '🔀 MÉLANGER LES PLACES',
      '🔄 FLIP DIRECTION': '🔄 INVERSER LE SENS',
      '🔄 NEW SESSION': '🔄 NOUVELLE SESSION',
      'CLOCKWISE': 'SENS HORAIRE', 'ANTI-CLOCKWISE': 'SENS ANTI-HORAIRE',
      'HOUSE RULES — ALL OFF BY DEFAULT': 'RÈGLES MAISON — TOUTES DÉSACTIVÉES PAR DÉFAUT',
      'COUNT THE CARDS': 'COMPTER LES CARTES',
      'RECORD THE HAND': 'ENREGISTRER LA MANCHE',
      'NO PLAYERS YET ADD THEM IN ARCADE MODE': 'AUCUN JOUEUR — AJOUTEZ-LES EN MODE ARCADE',

      /* export */
      'SAVE TONIGHT': 'SAUVEGARDER LA SOIRÉE',
      'DATE': 'DATE', 'TITLE': 'TITRE', 'RAW': 'BRUT',
      '🖼️ DOWNLOAD PNG': '🖼️ TÉLÉCHARGER LE PNG',
      '💾 DOWNLOAD NIGHT JSON': '💾 TÉLÉCHARGER LE JSON',
      '📋 COPY JSON': '📋 COPIER LE JSON',
      '✕ CLOSE': '✕ FERMER'
    },

    ar: {
      'GAME NIGHT ARCADE': 'ليلة الألعاب',
      "WHO'S IN TONIGHT?": 'من يلعب الليلة؟',
      'ENTER NAME': 'اكتب الاسم',
      'ENTER THE ARENA ▶': '▶ ادخل الحلبة',
      'ENTER (ADD PLAYERS LATER) ▶': '▶ ادخل (أضف اللاعبين لاحقاً)',
      'RESUME THE NIGHT ▶': '▶ تابع الليلة',
      'SKIP ▸▸': 'تخطٍّ ▸▸',
      'GAME NIGHT · ARCADE': 'ليلة الألعاب · أركيد',

      '🎮 ARCADE': '🎮 أركيد', '🏆 CUP': '🏆 الكأس', '🃏 UNO ROOM': '🃏 غرفة أونو',
      '🥇 PODIUM': '🥇 المنصة', '🔊 SFX': '🔊 الأصوات', '🔇 MUTED': '🔇 صامت',
      '♪ MUSIC': '♪ موسيقى', '♪ MUSIC OFF': '♪ بدون موسيقى',
      '⛶ FULL': '⛶ ملء الشاشة', '↩ UNDO': '↩ تراجع', '⟲ RESET': '⟲ تصفير',
      '💾 SAVE NIGHT': '💾 احفظ الليلة',

      'CYBERGRILL CHAMPION': 'بطل السهرة',
      'GAME STANDINGS': 'ترتيب اللعبة',
      'LIVE FEED': 'مباشر',
      'MATCHES': 'مباريات', 'PLAYERS': 'لاعبون', 'MOST WINS': 'الأكثر فوزاً',
      'ADD PLAYER…': 'أضف لاعباً…',
      'NO PLAYERS YET': 'لا يوجد لاعبون',
      'ADD SOMEONE BELOW ↓': '↓ أضف أحداً من الأسفل',
      'NOTHING PLAYED YET': 'لم تُلعب أي مباراة',
      'LET THE GAMES BEGIN': 'لتبدأ الألعاب',
      'ADD PLAYERS FIRST ←': '← أضف اللاعبين أولاً',
      'USE THE BOX ON THE LEFT': 'استعمل الخانة على اليسار',
      'RECORD RESULT': 'سجّل النتيجة',
      'RECORD RESULT ⏎': 'سجّل النتيجة ⏎',
      'RECORD DRAW ⏎': 'سجّل التعادل ⏎',
      'CLEAR': 'مسح', '✕ CLEAR': '✕ مسح',
      '🤝 DRAW': '🤝 تعادل',
      'SCORE (OPTIONAL)': 'النتيجة (اختياري)',
      'PTS': 'نقطة', 'P': 'ل', 'W': 'ف', 'D': 'ت', 'L': 'خ', 'GF': 'له', 'GA': 'عليه', 'GD': 'الفارق',
      '— CLICK PLAYERS IN FINISHING ORDER (1st → LAST)': '— اضغط على اللاعبين حسب ترتيب الوصول (الأول ← الأخير)',
      '— CLICK THE WINNER FIRST, THEN THE LOSER': '— اضغط الفائز أولاً ثم الخاسر',
      'pick': 'اختيار', 'game': 'لعبة', 'record': 'تسجيل', 'clear': 'مسح',
      'add': 'إضافة', 'undo': 'تراجع', 'podium': 'المنصة', 'cup': 'الكأس',
      'uno room': 'غرفة أونو', 'save night': 'حفظ', 'mute': 'صامت',

      'CYBERGRILL CUP': 'كأس سايبرغريل',
      'FC 25 · EFOOTBALL · MIX AND MATCH': 'FC 25 · إي فوتبول · كما تشاؤون',
      '1 · WHO ENTERS': '١ · من يشارك',
      '2 · FORMAT': '٢ · النظام',
      '3 · WHICH GAME': '٣ · أي لعبة',
      'START THE DRAW 🎲': '🎲 ابدأ القرعة',
      'THE DRAW': 'القرعة',
      'DRAW COMPLETE': 'انتهت القرعة',
      "LET'S PLAY ▶": '▶ هيا نلعب',
      'GROUP TABLES': 'جداول المجموعات',
      'LEAGUE PHASE TABLE': 'جدول مرحلة الدوري',
      'LEAGUE TABLE': 'جدول الدوري',
      'LEAGUE PHASE': 'مرحلة الدوري',
      'ENTRANTS': 'المشاركون',
      'KNOCKOUT BRACKET': 'جدول الإقصائيات',
      'PLAY-OFF': 'الملحق', 'FINAL': 'النهائي', 'SEMI-FINALS': 'نصف النهائي',
      'QUARTER-FINALS': 'ربع النهائي', 'ROUND OF 16': 'ثمن النهائي',
      'PLAYER': 'اللاعب', 'TBD': 'لاحقاً', 'BYE': 'مؤهل تلقائياً',
      'CYBERGRILL CUP WINNER': 'الفائز بكأس سايبرغريل',
      '⟲ NEW CUP': '⟲ كأس جديدة',
      'SAVE RESULT': 'احفظ النتيجة',
      'CANCEL': 'إلغاء',
      'PICK THE PENALTY WINNER': 'اختر الفائز بالركلات',
      'LEVEL AFTER FULL TIME — WHO WON ON PENALTIES?': 'تعادل بعد الوقت الأصلي — من فاز بركلات الترجيح؟',
      'TONIGHT’S STANDINGS': 'ترتيب الليلة',
      'CLICK ANYWHERE TO CLOSE': 'اضغط في أي مكان للإغلاق',
      'CYBERGRILL PODIUM': 'منصة سايبرغريل',
      'WINNER': 'الفائز',
      'TAKES THE ROUND': 'يفوز بالجولة',
      'WINS THE CYBERGRILL CUP': 'يفوز بكأس سايبرغريل',
      'WINS THE UNO SESSION': 'يفوز بجلسة أونو',
      '🏆 CHAMPION 🏆': '🏆 البطل 🏆',
      'NO FIXTURES YET': 'لا توجد مباريات',

      'UNO TABLE': 'طاولة أونو',
      'THE RULEBOOK': 'كتاب القواعد',
      '① SCORING MODE — PICK BEFORE YOU DEAL': '① طريقة الحساب — اخترها قبل التوزيع',
      '② WHO DEALS · WHO STARTS · WHICH WAY': '② من يوزّع · من يبدأ · في أي اتجاه',
      'WHO WENT OUT FIRST?': 'من أنهى أوراقه أولاً؟',
      'CARDS LEFT IN EVERY OTHER HAND — TAP TO ADD · SHIFT-TAP TO REMOVE':
        'الأوراق المتبقية في كل يد — اضغط للإضافة · Shift+ضغط للحذف',
      'FINISHING ORDER — CLICK 1st, THEN 2nd, THEN 3rd…': 'ترتيب الوصول — الأول ثم الثاني ثم الثالث…',
      '✅ RECORD HAND': '✅ سجّل الجولة',
      '↺ RESET HAND': '↺ إعادة',
      '🎴 DRAW FOR DEALER': '🎴 اسحب لتحديد الموزّع',
      '🔀 SHUFFLE SEATS': '🔀 اخلط المقاعد',
      '🔄 FLIP DIRECTION': '🔄 اعكس الاتجاه',
      '🔄 NEW SESSION': '🔄 جلسة جديدة',
      'CLOCKWISE': 'مع عقارب الساعة', 'ANTI-CLOCKWISE': 'عكس عقارب الساعة',
      'HOUSE RULES — ALL OFF BY DEFAULT': 'قواعد البيت — كلها مطفأة افتراضياً',
      'COUNT THE CARDS': 'احسب الأوراق',
      'RECORD THE HAND': 'سجّل الجولة',

      'SAVE TONIGHT': 'احفظ هذه الليلة',
      'DATE': 'التاريخ', 'TITLE': 'العنوان', 'RAW': 'البيانات',
      '🖼️ DOWNLOAD PNG': '🖼️ نزّل الصورة',
      '💾 DOWNLOAD NIGHT JSON': '💾 نزّل ملف الليلة',
      '📋 COPY JSON': '📋 انسخ البيانات',
      '✕ CLOSE': '✕ إغلاق'
    }
  };

  /* ------------------------------------------------------- dynamic strings */
  var patterns = [
    [/^(\d+) PLAYED · (\d+) WINS?$/, {
      fr: function (m) { return m[1] + ' JOUÉES · ' + m[2] + (m[2] === '1' ? ' VICTOIRE' : ' VICTOIRES'); },
      ar: function (m) { return m[1] + ' مباراة · ' + m[2] + ' فوز'; }
    }],
    [/^PICK (\d+) MORE$/, {
      fr: function (m) { return 'CHOISISSEZ-EN ' + m[1] + ' DE PLUS'; },
      ar: function (m) { return 'اختر ' + m[1] + ' آخر'; }
    }],
    [/^(\d+) ENTRANTS?$/, {
      fr: function (m) { return m[1] + (m[1] === '1' ? ' PARTICIPANT' : ' PARTICIPANTS'); },
      ar: function (m) { return m[1] + ' مشارك'; }
    }],
    [/^NEED AT LEAST (\d+) ENTRANTS$/, {
      fr: function (m) { return 'IL FAUT AU MOINS ' + m[1] + ' PARTICIPANTS'; },
      ar: function (m) { return 'يلزم ' + m[1] + ' مشاركين على الأقل'; }
    }],
    [/^FIXTURES · (\d+)\/(\d+) PLAYED$/, {
      fr: function (m) { return 'MATCHS · ' + m[1] + '/' + m[2] + ' JOUÉS'; },
      ar: function (m) { return 'المباريات · ' + m[1] + '/' + m[2] + ' لُعبت'; }
    }],
    [/^GROUP ([A-Z])$/, {
      fr: function (m) { return 'GROUPE ' + m[1]; },
      ar: function (m) { return 'المجموعة ' + m[1]; }
    }],
    [/^TIE (\d+)$/, {
      fr: function (m) { return 'MATCH ' + m[1]; },
      ar: function (m) { return 'المواجهة ' + m[1]; }
    }],
    [/^(.+) STANDINGS$/, {
      fr: function (m) { return 'CLASSEMENT ' + m[1]; },
      ar: function (m) { return 'ترتيب ' + m[1]; }
    }],
    [/^(COUNT THE CARDS|RECORD THE HAND) · HAND (\d+)$/, {
      fr: function (m, d) { return d[m[1]] + ' · MANCHE ' + m[2]; },
      ar: function (m, d) { return d[m[1]] + ' · الجولة ' + m[2]; }
    }],
    [/^RACE TO (\d+)$/, {
      fr: function (m) { return 'COURSE VERS ' + m[1]; },
      ar: function (m) { return 'السباق إلى ' + m[1]; }
    }],
    [/^(\d+) CARDS?$/, {
      fr: function (m) { return m[1] + (m[1] === '1' ? ' CARTE' : ' CARTES'); },
      ar: function (m) { return m[1] + ' ورقة'; }
    }],
    [/^✅ END HAND & BANK (\d+)$/, {
      fr: function (m) { return '✅ FIN DE MANCHE · ' + m[1] + ' PTS'; },
      ar: function (m) { return '✅ أنهِ الجولة · ' + m[1] + ' نقطة'; }
    }],
    [/^(.+) BANKS (\d+) POINTS$/, {
      fr: function (m) { return m[1] + ' EMPOCHE ' + m[2] + ' POINTS'; },
      ar: function (m) { return m[1] + ' يكسب ' + m[2] + ' نقطة'; }
    }],
    [/^HAND (\d+)$/, {
      fr: function (m) { return 'MANCHE ' + m[1]; },
      ar: function (m) { return 'الجولة ' + m[1]; }
    }],
    [/^(\d+) MATCHES · (\d+) PLAYERS · (.+)$/, {
      fr: function (m) { return m[1] + ' PARTIES · ' + m[2] + ' JOUEURS · ' + m[3]; },
      ar: function (m) { return m[1] + ' مباراة · ' + m[2] + ' لاعبين · ' + m[3]; }
    }],
    [/^(\d+) \/ (\d+) POINTS$/, {
      fr: function (m) { return m[1] + ' / ' + m[2] + ' POINTS'; },
      ar: function (m) { return m[1] + ' / ' + m[2] + ' نقطة'; }
    }],
    [/^(\d+) HANDS PLAYED$/, {
      fr: function (m) { return m[1] + ' MANCHES JOUÉES'; },
      ar: function (m) { return m[1] + ' جولة'; }
    }],
    [/^\+(\d+) PTS$/, {
      fr: function (m) { return '+' + m[1] + ' PTS'; },
      ar: function (m) { return '+' + m[1] + ' نقطة'; }
    }],
    [/^(\d+)–(\d+) · STRAIGHT TO (.+)$/, {
      fr: function (m, d) { return m[1] + '–' + m[2] + ' · DIRECT EN ' + (d[m[3]] || m[3]); },
      ar: function (m, d) { return m[1] + '–' + m[2] + ' · مباشرة إلى ' + (d[m[3]] || m[3]); }
    }],
    [/^(\d+)–(\d+) · PLAY-OFF$/, {
      fr: function (m) { return m[1] + '–' + m[2] + ' · BARRAGE'; },
      ar: function (m) { return m[1] + '–' + m[2] + ' · الملحق'; }
    }],
    [/^(\d+)\+ · ELIMINATED$/, {
      fr: function (m) { return m[1] + '+ · ÉLIMINÉS'; },
      ar: function (m) { return m[1] + '+ · خارج المنافسة'; }
    }],
    [/^(\d+) MATCHES · (\d+) PLAYERS$/, {
      fr: function (m) { return m[1] + ' PARTIES · ' + m[2] + ' JOUEURS'; },
      ar: function (m) { return m[1] + ' مباراة · ' + m[2] + ' لاعبين'; }
    }],
    [/^beat (.+)$/, {
      fr: function (m) { return 'bat ' + m[1]; },
      ar: function (m) { return 'تغلّب على ' + m[1]; }
    }],
    [/^(\d+) PTS · (\d+)W$/, {
      fr: function (m) { return m[1] + ' PTS · ' + m[2] + 'V'; },
      ar: function (m) { return m[1] + ' نقطة · ' + m[2] + ' فوز'; }
    }],
    [/^CHAMPION OF THE NIGHT · (\d+) PTS · (\d+) WINS$/, {
      fr: function (m) { return 'CHAMPION DE LA SOIRÉE · ' + m[1] + ' PTS · ' + m[2] + ' VICTOIRES'; },
      ar: function (m) { return 'بطل الليلة · ' + m[1] + ' نقطة · ' + m[2] + ' فوز'; }
    }]
  ];

  root.CyberI18N = { LANGS: LANGS, dict: dict, patterns: patterns, prose: {} };
})(typeof globalThis !== 'undefined' ? globalThis : this);
