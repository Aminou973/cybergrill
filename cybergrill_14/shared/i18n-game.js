/* ==========================================================================
   CyberGrill — Français / العربية for the table pages
   --------------------------------------------------------------------------
   Keyed by the exact English the tables render. shared/lang.js walks the DOM
   and swaps them, so nothing in the game code needs to know about languages.

   patterns catch the lines with a name or a number inside them: [regex, {fr,
   ar}] where each function is handed the match.

   The Ronda calls keep their own names in every language. A darba is a darba
   in Algiers whether you are speaking Arabic or French, and translating it
   to "strike" would just make the table harder to follow.
   ========================================================================== */
(function (root) {
  'use strict';

  var dict = {
    fr: {
      /* ---- ronda: les couleurs du jeu espagnol ---- */
      'oros': 'deniers', 'copas': 'coupes', 'espadas': 'épées', 'bastos': 'bâtons',
      'OROS': 'DENIERS', 'COPAS': 'COUPES', 'ESPADAS': 'ÉPÉES', 'BASTOS': 'BÂTONS',
      'SOTA': 'VALET', 'CABALLO': 'CAVALIER', 'REY': 'ROI',
      'Table clear, but no missa on the last hand.': 'Table vide, mais pas de missa sur la dernière main.',
      'Three of a kind. A tringa always beats a ronda, so there is nothing to lose by calling it.':
        'Un brelan. Un tringa bat toujours un ronda : il n’y a rien à perdre à l’annoncer.',
      '<b>Last three each</b> — the deck is finished after this.':
        '<b>Dernières trois cartes chacun</b> — le talon est fini après cela.',
      "<i>Qa'at Rey</i> — the king was on the bottom of the deck. +5 to the dealer.":
        "<i>Qa'at Rey</i> — le roi était au fond du talon. +5 pour le donneur.",
      "<i>Qa'at As</i> — the ace was on the bottom. +5 against the dealer.":
        "<i>Qa'at As</i> — l’as était au fond. +5 contre le donneur.",
      'TEACHING': 'PÉDAGOGIQUE',
      'CALM': 'CALME',
      'BRISK': 'RAPIDE',
      'You can play this now.': 'Vous pouvez la jouer maintenant.',
      'A number card. It goes on any ': 'Une carte chiffre. Elle se pose sur n’importe quelle ',
      'The next player takes two cards and loses their turn.': 'Le joueur suivant pioche deux cartes et perd son tour.',
      'Play turns around. With two players it works like a skip.': 'Le sens s’inverse. À deux, cela vaut un passe-tour.',
      'Play it on anything and name the colour that carries on.': 'Se joue sur tout : annoncez la couleur qui continue.',
      'Nothing in your hand answers it. Take them and move on.': 'Rien dans votre main n’y répond. Prenez-les et continuez.',
      'Nothing sensible to do.': 'Rien de sensé à faire.',
      'Nothing but wilds left. Call whatever hurts most.': 'Il ne reste que des jokers. Annoncez ce qui fait le plus mal.',
      'You already drew this turn. Play the card you drew, or pass.': 'Vous avez déjà pioché ce tour. Jouez la carte piochée, ou passez.',
      'You can still shout UNO or catch someone who forgot.': 'Vous pouvez encore crier UNO ou prendre quelqu’un qui a oublié.',
      '🔁 everyone passed their hand along': '🔁 tout le monde a passé sa main',
      '🔄 direction reversed': '🔄 sens inversé',
      '⏱️ out of time — drawing and passing': '⏱️ temps écoulé — pioche et passe',
      'Cards dealt. ': 'Cartes distribuées. ',
      'Answer a +2 with a +2, pass the pile on': 'Répondre à un +2 par un +2, la pile passe',
      'Identical card? Play it out of turn': 'Carte identique ? Jouez-la hors tour',
      'Instead of drawing exactly one': 'Au lieu de piocher exactement une',
      'No challenges, +4 always just works': 'Pas de contestation, le +4 passe toujours',
      'Start anti-clockwise sometimes': 'Commencer parfois en sens anti-horaire',
      'A token walks ': 'Un pion avance de ',
      'In play: ': 'En jeu : ',
      'Pick a token to move ': 'Choisissez un pion à avancer de ',
      'Nothing can use a ': 'Rien ne peut utiliser un ',
      /* ---- setup ---- */
      'CYBERGRILL UNO': 'CYBERGRILL UNO', 'CYBERGRILL LUDO': 'CYBERGRILL LUDO',
      'CYBERGRILL RONDA': 'CYBERGRILL RONDA',
      '🤖 SOLO VS BOTS': '🤖 SOLO CONTRE BOTS', '🌍 ONLINE': '🌍 EN LIGNE',
      'YOUR NAME': 'VOTRE NOM',
      'START A TABLE, OR JOIN ONE': 'CRÉEZ UNE TABLE, OU REJOIGNEZ-EN UNE',
      '🎲 CREATE A ROOM': '🎲 CRÉER UNE SALLE', '🃏 CREATE A ROOM': '🃏 CRÉER UNE SALLE',
      'JOIN': 'REJOINDRE', 'CODE': 'CODE', 'NAME': 'NOM',
      'DECK': 'JEU DE CARTES', 'MODE': 'MODE', 'WHICH GAME': 'QUEL JEU',
      'PLAY UP TO': 'JOUER JUSQU’À', 'PLAY TO': 'JOUER JUSQU’À',
      'AT THE TABLE': 'À LA TABLE', 'OPPONENTS': 'ADVERSAIRES',
      'HOW GOOD ARE THEY': 'LEUR NIVEAU', 'HOW FAST THEY PLAY': 'LEUR VITESSE',
      'TURN CLOCK': 'CHRONO PAR TOUR', 'ROUNDS TO WIN THE MATCH': 'MANCHES POUR GAGNER',
      'HOUSE RULES': 'RÈGLES MAISON',
      'HOUSE RULES — ALL OFF IS THE OFFICIAL GAME': 'RÈGLES MAISON — TOUT ÉTEINT = RÈGLES OFFICIELLES',
      'WHO IS WAITING FOR A SEAT': 'QUI ATTEND UNE PLACE',
      'DEAL ▶': 'DISTRIBUER ▶', 'THROW ▶': 'LANCER ▶',
      'HEAD TO HEAD': 'EN TÊTE À TÊTE', 'THREE, ALONE': 'À TROIS, CHACUN POUR SOI',
      'FOUR, IN PAIRS': 'À QUATRE, EN PAIRES',
      'SHORT · 21': 'COURTE · 21', 'THE USUAL · 41': 'LA NORMALE · 41', 'LONG · 51': 'LONGUE · 51',
      '🙂 EASY': '🙂 FACILE', '🙃 NORMAL': '🙃 NORMAL', '😈 SHARP': '😈 REDOUTABLE',
      '🐢 SLOW': '🐢 LENT', 'NORMAL': 'NORMAL', '⚡ FAST': '⚡ RAPIDE', 'OFF': 'AUCUN',
      /* ---- the chips along the top ---- */
      'GAMES': 'JEUX', 'MUSIC': 'MUSIQUE', 'INFO': 'INFOS', 'SCORES': 'SCORES',
      'RULES': 'RÈGLES', 'QUIT': 'QUITTER', 'PACE': 'RYTHME', 'LANG': 'LANGUE',
      /* ---- the lobby ---- */
      'ROOM CODE': 'CODE DE LA SALLE',
      'READ IT OUT — THEY TYPE IT IN AND JOIN': 'LISEZ-LE À VOIX HAUTE — ILS LE TAPENT ET REJOIGNENT',
      '🤖 ADD A BOT': '🤖 AJOUTER UN BOT', 'AT LEAST TWO…': 'AU MOINS DEUX…',
      'WAITING FOR THE HOST…': 'EN ATTENTE DE L’HÔTE…',
      'WAITING FOR ONE MORE…': 'IL MANQUE UN JOUEUR…',
      'RECONNECTING…': 'RECONNEXION…', 'Knocking…': 'On frappe…',
      'HOST': 'HÔTE', 'BOT': 'BOT', 'WAITING': 'EN ATTENTE',
      'Could not reach the server.': 'Serveur injoignable.',
      'Type the four-letter code first.': 'Tapez d’abord le code à quatre lettres.',
      'No server is configured for this build yet.': 'Aucun serveur n’est configuré pour cette version.',
      'No server address is configured for this build.': 'Aucune adresse de serveur n’est configurée pour cette version.',
      'The round is over.': 'La manche est terminée.',
      /* ---- leaving ---- */
      'Leave the game?': 'Quitter la partie ?', 'STAY HERE': 'RESTER', 'LEAVE': 'QUITTER',
      'PLAY AGAIN': 'REJOUER', 'NEXT ROUND ▶': 'MANCHE SUIVANTE ▶', 'CLOSE': 'FERMER',
      'GOT IT': 'COMPRIS', 'POST': 'PUBLIER',
      /* ---- the table ---- */
      'TABLE CLEAR': 'TABLE VIDE', 'YOU': 'VOUS', 'TEAM ': 'ÉQUIPE ',
      'TAKES THE ROUND': 'REMPORTE LA MANCHE', 'TAKE THE ROUND': 'REMPORTE LA MANCHE',
      'TAKE THE GAME': 'REMPORTE LA PARTIE', 'WINS THE MATCH': 'GAGNE LE MATCH',
      'A DRAW': 'MATCH NUL', 'YOU TAKE IT': 'VOUS LA PRENEZ', 'THEY TAKE IT': 'ILS LA PRENNENT',
      'CAUGHT': 'PRIS', 'LEVEL': 'À ÉGALITÉ',
      /* ---- ronda: the calls keep their names ---- */
      '☕ MAKLA': '☕ MAKLA', '🃏 RONDA': '🃏 RONDA', 'RONDA': 'RONDA', 'TRINGA': 'TRINGA',
      'DARBA': 'DARBA', '🤐 SAY NOTHING': '🤐 NE RIEN DIRE',
      /* ---- uno ---- */
      '🂠 DRAW': '🂠 PIOCHER', 'PASS': 'PASSER', '💡 HINT': '💡 INDICE',
      '🗣️ SAY UNO': '🗣️ DIRE UNO', '🗣️ UNO!': '🗣️ UNO !', 'UNO!': 'UNO !',
      '🕵️ CHALLENGE THE +4': '🕵️ CONTESTER LE +4',
      '🕵️ THINK ABOUT CHALLENGING': '🕵️ PENSEZ À CONTESTER',
      'CALL THE COLOUR': 'ANNONCEZ LA COULEUR', 'RED': 'ROUGE', 'BLUE': 'BLEU',
      'YELLOW': 'JAUNE', 'GREEN': 'VERT', 'PICK': 'CHOISIR',
      'CLOCKWISE': 'SENS HORAIRE', 'ANTI-CLOCKWISE': 'SENS ANTI-HORAIRE',
      'SKIP': 'PASSE-TOUR', 'REVERSE': 'INVERSION', 'DRAW TWO': '+2',
      'WILD': 'JOKER', 'WILD DRAW FOUR': 'JOKER +4', 'SKIPPED': 'TOUR SAUTÉ',
      'STACKING': 'CUMUL DES +2', 'JUMP-IN': 'CARTE IDENTIQUE',
      'NO-BLUFF +4': '+4 SANS BLUFF', 'RANDOM DIRECTION': 'SENS ALÉATOIRE',
      'DRAW UNTIL YOU CAN PLAY': 'PIOCHER JUSQU’À POUVOIR JOUER',
      /* ---- ludo ---- */
      'NOTHING TO MOVE — PASS': 'RIEN À DÉPLACER — PASSER', 'Tap the die': 'Touchez le dé',
      'CAPTURE': 'CAPTURE', 'SIX TO LEAVE THE YARD': 'UN SIX POUR SORTIR',
      'EXACT ROLL TO FINISH': 'COMPTE EXACT POUR RENTRER',
      'A SIX ROLLS AGAIN': 'UN SIX REJOUE', 'THREE SIXES FORFEITS': 'TROIS SIX = TOUR PERDU',
      'Nothing comes out without a six.': 'Rien ne sort sans un six.',
      'Throw a six and you go again.': 'Un six et vous rejouez.',
      'Three in a row and you lose the turn.': 'Trois d’affilée et vous perdez le tour.',
      'You must land on the middle exactly.': 'Il faut tomber pile au centre.'
    },

    ar: {
      /* ---- رندة: ألوان الورق الإسباني بأسمائها عندنا ---- */
      'oros': 'دهب', 'copas': 'كوبة', 'espadas': 'شبادة', 'bastos': 'كبّوية',
      'OROS': 'الدهب', 'COPAS': 'الكوبة', 'ESPADAS': 'الشبادة', 'BASTOS': 'الكبّوية',
      'SOTA': 'الخادم', 'CABALLO': 'الحصان', 'REY': 'الملك',
      'Table clear, but no missa on the last hand.': 'الطاولة فارغة، لكن لا ميسة في اليد الأخيرة.',
      'Three of a kind. A tringa always beats a ronda, so there is nothing to lose by calling it.':
        'ثلاثة من نفس الرقم. الترينڤة تغلب الرندة دائماً، فلا شيء تخسره إن أعلنتها.',
      '<b>Last three each</b> — the deck is finished after this.':
        '<b>آخر ثلاث لكل واحد</b> — ينتهي الورق بعد هذه.',
      "<i>Qa'at Rey</i> — the king was on the bottom of the deck. +5 to the dealer.":
        "<i>قاع الملك</i> — الملك كان في قاع الورق. +5 للموزّع.",
      "<i>Qa'at As</i> — the ace was on the bottom. +5 against the dealer.":
        "<i>قاع الآص</i> — الآص كان في القاع. +5 ضد الموزّع.",
      'TEACHING': 'تعليمي',
      'CALM': 'هادئ',
      'BRISK': 'سريع',
      'You can play this now.': 'تقدر تلعبها الآن.',
      'A number card. It goes on any ': 'ورقة رقم. توضع على أي ',
      'The next player takes two cards and loses their turn.': 'اللاعب التالي يسحب ورقتين ويخسر دوره.',
      'Play turns around. With two players it works like a skip.': 'يعكس اتجاه اللعب. مع لاعبين اثنين يعمل كتخطّي.',
      'Play it on anything and name the colour that carries on.': 'تُلعب على أي شيء، وتختار اللون الذي يكمل.',
      'Nothing in your hand answers it. Take them and move on.': 'لا شيء في يدك يردّ عليها. خذها وواصل.',
      'Nothing sensible to do.': 'لا يوجد شيء معقول تفعله.',
      'Nothing but wilds left. Call whatever hurts most.': 'ما بقي إلا الجوكرات. اختر اللون الذي يؤلم أكثر.',
      'You already drew this turn. Play the card you drew, or pass.': 'سحبت في هذا الدور. العب الورقة التي سحبتها أو مرّر.',
      'You can still shout UNO or catch someone who forgot.': 'ما زال بإمكانك أن تصيح أونو أو تمسك من نسي.',
      '🔁 everyone passed their hand along': '🔁 الكل مرّر يده',
      '🔄 direction reversed': '🔄 انعكس الاتجاه',
      '⏱️ out of time — drawing and passing': '⏱️ انتهى الوقت — يسحب ويمرّر',
      'Cards dealt. ': 'وُزّعت الأوراق. ',
      'Answer a +2 with a +2, pass the pile on': 'ردّ على +2 بـ +2 ومرّر الكومة',
      'Identical card? Play it out of turn': 'ورقة مطابقة؟ العبها خارج دورك',
      'Instead of drawing exactly one': 'بدل سحب ورقة واحدة بالضبط',
      'No challenges, +4 always just works': 'بلا اعتراض، الـ +4 يمرّ دائماً',
      'Start anti-clockwise sometimes': 'ابدأ أحياناً عكس عقارب الساعة',
      'A token walks ': 'البيدق يمشي ',
      'In play: ': 'في اللعب: ',
      'Pick a token to move ': 'اختر بيدقاً ليتحرك ',
      'Nothing can use a ': 'لا شيء يستطيع استعمال ',
      /* ---- الإعداد ---- */
      'CYBERGRILL UNO': 'سايبرغريل أونو', 'CYBERGRILL LUDO': 'سايبرغريل لودو',
      'CYBERGRILL RONDA': 'سايبرغريل رندة',
      '🤖 SOLO VS BOTS': '🤖 ضد الآلة', '🌍 ONLINE': '🌍 عبر الإنترنت',
      'YOUR NAME': 'اسمك',
      'START A TABLE, OR JOIN ONE': 'أنشئ طاولة، أو انضم إلى واحدة',
      '🎲 CREATE A ROOM': '🎲 أنشئ غرفة', '🃏 CREATE A ROOM': '🃏 أنشئ غرفة',
      'JOIN': 'انضم', 'CODE': 'الرمز', 'NAME': 'الاسم',
      'DECK': 'الورق', 'MODE': 'النمط', 'WHICH GAME': 'أي لعبة',
      'PLAY UP TO': 'اللعب حتى', 'PLAY TO': 'اللعب حتى',
      'AT THE TABLE': 'على الطاولة', 'OPPONENTS': 'الخصوم',
      'HOW GOOD ARE THEY': 'مستواهم', 'HOW FAST THEY PLAY': 'سرعة لعبهم',
      'TURN CLOCK': 'مؤقّت الدور', 'ROUNDS TO WIN THE MATCH': 'الجولات اللازمة للفوز',
      'HOUSE RULES': 'قواعد البيت',
      'HOUSE RULES — ALL OFF IS THE OFFICIAL GAME': 'قواعد البيت — كلها مطفأة يعني القواعد الرسمية',
      'WHO IS WAITING FOR A SEAT': 'من ينتظر مقعداً',
      'DEAL ▶': 'وزّع ▶', 'THROW ▶': 'ارمِ ▶',
      'HEAD TO HEAD': 'واحد ضد واحد', 'THREE, ALONE': 'ثلاثة، كل لنفسه',
      'FOUR, IN PAIRS': 'أربعة، ثنائيات',
      'SHORT · 21': 'قصيرة · ٢١', 'THE USUAL · 41': 'المعتادة · ٤١', 'LONG · 51': 'طويلة · ٥١',
      '🙂 EASY': '🙂 سهل', '🙃 NORMAL': '🙃 عادي', '😈 SHARP': '😈 محترف',
      '🐢 SLOW': '🐢 بطيء', 'NORMAL': 'عادي', '⚡ FAST': '⚡ سريع', 'OFF': 'بدون',
      /* ---- الأزرار العلوية ---- */
      'GAMES': 'الألعاب', 'MUSIC': 'الموسيقى', 'INFO': 'المعلومات', 'SCORES': 'النقاط',
      'RULES': 'القواعد', 'QUIT': 'خروج', 'PACE': 'الإيقاع', 'LANG': 'اللغة',
      /* ---- الغرفة ---- */
      'ROOM CODE': 'رمز الغرفة',
      'READ IT OUT — THEY TYPE IT IN AND JOIN': 'اقرأه بصوت عالٍ — يكتبونه وينضمّون',
      '🤖 ADD A BOT': '🤖 أضف لاعباً آلياً', 'AT LEAST TWO…': 'اثنان على الأقل…',
      'WAITING FOR THE HOST…': 'في انتظار المضيف…',
      'WAITING FOR ONE MORE…': 'ينقص لاعب واحد…',
      'RECONNECTING…': 'إعادة الاتصال…', 'Knocking…': 'نطرق الباب…',
      'HOST': 'المضيف', 'BOT': 'آلي', 'WAITING': 'في الانتظار',
      'Could not reach the server.': 'تعذّر الوصول إلى الخادم.',
      'Type the four-letter code first.': 'اكتب الرمز المكوّن من أربعة أحرف أولاً.',
      'No server is configured for this build yet.': 'لا يوجد خادم مُعدّ لهذه النسخة بعد.',
      'No server address is configured for this build.': 'لا يوجد عنوان خادم مُعدّ لهذه النسخة.',
      'The round is over.': 'انتهت الجولة.',
      /* ---- المغادرة ---- */
      'Leave the game?': 'مغادرة اللعبة؟', 'STAY HERE': 'ابقَ هنا', 'LEAVE': 'غادر',
      'PLAY AGAIN': 'العب مجدداً', 'NEXT ROUND ▶': 'الجولة التالية ▶', 'CLOSE': 'إغلاق',
      'GOT IT': 'فهمت', 'POST': 'نشر',
      /* ---- الطاولة ---- */
      'TABLE CLEAR': 'الطاولة فارغة', 'YOU': 'أنت', 'TEAM ': 'فريق ',
      'TAKES THE ROUND': 'يفوز بالجولة', 'TAKE THE ROUND': 'يفوز بالجولة',
      'TAKE THE GAME': 'يفوز بالمباراة', 'WINS THE MATCH': 'يفوز بالمباراة',
      'A DRAW': 'تعادل', 'YOU TAKE IT': 'أنت تأخذها', 'THEY TAKE IT': 'هم يأخذونها',
      'CAUGHT': 'انكشف', 'LEVEL': 'تعادل',
      /* ---- رندة: الأسماء تبقى كما هي على الطاولة ---- */
      '☕ MAKLA': '☕ ماكلة', '🃏 RONDA': '🃏 رندة', 'RONDA': 'رندة', 'TRINGA': 'ترينڤة',
      'DARBA': 'ضربة', '🤐 SAY NOTHING': '🤐 لا تقل شيئاً',
      /* ---- أونو ---- */
      '🂠 DRAW': '🂠 اسحب', 'PASS': 'مرّر', '💡 HINT': '💡 تلميح',
      '🗣️ SAY UNO': '🗣️ قل أونو', '🗣️ UNO!': '🗣️ أونو!', 'UNO!': 'أونو!',
      '🕵️ CHALLENGE THE +4': '🕵️ اعترض على الـ +4',
      '🕵️ THINK ABOUT CHALLENGING': '🕵️ فكّر في الاعتراض',
      'CALL THE COLOUR': 'اختر اللون', 'RED': 'أحمر', 'BLUE': 'أزرق',
      'YELLOW': 'أصفر', 'GREEN': 'أخضر', 'PICK': 'اختر',
      'CLOCKWISE': 'مع عقارب الساعة', 'ANTI-CLOCKWISE': 'عكس عقارب الساعة',
      'SKIP': 'تخطّي', 'REVERSE': 'عكس الاتجاه', 'DRAW TWO': 'اسحب اثنتين',
      'WILD': 'جوكر', 'WILD DRAW FOUR': 'جوكر +4', 'SKIPPED': 'دور ضائع',
      'STACKING': 'تكديس الـ +2', 'JUMP-IN': 'القفز بورقة مطابقة',
      'NO-BLUFF +4': '+4 بلا خداع', 'RANDOM DIRECTION': 'اتجاه عشوائي',
      'DRAW UNTIL YOU CAN PLAY': 'اسحب حتى تستطيع اللعب',
      /* ---- لودو ---- */
      'NOTHING TO MOVE — PASS': 'لا شيء يتحرك — مرّر', 'Tap the die': 'المس النرد',
      'CAPTURE': 'أكل', 'SIX TO LEAVE THE YARD': 'ستة للخروج من الدار',
      'EXACT ROLL TO FINISH': 'الرمية المضبوطة للدخول',
      'A SIX ROLLS AGAIN': 'الستة تعيد الرمي', 'THREE SIXES FORFEITS': 'ثلاث ستّات تُضيّع الدور',
      'Nothing comes out without a six.': 'لا شيء يخرج بدون ستة.',
      'Throw a six and you go again.': 'ارمِ ستة وتلعب مرة أخرى.',
      'Three in a row and you lose the turn.': 'ثلاث متتالية وتخسر الدور.',
      'You must land on the middle exactly.': 'يجب أن تصل إلى المركز بالضبط.'
    }
  };

  /* ------------------------------------------------------------------------
     the lines with a name or a number in them
     ------------------------------------------------------------------------ */
  var patterns = [
    [/^ROOM (\w+)$/, {
      fr: function (m) { return 'SALLE ' + m[1]; },
      ar: function (m) { return 'غرفة ' + m[1]; }
    }],
    [/^(\d+) AT THE TABLE · TWO, THREE OR FOUR$/, {
      fr: function (m) { return m[1] + ' À LA TABLE · DEUX, TROIS OU QUATRE'; },
      ar: function (m) { return m[1] + ' على الطاولة · اثنان أو ثلاثة أو أربعة'; }
    }],
    [/^(\d+) OF (\d+) SEATS$/, {
      fr: function (m) { return m[1] + ' SUR ' + m[2] + ' PLACES'; },
      ar: function (m) { return m[1] + ' من ' + m[2] + ' مقاعد'; }
    }],
    [/^to (\d+)$/, {
      fr: function (m) { return 'jusqu’à ' + m[1]; },
      ar: function (m) { return 'حتى ' + m[1]; }
    }],
    [/^(\d+) left$/, {
      fr: function (m) { return m[1] + ' restantes'; },
      ar: function (m) { return 'تبقّى ' + m[1]; }
    }],
    [/^(.+) IS PLAYING…$/, {
      fr: function (m) { return m[1] + ' JOUE…'; },
      ar: function (m) { return m[1] + ' يلعب…'; }
    }],
    [/^(.+) IS DECIDING WHETHER TO CALL…$/, {
      fr: function (m) { return m[1] + ' DÉCIDE S’IL ANNONCE…'; },
      ar: function (m) { return m[1] + ' يقرّر هل يعلن…'; }
    }],
    [/^YOU HAVE A (TRINGA|RONDA) OF (\d+)s$/, {
      fr: function (m) { return 'VOUS AVEZ UN ' + m[1] + ' DE ' + m[2]; },
      ar: function (m) { return 'عندك ' + (m[1] === 'TRINGA' ? 'ترينڤة' : 'رندة') + ' من ' + m[2]; }
    }],
    [/^📣 CALL IT · \+(\d+)$/, {
      fr: function (m) { return '📣 ANNONCER · +' + m[1]; },
      ar: function (m) { return '📣 أعلنها · +' + m[1]; }
    }],
    [/^(\d+) cards · (\d+)p$/, {
      fr: function (m) { return m[1] + ' cartes · ' + m[2] + 'p'; },
      ar: function (m) { return m[1] + ' ورقة · ' + m[2] + ' نقطة'; }
    }],
    [/^(\d+) CARDS?$/, {
      fr: function (m) { return m[1] + (m[1] === '1' ? ' CARTE' : ' CARTES'); },
      ar: function (m) { return m[1] + ' ورقة'; }
    }],
    [/^A point a card over (\d+), plus everything called along the way\.$/, {
      fr: function (m) { return 'Un point par carte au-delà de ' + m[1] + ', plus tout ce qui a été annoncé.'; },
      ar: function (m) { return 'نقطة عن كل ورقة فوق ' + m[1] + '، زائد كل ما أُعلن في الطريق.'; }
    }],
    [/^TEAM ([A-Z]) · (.+)$/, {
      fr: function (m) { return 'ÉQUIPE ' + m[1] + ' · ' + m[2]; },
      ar: function (m) { return 'فريق ' + m[1] + ' · ' + m[2]; }
    }],
    [/^STILL IN · ROUND (\d+)$/, {
      fr: function (m) { return 'ENCORE EN JEU · MANCHE ' + m[1]; },
      ar: function (m) { return 'ما زال في اللعب · الجولة ' + m[1]; }
    }],
    /* ---------------- ronda: what the table says after each move -------- */
    [/^<b>(.+)<\/b> played the (<u>[^<]+<\/u>) and took the matching (\d+)\.$/, {
      fr: function (m) { return '<b>' + m[1] + '</b> a joué le ' + m[2] + ' et a pris le ' + m[3] + ' qui allait avec.'; },
      ar: function (m) { return '<b>' + m[1] + '</b> لعب ' + m[2] + ' وأخذ الـ' + m[3] + ' الموافقة.'; }
    }],
    [/^<b>(.+)<\/b> played the (<u>[^<]+<\/u>) and swept <i>([^<]+)<\/i> — the run climbs while the next rank is there\.$/, {
      fr: function (m) { return '<b>' + m[1] + '</b> a joué le ' + m[2] + ' et rafle <i>' + m[3] + '</i> — la suite monte tant que le rang suivant est là.'; },
      ar: function (m) { return '<b>' + m[1] + '</b> لعب ' + m[2] + ' وكنس <i>' + m[3] + '</i> — السلسلة تصعد ما دام الرقم التالي موجوداً.'; }
    }],
    [/^<b>(.+)<\/b> had nothing to match, so the (<u>[^<]+<\/u>) stays on the table\.$/, {
      fr: function (m) { return '<b>' + m[1] + '</b> n’avait rien à assortir, donc le ' + m[2] + ' reste sur la table.'; },
      ar: function (m) { return '<b>' + m[1] + '</b> ما عندوش ما يوافقها، فبقيت ' + m[2] + ' على الطاولة.'; }
    }],
    [/^<i>Darba<\/i> — taken straight back off the player before(, \+(\d+))?\.$/, {
      fr: function (m) { return '<i>Darba</i> — reprise aussitôt au joueur précédent' + (m[2] ? ', +' + m[2] : '') + '.'; },
      ar: function (m) { return '<i>ضربة</i> — استُرجعت فوراً من اللاعب السابق' + (m[2] ? '، +' + m[2] : '') + '.'; }
    }],
    [/^<i>B'khamsa<\/i> — the third of that rank, right after the darba\. \+(\d+) to (.+)\.$/, {
      fr: function (m) { return "<i>B'khamsa</i> — la troisième du même rang, juste après la darba. +" + m[1] + ' pour ' + m[2] + '.'; },
      ar: function (m) { return '<i>بخمسة</i> — الثالثة من نفس الرقم، مباشرة بعد الضربة. +' + m[1] + ' لـ' + m[2] + '.'; }
    }],
    [/^<i>B'ashra<\/i> — and the fourth\. \+(\d+) to (.+)\.$/, {
      fr: function (m) { return "<i>B'ashra</i> — et la quatrième. +" + m[1] + ' pour ' + m[2] + '.'; },
      ar: function (m) { return '<i>بعشرة</i> — والرابعة. +' + m[1] + ' لـ' + m[2] + '.'; }
    }],
    [/^The chain on the (\d+)s is broken\.$/, {
      fr: function (m) { return 'La chaîne sur les ' + m[1] + ' est rompue.'; },
      ar: function (m) { return 'انقطعت السلسلة على الـ' + m[1] + '.'; }
    }],
    [/^<i>Missa<\/i> — the table is clear, \+(\d+)\.$/, {
      fr: function (m) { return '<i>Missa</i> — la table est vide, +' + m[1] + '.'; },
      ar: function (m) { return '<i>ميسة</i> — الطاولة فارغة، +' + m[1] + '.'; }
    }],
    [/^<b>(.+)<\/b> was sitting on a ronda of (\d+)s — a point to everybody else\.$/, {
      fr: function (m) { return '<b>' + m[1] + '</b> cachait un ronda de ' + m[2] + ' — un point pour tous les autres.'; },
      ar: function (m) { return '<b>' + m[1] + '</b> كان خابي رندة من ' + m[2] + ' — نقطة لكل الباقين.'; }
    }],
    [/^<b>(.+)<\/b> calls (TRINGA|RONDA) on the (\d+)s\.$/, {
      fr: function (m) { return '<b>' + m[1] + '</b> annonce ' + m[2] + ' sur les ' + m[3] + '.'; },
      ar: function (m) { return '<b>' + m[1] + '</b> يعلن ' + (m[2] === 'TRINGA' ? 'ترينڤة' : 'رندة') + ' على الـ' + m[3] + '.'; }
    }],
    [/^<b>(.+)<\/b> says nothing\.$/, {
      fr: function (m) { return '<b>' + m[1] + '</b> ne dit rien.'; },
      ar: function (m) { return '<b>' + m[1] + '</b> ما قال والو.'; }
    }],
    [/^\+(\d+) to (.+) for the (tringa|ronda)\.$/, {
      fr: function (m) { return '+' + m[1] + ' pour ' + m[2] + ' grâce au ' + m[3] + '.'; },
      ar: function (m) { return '+' + m[1] + ' لـ' + m[2] + ' على ' + (m[3] === 'tringa' ? 'الترينڤة' : 'الرندة') + '.'; }
    }],
    [/^<i>Bawesh<\/i> — (.+) sweeps the last (\d+)\.$/, {
      fr: function (m) { return '<i>Bawesh</i> — ' + m[1] + ' rafle les ' + m[2] + ' dernières.'; },
      ar: function (m) { return '<i>باوش</i> — ' + m[1] + ' يكنس آخر ' + m[2] + '.'; }
    }],
    [/^The (<u>[^<]+<\/u>) went back in — the table has to start with no pair and no run\.$/, {
      fr: function (m) { return 'Le ' + m[1] + ' est retourné dans le talon — la table doit commencer sans paire ni suite.'; },
      ar: function (m) { return 'رجعت ' + m[1] + ' إلى الورق — الطاولة لازم تبدأ بلا زوج ولا سلسلة.'; }
    }],
    [/^A pair of (\d+)s\. Calling pays <b>1<\/b> — but a higher pair at the table takes <i>both<\/i> points, and saying nothing keeps yours hidden\. Get caught playing it and everybody else gets a point\.$/, {
      fr: function (m) { return 'Une paire de ' + m[1] + '. L’annonce rapporte <b>1</b> — mais une paire plus haute à la table prend les <i>deux</i> points, et se taire garde la vôtre cachée. Faites-vous prendre en la jouant et tous les autres marquent un point.'; },
      ar: function (m) { return 'زوج من الـ' + m[1] + '. الإعلان يعطي <b>1</b> — لكن زوجاً أعلى على الطاولة يأخذ <i>النقطتين</i>، والسكوت يبقيها مخبّأة. وإن انكشفت وأنت تلعبها، كل الباقين يأخذون نقطة.'; }
    }],

    /* ---------------- ronda: the running log ----------------------------- */
    [/^🂠 three each — (\d+) left in the deck$/, {
      fr: function (m) { return '🂠 trois chacun — ' + m[1] + ' dans le talon'; },
      ar: function (m) { return '🂠 ثلاثة لكل واحد — بقي ' + m[1] + ' في الورق'; }
    }],
    [/^↩️ (.+) buried, the table has to start dead$/, {
      fr: function (m) { return '↩️ ' + m[1] + ' enterrée, la table doit commencer morte'; },
      ar: function (m) { return '↩️ ' + m[1] + ' دُفنت، الطاولة لازم تبدأ ميتة'; }
    }],
    [/^📣 (.+) calls (TRINGA|RONDA) on the (\d+)s — (\d+|beaten)$/, {
      fr: function (m) { return '📣 ' + m[1] + ' annonce ' + m[2] + ' sur les ' + m[3] + ' — ' + (m[4] === 'beaten' ? 'battu' : m[4]); },
      ar: function (m) { return '📣 ' + m[1] + ' يعلن ' + (m[2] === 'TRINGA' ? 'ترينڤة' : 'رندة') + ' على الـ' + m[3] + ' — ' + (m[4] === 'beaten' ? 'مغلوب' : m[4]); }
    }],
    [/^✋ (.+) plays the (\d+) and takes ([\d, ]+)( — a run)?$/, {
      fr: function (m) { return '✋ ' + m[1] + ' joue le ' + m[2] + ' et prend ' + m[3] + (m[4] ? ' — une suite' : ''); },
      ar: function (m) { return '✋ ' + m[1] + ' يلعب ' + m[2] + ' ويأخذ ' + m[3] + (m[4] ? ' — سلسلة' : ''); }
    }],
    [/^🃏 (.+) leaves the (\d+)$/, {
      fr: function (m) { return '🃏 ' + m[1] + ' laisse le ' + m[2]; },
      ar: function (m) { return '🃏 ' + m[1] + ' يترك الـ' + m[2]; }
    }],
    [/^👊 DARBA — (.+) takes the (\d+) straight back( \(\+\d+\))?$/, {
      fr: function (m) { return '👊 DARBA — ' + m[1] + ' reprend le ' + m[2] + ' aussitôt' + (m[3] || ''); },
      ar: function (m) { return '👊 ضربة — ' + m[1] + ' يسترجع الـ' + m[2] + ' فوراً' + (m[3] || ''); }
    }],
    [/^🧺 BAWESH — (.+) sweeps the last (\d+)$/, {
      fr: function (m) { return '🧺 BAWESH — ' + m[1] + ' rafle les ' + m[2] + ' dernières'; },
      ar: function (m) { return '🧺 باوش — ' + m[1] + ' يكنس آخر ' + m[2]; }
    }],
    [/^🃏 Ronda\. First to (\d+)\.$/, {
      fr: function (m) { return '🃏 Ronda. Premier à ' + m[1] + '.'; },
      ar: function (m) { return '🃏 رندة. أول من يبلغ ' + m[1] + '.'; }
    }],
    [/^☕ Makla\. Play it out and count\.$/, {
      fr: function () { return '☕ Makla. On joue tout et on compte.'; },
      ar: function () { return '☕ ماكلة. نلعبوها كاملة ونحسبو.'; }
    }],
    [/^⚠️ last three each — the deck is finished after this$/, {
      fr: function () { return '⚠️ dernières trois chacun — le talon est fini après cela'; },
      ar: function () { return '⚠️ آخر ثلاث لكل واحد — الورق ينتهي بعد هذه'; }
    }],
    [/^🧹 table cleared — no missa on the last hand$/, {
      fr: function () { return '🧹 table vidée — pas de missa sur la dernière main'; },
      ar: function () { return '🧹 الطاولة انفرغت — لا ميسة في اليد الأخيرة'; }
    }],
    [/^🔢 (.+)$/, {
      fr: function (m) { return '🔢 ' + m[1].replace(/cards/g, 'cartes'); },
      ar: function (m) { return '🔢 ' + m[1].replace(/cards/g, 'ورقة'); }
    }],
    [/^🧹 MISSA — (.+) clears the table \(\+(\d+)\)$/, {
      fr: function (m) { return '🧹 MISSA — ' + m[1] + ' vide la table (+' + m[2] + ')'; },
      ar: function (m) { return '🧹 ميسة — ' + m[1] + ' يفرّغ الطاولة (+' + m[2] + ')'; }
    }],
    [/^🔗 the chain on the (\d+) is broken$/, {
      fr: function (m) { return '🔗 la chaîne sur les ' + m[1] + ' est rompue'; },
      ar: function (m) { return '🔗 انقطعت السلسلة على الـ' + m[1]; }
    }],
    [/^🤐 (.+) says nothing$/, {
      fr: function (m) { return '🤐 ' + m[1] + ' ne dit rien'; },
      ar: function (m) { return '🤐 ' + m[1] + ' ما قال والو'; }
    }],
    [/^👀 (.+) was sitting on a ronda of (\d+)s — a point to everybody else$/, {
      fr: function (m) { return '👀 ' + m[1] + ' cachait un ronda de ' + m[2] + ' — un point pour tous les autres'; },
      ar: function (m) { return '👀 ' + m[1] + ' كان خابي رندة من ' + m[2] + ' — نقطة لكل الباقين'; }
    }],
    [/^👑 the (king|ace) was on the bottom — \+(\d+)$/, {
      fr: function (m) { return '👑 ' + (m[1] === 'king' ? 'le roi' : 'l’as') + ' était au fond — +' + m[2]; },
      ar: function (m) { return '👑 ' + (m[1] === 'king' ? 'الملك' : 'الآص') + ' كان في القاع — +' + m[2]; }
    }],
    [/^— round (\d+) —$/, {
      fr: function (m) { return '— manche ' + m[1] + ' —'; },
      ar: function (m) { return '— الجولة ' + m[1] + ' —'; }
    }],
    [/^🔗 (B'KHAMSA|B'ASHRA) ON THE (\d+) · TEAM (.+)$/, {
      fr: function (m) { return '🔗 ' + m[1] + ' SUR LES ' + m[2] + ' · ÉQUIPE ' + m[3]; },
      ar: function (m) { return '🔗 ' + (m[1] === "B'KHAMSA" ? 'بخمسة' : 'بعشرة') + ' على الـ' + m[2] + ' · فريق ' + m[3]; }
    }],
    [/^(🚶|🐢|⚡) pace: (teaching|calm|brisk) — (.+)$/, {
      fr: function (m) {
        var w = { teaching: 'pédagogique', calm: 'calme', brisk: 'rapide' }[m[2]];
        var d = { teaching: 'De quoi lire chaque coup deux fois.', calm: 'Un temps après chaque carte.', brisk: 'Pour ceux qui connaissent déjà.' }[m[2]];
        return m[1] + ' rythme : ' + w + ' — ' + d;
      },
      ar: function (m) {
        var w = { teaching: 'تعليمي', calm: 'هادئ', brisk: 'سريع' }[m[2]];
        var d = { teaching: 'وقت كافٍ لقراءة كل حركة مرتين.', calm: 'وقفة بعد كل ورقة.', brisk: 'لمن يعرف اللعبة.' }[m[2]];
        return m[1] + ' الإيقاع: ' + w + ' — ' + d;
      }
    }],
    [/^SCORES · PLAYING TO (\d+)$/, {
      fr: function (m) { return 'SCORES · JUSQU’À ' + m[1]; },
      ar: function (m) { return 'النقاط · حتى ' + m[1]; }
    }]
  ];

  root.CyberGameI18N = { dict: dict, patterns: patterns };
})(typeof window !== 'undefined' ? window : this);
