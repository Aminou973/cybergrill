/* ==========================================================================
   CyberGrill — the long-form text: UNO rulebook, scoring modes, house rules,
   cup formats, boot lines. Kept apart from the label dictionary because these
   are picked directly by the render code rather than swapped in the DOM.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = (root.CyberI18N = root.CyberI18N || {}).prose = root.CyberI18N.prose || {};

  /* ------------------------------------------------------------ boot lines */
  P.boot = {
    fr: [
      ['DÉMARRAGE DE CYBERGRILL OS v3.0', 'OK'],
      ['CHARGEMENT DES MODULES UNO + DOMINOS', 'OK'],
      ['SYNCHRONISATION FC25 / EFOOTBALL', 'OK'],
      ['CALIBRAGE DES RAQUETTES TOPSPIN 2K', 'OK'],
      ['MONTAGE DU MOTEUR DE TOURNOI', 'OK'],
      ['ÉTAT DE L’ARÈNE', 'PRÊT']
    ],
    ar: [
      ['تشغيل نظام سايبرغريل v3.0', 'تم'],
      ['تحميل وحدات أونو والدومينو', 'تم'],
      ['مزامنة خوادم FC25 و إي فوتبول', 'تم'],
      ['معايرة مضارب توب سبين', 'تم'],
      ['تشغيل محرّك البطولات', 'تم'],
      ['حالة الحلبة', 'جاهزة']
    ]
  };

  /* --------------------------------------------------------- UNO modes */
  P.unoModes = {
    fr: [
      { id: 'placement', icon: '⚡', name: 'POINTS DE PLACEMENT', tag: 'RAPIDE',
        desc: 'Ce que vous utilisez déjà. On clique les joueurs dans l’ordre d’arrivée, le gagnant prend 10, puis 6 / 3 / 1. Aucun comptage de cartes, aucun calcul, la manche suivante démarre en cinq secondes. Alimente directement le classement CyberGrill.' },
      { id: 'official', icon: '📕', name: 'RÈGLE OFFICIELLE — COURSE VERS 500', tag: 'RÉELLE',
        desc: 'Les règles Mattel. À la fin de chaque manche, le gagnant empoche la valeur de toutes les cartes restées dans les mains des autres. Les cartes chiffrées valent leur valeur faciale, Passe / Inversion / +2 valent 20 chacune, les Jokers et +4 valent 50. Le premier au total visé remporte la session.' },
      { id: 'both', icon: '🔥', name: 'LES DEUX À LA FOIS', tag: 'COMPLET',
        desc: 'On compte les cartes comme dans le vrai jeu, et l’ordre d’arrivée est déduit automatiquement de celui qui avait le moins de points en main. Vous obtenez la course vers 500 et le classement CyberGrill en une seule saisie.' }
    ],
    ar: [
      { id: 'placement', icon: '⚡', name: 'نقاط الترتيب', tag: 'سريع',
        desc: 'ما تستعملونه حالياً. اضغط على اللاعبين حسب ترتيب الوصول، الفائز يأخذ 10 ثم 6 / 3 / 1. بلا عدّ أوراق ولا حساب، والجولة التالية تبدأ خلال خمس ثوانٍ. يغذّي ترتيب سايبرغريل مباشرة.' },
      { id: 'official', icon: '📕', name: 'القاعدة الرسمية — السباق إلى 500', tag: 'رسمي',
        desc: 'قواعد ماتيل. بعد كل جولة يكسب الفائز مجموع قيمة الأوراق الباقية في أيدي الجميع. الأوراق الرقمية بقيمتها، وأوراق التوقيف والعكس و+2 بعشرين نقطة لكل واحدة، والجوكر و+4 بخمسين. أول من يبلغ الهدف يفوز بالجلسة.' },
      { id: 'both', icon: '🔥', name: 'الاثنان معاً', tag: 'كامل',
        desc: 'تُحسب الأوراق كما في اللعبة الحقيقية، ويُستنتج ترتيب الوصول تلقائياً من صاحب أقل النقاط المتبقية. تحصل على السباق إلى 500 وعلى ترتيب سايبرغريل من إدخال واحد.' }
    ]
  };

  /* ------------------------------------------------------- house rules */
  P.house = {
    fr: {
      stack: ['EMPILEMENT', 'Répondre à un +2 par un +2 (ou à un +4 par un +4) et refiler toute la pile au suivant. Pas dans les règles officielles — Mattel a confirmé que celle-ci est inventée.'],
      jumpIn: ['SAUT DE TOUR', 'Vous avez exactement la même carte (même couleur et même chiffre) que celle qui vient d’être jouée ? Posez-la hors de votre tour et le jeu repart de vous.'],
      seven0: ['7-0', 'Jouez un 7 et échangez votre main avec le joueur de votre choix. Jouez un 0 et tout le monde passe sa main dans le sens du jeu. Le chaos.'],
      drawUntil: ['PIOCHER JUSQU’À POUVOIR JOUER', 'Vous ne pouvez pas jouer ? Piochez jusqu’à trouver. La règle officielle dit une seule carte, puis vous passez.'],
      noBluff: ['+4 SANS BLUFF', 'Le +4 se joue quand vous voulez, sans contestation possible. Cela supprime la meilleure règle du jeu, mais c’est plus rapide.'],
      randomDir: ['SENS DE DÉPART ALÉATOIRE', 'Le tirage décide aussi du sens horaire ou anti-horaire au lieu de toujours commencer dans le sens horaire.']
    },
    ar: {
      stack: ['التكديس', 'ترد على +2 بـ +2 (أو على +4 بـ +4) وتمرّر الكومة كلها للاعب التالي. ليست من القواعد الرسمية — ماتيل أكّدت أنها قاعدة مخترعة.'],
      jumpIn: ['القفز في الدور', 'تملك نفس الورقة تماماً (نفس اللون ونفس الرقم) التي لُعبت للتو؟ ألقها خارج دورك ويكمل اللعب منك.'],
      seven0: ['٧-٠', 'العب ٧ وبدّل يدك مع أي لاعب. العب ٠ ويمرّر الجميع أيديهم في اتجاه اللعب. فوضى كاملة.'],
      drawUntil: ['اسحب حتى تستطيع اللعب', 'لا تستطيع اللعب؟ اسحب حتى تجد ورقة صالحة. القاعدة الرسمية تقول ورقة واحدة ثم ينتهي دورك.'],
      noBluff: ['+4 بلا خداع', 'يمكن لعب ورقة +4 متى شئت دون اعتراض. هذا يلغي أفضل قاعدة في اللعبة، لكنه أسرع.'],
      randomDir: ['اتجاه بداية عشوائي', 'القرعة تحدّد أيضاً الاتجاه مع أو عكس عقارب الساعة بدل البدء دائماً مع عقارب الساعة.']
    }
  };

  /* ----------------------------------------------------------- rulebook */
  P.rules = {
    fr: [
      ['🎴 MISE EN PLACE & DISTRIBUTION',
       '<p>De 2 à 10 joueurs. Un jeu complet compte <b>108 cartes</b>.</p>' +
       '<p>Chacun tire une carte — <b>le plus haut chiffre distribue</b> (c’est exactement ce que fait le bouton de tirage ci-dessus). Le donneur mélange et donne <b class="k">7 cartes</b> à chaque joueur.</p>' +
       '<p>Le reste forme la <b>pioche</b>. On retourne la carte du dessus pour commencer la <b>défausse</b>.</p>' +
       '<p>Le jeu commence par le joueur situé <b class="k">à gauche du donneur</b> et tourne dans le sens horaire.</p>'],
      ['▶️ VOTRE TOUR',
       '<p>Il faut poser une carte qui correspond à celle du dessus par <b class="k">couleur</b>, par <b class="k">chiffre</b> ou par <b class="k">symbole</b>. Un Joker se joue à tout moment.</p>' +
       '<p>Exemple : sur un <b>7 rouge</b> vous pouvez poser n’importe quelle carte rouge, n’importe quel 7 de n’importe quelle couleur, ou un Joker.</p>' +
       '<p>Vous ne pouvez pas jouer ? <b>Piochez une carte.</b> Si elle est jouable, vous pouvez la poser immédiatement, sinon votre tour est terminé. On ne pioche jamais plus d’une carte — c’est une règle maison.</p>'],
      ['💥 LES CARTES ACTION',
       '<ul>' +
       '<li><b class="k">PASSE</b> — le joueur suivant saute son tour.</li>' +
       '<li><b class="k">INVERSION</b> — le sens du jeu s’inverse. À 2 joueurs elle agit comme un Passe.</li>' +
       '<li><b class="k">+2</b> — le joueur suivant pioche 2 cartes et perd son tour.</li>' +
       '<li><b class="k">JOKER</b> — vous annoncez la couleur qui continue. Jouable à tout moment.</li>' +
       '<li><b class="k">JOKER +4</b> — vous annoncez la couleur, le suivant pioche 4 cartes et perd son tour.</li>' +
       '</ul>' +
       '<p class="warn">Le Joker +4 n’est légal que si vous n’avez <b>aucune carte de la couleur en cours</b>. Vous pouvez tout de même bluffer.</p>'],
      ['🕵️ CONTESTER UN JOKER +4',
       '<p>Si vous pensez que le +4 était un bluff, <b>contestez avant de piocher</b>. Le joueur doit vous montrer sa main en privé.</p>' +
       '<ul>' +
       '<li>Il bluffait → <b class="k">c’est lui</b> qui pioche les 4 cartes à votre place.</li>' +
       '<li>Il était en règle → <b class="k">vous</b> piochez <b>6</b> cartes : les 4 d’origine plus 2 pour l’accusation.</li>' +
       '</ul>' +
       '<p>La meilleure règle du jeu. Ne la désactivez pas.</p>'],
      ['🗣️ ANNONCER UNO',
       '<p>Quand vous posez votre <b>avant-dernière</b> carte, vous devez crier <b class="k">UNO !</b></p>' +
       '<p>Si un autre joueur vous surprend avant que le suivant n’ait commencé son tour, vous piochez <b class="warn">4 cartes</b>. Une fois le tour suivant entamé, vous êtes tranquille.</p>'],
      ['🏁 FIN DE LA MANCHE',
       '<p>La manche s’arrête dès qu’un joueur pose sa dernière carte.</p>' +
       '<p>Si cette dernière carte est un <b>+2</b> ou un <b>Joker +4</b>, le joueur suivant pioche quand même ces cartes et elles <b>comptent dans le score</b>.</p>' +
       '<p>Si la pioche s’épuise avant que quelqu’un ait terminé, on mélange la défausse (en gardant la carte du dessus) et on continue.</p>'],
      ['🧮 LE COMPTE — CE QUE VAUT CHAQUE CARTE',
       '<p>Le gagnant récupère la valeur de <b>toutes les cartes restées dans les mains des autres</b>.</p>' +
       '<table class="valTable"><tr><th>CARTE</th><th style="text-align:right">POINTS</th></tr>' +
       '<tr><td>Cartes chiffrées 0–9</td><td>valeur faciale</td></tr>' +
       '<tr><td>Passe</td><td>20</td></tr><tr><td>Inversion</td><td>20</td></tr><tr><td>+2</td><td>20</td></tr>' +
       '<tr><td>Joker</td><td>50</td></tr><tr><td>Joker +4</td><td>50</td></tr></table>' +
       '<p>Le premier joueur à <b class="k">500</b> remporte la session. Soirée plus courte ? Baissez l’objectif à 300 ou 200 avec les boutons de la colonne du milieu.</p>' +
       '<p style="color:var(--dim)">Variante officielle : au lieu que le gagnant encaisse, chaque <b>perdant</b> garde la valeur de sa main comme points de pénalité et le <b>total le plus bas</b> l’emporte dès que quelqu’un dépasse 500. Même calcul, sens inverse.</p>'],
      ['🎬 LA TOUTE PREMIÈRE CARTE',
       '<p>La carte retournée pour commencer la défausse s’applique immédiatement :</p>' +
       '<ul>' +
       '<li><b class="k">Joker</b> — le premier joueur choisit la couleur.</li>' +
       '<li><b class="k">Joker +4</b> — on la remet dans le paquet et on en retourne une autre.</li>' +
       '<li><b class="k">+2</b> — le premier joueur pioche 2 cartes et passe son tour.</li>' +
       '<li><b class="k">Inversion</b> — le sens s’inverse, donc le <b>donneur</b> joue en premier.</li>' +
       '<li><b class="k">Passe</b> — le premier joueur saute son tour.</li>' +
       '</ul>'],
      ['👥 UNO À DEUX JOUEURS',
       '<p>L’Inversion fonctionne exactement comme un Passe.</p>' +
       '<p>Vous posez un Passe et vous rejouez immédiatement.</p>' +
       '<p>Pareil pour un +2 : l’autre pioche 2 cartes et vous rejouez.</p>']
    ],

    ar: [
      ['🎴 التحضير والتوزيع',
       '<p>من ٢ إلى ١٠ لاعبين. الرزمة الكاملة فيها <b>١٠٨ ورقة</b>.</p>' +
       '<p>كل واحد يسحب ورقة — <b>صاحب أكبر رقم هو الموزّع</b> (وهذا بالضبط ما يفعله زر السحب في الأعلى). الموزّع يخلط ويعطي <b class="k">٧ أوراق</b> لكل لاعب.</p>' +
       '<p>الباقي يصبح <b>كومة السحب</b>. اقلب الورقة العليا لتبدأ <b>كومة الرمي</b>.</p>' +
       '<p>يبدأ اللعب من اللاعب الذي <b class="k">على يسار الموزّع</b> ويدور مع عقارب الساعة.</p>'],
      ['▶️ دورك',
       '<p>عليك أن تطابق الورقة العليا في <b class="k">اللون</b> أو <b class="k">الرقم</b> أو <b class="k">الرمز</b>. أما الجوكر فيُلعب في أي وقت.</p>' +
       '<p>مثال: على <b>٧ أحمر</b> يمكنك لعب أي ورقة حمراء، أو أي ٧ من أي لون، أو جوكر.</p>' +
       '<p>لا تستطيع اللعب؟ <b>اسحب ورقة واحدة.</b> إن كانت صالحة يمكنك لعبها فوراً، وإلا انتهى دورك. لا تسحب أكثر من ورقة — تلك قاعدة بيت.</p>'],
      ['💥 أوراق الحركة',
       '<ul>' +
       '<li><b class="k">التوقيف</b> — اللاعب التالي يفقد دوره.</li>' +
       '<li><b class="k">العكس</b> — يتغيّر اتجاه اللعب. مع لاعبَين اثنين تعمل كورقة توقيف.</li>' +
       '<li><b class="k">+٢</b> — التالي يسحب ورقتين ويفقد دوره.</li>' +
       '<li><b class="k">الجوكر</b> — أنت تسمّي اللون الذي يكمل به اللعب. يُلعب في أي دور.</li>' +
       '<li><b class="k">الجوكر +٤</b> — تسمّي اللون، والتالي يسحب أربع أوراق ويفقد دوره.</li>' +
       '</ul>' +
       '<p class="warn">الجوكر +٤ لا يجوز إلا إذا لم تكن تملك <b>أي ورقة من لون الورقة الحالية</b>. ومع ذلك يمكنك الخداع.</p>'],
      ['🕵️ الاعتراض على الجوكر +٤',
       '<p>إن ظننت أن الـ+٤ كان خداعاً، <b>اعترض قبل أن تسحب</b>. على اللاعب أن يريك يده سرّاً.</p>' +
       '<ul>' +
       '<li>كان يخادع → <b class="k">هو</b> من يسحب الأربع بدلاً منك.</li>' +
       '<li>كان صادقاً → <b class="k">أنت</b> تسحب <b>ست</b> أوراق: الأربع الأصلية وورقتان عقوبة الاتهام الباطل.</li>' +
       '</ul>' +
       '<p>أفضل قاعدة في اللعبة. لا تلغوها.</p>'],
      ['🗣️ قول «أونو»',
       '<p>عندما تلعب ورقتك <b>قبل الأخيرة</b> عليك أن تصرخ <b class="k">أونو!</b></p>' +
       '<p>إذا أمسكك لاعب آخر قبل أن يبدأ التالي دوره، تسحب <b class="warn">أربع أوراق</b>. وبعد بداية الدور التالي تصبح في أمان.</p>'],
      ['🏁 نهاية الجولة',
       '<p>تنتهي الجولة لحظة أن يلعب أحدهم ورقته الأخيرة.</p>' +
       '<p>إذا كانت تلك الورقة <b>+٢</b> أو <b>جوكر +٤</b>، فاللاعب التالي يسحبها رغم ذلك وتُحتسب <b>ضمن النقاط</b>.</p>' +
       '<p>إذا نفدت كومة السحب قبل أن ينهي أحد أوراقه، تُخلط كومة الرمي (مع إبقاء الورقة العليا) ويستمر اللعب.</p>'],
      ['🧮 الحساب — قيمة كل ورقة',
       '<p>الفائز يجمع قيمة <b>كل ورقة بقيت في أيدي الآخرين</b>.</p>' +
       '<table class="valTable"><tr><th>الورقة</th><th style="text-align:right">النقاط</th></tr>' +
       '<tr><td>الأوراق الرقمية ٠–٩</td><td>قيمتها</td></tr>' +
       '<tr><td>التوقيف</td><td>٢٠</td></tr><tr><td>العكس</td><td>٢٠</td></tr><tr><td>+٢</td><td>٢٠</td></tr>' +
       '<tr><td>الجوكر</td><td>٥٠</td></tr><tr><td>الجوكر +٤</td><td>٥٠</td></tr></table>' +
       '<p>أول من يبلغ <b class="k">٥٠٠</b> يفوز بالجلسة. سهرة أقصر؟ خفّض الهدف إلى ٣٠٠ أو ٢٠٠ من أزرار العمود الأوسط.</p>' +
       '<p style="color:var(--dim)">نسخة رسمية بديلة: بدل أن يجمع الفائز، يحتفظ كل <b>خاسر</b> بقيمة يده كنقاط عقوبة، ويفوز صاحب <b>أقل مجموع</b> حين يتجاوز أحدهم ٥٠٠. الحساب نفسه لكن بالاتجاه المعاكس.</p>'],
      ['🎬 الورقة الأولى',
       '<p>الورقة التي تُقلب لبدء كومة الرمي يسري مفعولها فوراً:</p>' +
       '<ul>' +
       '<li><b class="k">جوكر</b> — اللاعب الأول يختار اللون.</li>' +
       '<li><b class="k">جوكر +٤</b> — تُعاد إلى الرزمة وتُقلب غيرها.</li>' +
       '<li><b class="k">+٢</b> — اللاعب الأول يسحب ورقتين ويفقد دوره.</li>' +
       '<li><b class="k">العكس</b> — ينقلب الاتجاه، فيلعب <b>الموزّع</b> أولاً.</li>' +
       '<li><b class="k">التوقيف</b> — اللاعب الأول يفقد دوره.</li>' +
       '</ul>'],
      ['👥 أونو بلاعبَين',
       '<p>ورقة العكس تعمل تماماً كورقة التوقيف.</p>' +
       '<p>تلعب ورقة توقيف فتلعب دوراً آخر مباشرة.</p>' +
       '<p>ونفس الشيء مع +٢: الآخر يسحب ورقتين وتلعب أنت من جديد.</p>']
    ]
  };

  /* -------------------------------------------------------- cup formats */
  P.cupFormats = {
    fr: {
      ucl: ['⭐ PHASE DE LIGUE + PHASE FINALE',
        function (p) {
          return p.ok
            ? 'Un seul classement, tout le monde joue contre tout le monde une fois. ' +
              (p.direct === 1 ? 'Le 1er file directement en ' : 'Les ' + p.direct + ' premiers filent directement en ') +
              p.roundName.toLowerCase() + ', les ' + p.playoff +
              ' suivants s’affrontent en barrage' +
              (p.out > 0 ? (p.out === 1 ? ', et le dernier rentre à la maison' : ', et les ' + p.out + ' derniers rentrent à la maison') : '') + '.'
            : 'Il faut au moins 3 participants pour la phase de ligue';
        }],
      groups: ['PHASE DE GROUPES + PHASE FINALE',
        function (p) {
          return p.n < 2 ? 'Il faut au moins 2 participants'
            : p.groups + (p.groups === 1 ? ' groupe' : ' groupes') + ' → les 2 premiers qualifiés → ' +
              (p.groups === 1 ? 'finale directe' : 'demi-finales puis finale');
        }],
      knockout: ['ÉLIMINATION DIRECTE', function () { return 'Tableau à élimination directe, aucune seconde chance.'; }],
      league: ['CHAMPIONNAT SIMPLE (SANS PHASE FINALE)', function () { return 'Tout le monde joue contre tout le monde une fois, le premier du classement gagne — pas de phase finale.'; }]
    },
    ar: {
      ucl: ['⭐ مرحلة الدوري + الإقصائيات',
        function (p) {
          return p.ok
            ? 'جدول واحد، والجميع يلعب ضد الجميع مرة واحدة. ' +
              (p.direct === 1 ? 'المتصدّر يتأهل مباشرة إلى ' : 'أول ' + p.direct + ' يتأهلون مباشرة إلى ') +
              p.roundName + '، و' + p.playoff + ' بعدهم يخوضون الملحق' +
              (p.out > 0 ? (p.out === 1 ? '، والأخير يخرج من المنافسة' : '، وآخر ' + p.out + ' يخرجون من المنافسة') : '') + '.'
            : 'يلزم ٣ مشاركين على الأقل لمرحلة الدوري';
        }],
      groups: ['المجموعات + الإقصائيات',
        function (p) {
          return p.n < 2 ? 'يلزم مشاركان على الأقل'
            : p.groups + (p.groups === 1 ? ' مجموعة' : ' مجموعات') + ' → يتأهل الأول والثاني → ' +
              (p.groups === 1 ? 'نهائي مباشر' : 'نصف النهائي ثم النهائي');
        }],
      knockout: ['إقصاء مباشر', function () { return 'جدول إقصائي من مباراة واحدة، بلا فرصة ثانية.'; }],
      league: ['دوري بسيط (بلا إقصائيات)', function () { return 'الجميع يلعب ضد الجميع مرة واحدة، ومتصدّر الجدول يفوز — بلا إقصائيات.'; }]
    }
  };

  /* ------------------------------------------------ cup game-mode options */
  P.cupGames = {
    fr: {
      mixed: ['⚽🥅 MIXTE', 'Choisissez FC 25 ou eFootball match par match — chacun joue ce qu’il préfère'],
      fc25: ['⚽ FC 25 UNIQUEMENT', 'Tous les matchs de la coupe sur FC 25'],
      efoot: ['🥅 EFOOTBALL UNIQUEMENT', 'Tous les matchs de la coupe sur eFootball']
    },
    ar: {
      mixed: ['⚽🥅 مختلط', 'اختر FC 25 أو إي فوتبول لكل مباراة — كلٌّ يلعب ما يفضّله'],
      fc25: ['⚽ FC 25 فقط', 'كل مباريات الكأس على FC 25'],
      efoot: ['🥅 إي فوتبول فقط', 'كل مباريات الكأس على إي فوتبول']
    }
  };

  /* ------------------------------------------------------------- notices */
  P.notes = {
    fr: {
      cupNote: 'LIGUE / GROUPE : VICTOIRE 3 · NUL 1 &nbsp;·&nbsp; LES MATCHS À ÉLIMINATION SE JOUENT AUX TIRS AU BUT EN CAS D’ÉGALITÉ &nbsp;·&nbsp; TOUS LES MATCHS DE COUPE ALIMENTENT AUSSI LE CLASSEMENT GÉNÉRAL',
      houseNote: '⚠️ Aucune de ces règles n’est officielle. Mettez-vous d’accord <b>avant</b> la première distribution, pas après que quelqu’un vous ait empilé quatre +2.',
      drawIntro: 'Chacun tire une carte. <b>Le plus haut chiffre distribue.</b><br>Les égalités sont rejouées automatiquement.',
      exportNote: 'Déposez le JSON dans <b>data/nights/</b> puis poussez — l’Action reconstruit le classement de la saison, régénère cette carte et met à jour le README toute seule.',
      dealLine: function (d, f, dir) {
        return '🎴 <b>' + d + '</b> distribue 7 cartes à chacun, puis retourne la carte du dessus.<br>' +
          '▶️ <span class="lime">' + f + '</span> commence — le siège à ' + (dir > 0 ? 'gauche' : 'droite') + ' du donneur.<br>' +
          (dir > 0 ? '↻ Le jeu tourne dans le <b>sens horaire</b>' : '↺ Le jeu tourne dans le <b>sens anti-horaire</b>') +
          ' jusqu’à ce que quelqu’un pose une Inversion.';
      }
    },
    ar: {
      cupNote: 'الدوري / المجموعات: فوز ٣ · تعادل ١ &nbsp;·&nbsp; مباريات الإقصاء تُحسم بركلات الترجيح عند التعادل &nbsp;·&nbsp; كل مباريات الكأس تغذّي الترتيب العام أيضاً',
      houseNote: '⚠️ لا شيء من هذه القواعد رسمي. اتفقوا عليها <b>قبل</b> أول توزيع، لا بعد أن يكدّس أحدهم أربع أوراق +٢ عليك.',
      drawIntro: 'كل واحد يسحب ورقة. <b>صاحب أكبر رقم يوزّع.</b><br>وتُعاد القرعة تلقائياً عند التساوي.',
      exportNote: 'ضع ملف JSON في <b>data/nights/</b> وادفعه — سيعيد الـ Action بناء جدول الموسم وتوليد هذه البطاقة وتحديث الـ README وحده.',
      dealLine: function (d, f, dir) {
        return '🎴 <b>' + d + '</b> يوزّع ٧ أوراق لكل لاعب ثم يقلب الورقة العليا.<br>' +
          '▶️ <span class="lime">' + f + '</span> يبدأ — المقعد الذي على ' + (dir > 0 ? 'يسار' : 'يمين') + ' الموزّع.<br>' +
          (dir > 0 ? '↻ اللعب يدور <b>مع عقارب الساعة</b>' : '↺ اللعب يدور <b>عكس عقارب الساعة</b>') +
          ' حتى يلعب أحدهم ورقة العكس.';
      }
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
