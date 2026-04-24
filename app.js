(function() {
  // === The real standard genetic code ===
  // All 64 codons mapping DNA triplets to amino acid one-letter codes, * = stop.
  const CODON_TO_LETTER = {
    TTT:'F', TTC:'F', TTA:'L', TTG:'L',
    CTT:'L', CTC:'L', CTA:'L', CTG:'L',
    ATT:'I', ATC:'I', ATA:'I', ATG:'M',
    GTT:'V', GTC:'V', GTA:'V', GTG:'V',
    TCT:'S', TCC:'S', TCA:'S', TCG:'S',
    CCT:'P', CCC:'P', CCA:'P', CCG:'P',
    ACT:'T', ACC:'T', ACA:'T', ACG:'T',
    GCT:'A', GCC:'A', GCA:'A', GCG:'A',
    TAT:'Y', TAC:'Y', TAA:'*', TAG:'*',
    CAT:'H', CAC:'H', CAA:'Q', CAG:'Q',
    AAT:'N', AAC:'N', AAA:'K', AAG:'K',
    GAT:'D', GAC:'D', GAA:'E', GAG:'E',
    TGT:'C', TGC:'C', TGA:'*', TGG:'W',
    CGT:'R', CGC:'R', CGA:'R', CGG:'R',
    AGT:'S', AGC:'S', AGA:'R', AGG:'R',
    GGT:'G', GGC:'G', GGA:'G', GGG:'G'
  };

  // Reverse map: amino acid letter -> list of synonymous codons
  const LETTER_TO_CODONS = {};
  Object.keys(CODON_TO_LETTER).forEach(codon => {
    const aa = CODON_TO_LETTER[codon];
    if (!LETTER_TO_CODONS[aa]) LETTER_TO_CODONS[aa] = [];
    LETTER_TO_CODONS[aa].push(codon);
  });

  // Full amino acid names for the reference table
  const AA_INFO = {
    A: { name: 'Ala', full: 'Alanine' },
    C: { name: 'Cys', full: 'Cysteine' },
    D: { name: 'Asp', full: 'Aspartate' },
    E: { name: 'Glu', full: 'Glutamate' },
    F: { name: 'Phe', full: 'Phenylalanine' },
    G: { name: 'Gly', full: 'Glycine' },
    H: { name: 'His', full: 'Histidine' },
    I: { name: 'Ile', full: 'Isoleucine' },
    K: { name: 'Lys', full: 'Lysine' },
    L: { name: 'Leu', full: 'Leucine' },
    M: { name: 'Met', full: 'Methionine · Start' },
    N: { name: 'Asn', full: 'Asparagine' },
    P: { name: 'Pro', full: 'Proline' },
    Q: { name: 'Gln', full: 'Glutamine' },
    R: { name: 'Arg', full: 'Arginine' },
    S: { name: 'Ser', full: 'Serine' },
    T: { name: 'Thr', full: 'Threonine' },
    V: { name: 'Val', full: 'Valine' },
    W: { name: 'Trp', full: 'Tryptophan' },
    Y: { name: 'Tyr', full: 'Tyrosine' },
    '*': { name: 'STOP', full: 'Terminator' }
  };

  // Display order: hydrophobic → polar → charged → special → stops
  const AA_ORDER = ['M','A','V','L','I','F','W','P','G','S','T','C','Y','N','Q','H','K','R','D','E','*'];

  // Encode a word: pick a random synonymous codon for each amino acid letter
  function encodeWord(word) {
    return word.split('').map(c => {
      const options = LETTER_TO_CODONS[c];
      if (!options) return 'NNN';
      return options[Math.floor(Math.random() * options.length)];
    }).join('');
  }

  // Words spellable using only standard amino-acid one-letter codes (ACDEFGHIKLMNPQRSTVWY)
  const WORDS = [
    'DNA', 'GENE', 'LIFE', 'CELL', 'CAFE', 'FACE', 'MEAL', 'ACID',
    'HEAL', 'LEAF', 'HEAD', 'LIVE', 'FIRE', 'MIND', 'RAIN', 'SAND',
    'STAR', 'PLAN', 'GRAIN', 'HEART', 'SMART', 'CHAIN', 'PAINT'
  ];
  const BASES = ['A', 'T', 'G', 'C'];
  const MAX_ATTEMPTS = 3;

  let state = {
    phase: 'intro',
    word: null,
    originalDNA: '',
    mutatedDNA: '',
    mutation: null,
    round: 1,
    totalScore: 0,
    attemptsLeft: MAX_ATTEMPTS,
    solved: false
  };

  const gameArea = document.getElementById('game-area');
  const scoreEl = document.getElementById('score-value');
  const roundEl = document.getElementById('round-label');
  const phases = document.querySelectorAll('.phase');

  function initFloatingBases() {
    const container = document.getElementById('floating-bases');
    const colors = { A: '#4ade80', T: '#fb923c', G: '#60a5fa', C: '#f472b6' };
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'floating-base';
      const base = BASES[Math.floor(Math.random() * 4)];
      el.textContent = base;
      el.style.color = colors[base];
      el.style.left = Math.random() * 100 + '%';
      el.style.fontSize = (12 + Math.random() * 18) + 'px';
      el.style.animationDelay = (Math.random() * 15) + 's';
      el.style.animationDuration = (10 + Math.random() * 15) + 's';
      container.appendChild(el);
    }
  }

  function updatePhaseIndicator() {
    const phaseOrder = ['encode', 'mutate', 'decode', 'reveal'];
    const currentIdx = phaseOrder.indexOf(state.phase);
    const phasesEl = document.getElementById('phases');
    const scorePanel = document.querySelector('.score-panel');
    const isIntro = state.phase === 'intro';
    phasesEl.style.display = isIntro ? 'none' : 'grid';
    if (scorePanel) scorePanel.style.visibility = isIntro ? 'hidden' : 'visible';
    phases.forEach((p, i) => {
      p.classList.remove('active', 'complete');
      if (i < currentIdx) p.classList.add('complete');
      else if (i === currentIdx) p.classList.add('active');
    });
  }

  function mutate(dna) {
    const pos = Math.floor(Math.random() * dna.length);
    const oldB = dna[pos];
    let newB;
    do { newB = BASES[Math.floor(Math.random() * 4)]; } while (newB === oldB);
    const mutated = dna.slice(0, pos) + newB + dna.slice(pos + 1);
    const description = 'Substitution at position ' + (pos + 1) + ': ' + oldB + ' → ' + newB;
    return { type: 'substitution', pos: pos, mutated: mutated, description: description };
  }

  function translateDNA(dna) {
    const out = [];
    for (let i = 0; i < dna.length; i += 3) {
      const c = dna.slice(i, i + 3);
      if (c.length < 3) {
        out.push({ codon: c, letter: '?', isPartial: true });
        continue;
      }
      const aa = CODON_TO_LETTER[c] || '?';
      out.push({ codon: c, letter: aa, isStop: aa === '*' });
      if (aa === '*') break; // Ribosome halts at stop codon — stop translation
    }
    return out;
  }

  function renderDNA(dna, mutPos, highlight) {
    let html = '';
    for (let i = 0; i < dna.length; i += 3) {
      const codon = dna.slice(i, i + 3);
      const codonHtml = codon.split('').map((b, j) => {
        const cls = 'base base-' + b.toLowerCase();
        if (highlight && (i + j) === mutPos) {
          return '<span class="base-changed">' + b + '</span>';
        }
        return '<span class="' + cls + '">' + b + '</span>';
      }).join('');
      html += '<span class="codon-group">' + codonHtml + '</span>';
    }
    return html;
  }

  // Confetti
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let confettiParticles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function launchConfetti(originX, originY) {
    const colors = ['#4ade80', '#fb923c', '#60a5fa', '#f472b6', '#fbbf24', '#06b6d4'];
    const count = 140;
    const cx = originX !== undefined ? originX : canvas.width / 2;
    const cy = originY !== undefined ? originY : canvas.height / 3;

    const wasEmpty = confettiParticles.length === 0;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const velocity = 6 + Math.random() * 8;
      confettiParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 4,
        gravity: 0.25,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: 0.008 + Math.random() * 0.008,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
      });
    }
    if (wasEmpty) requestAnimationFrame(animateConfetti);
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles = confettiParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > canvas.height + 50) return false;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    });
    if (confettiParticles.length > 0) requestAnimationFrame(animateConfetti);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function animateScore(from, to) {
    const duration = 900;
    const start = performance.now();
    scoreEl.classList.add('bump');
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      scoreEl.textContent = val;
      if (t < 1) requestAnimationFrame(step);
      else setTimeout(() => scoreEl.classList.remove('bump'), 400);
    }
    requestAnimationFrame(step);
  }

  function shakeGameArea() {
    gameArea.classList.remove('shake');
    void gameArea.offsetWidth;
    gameArea.classList.add('shake');
    setTimeout(() => gameArea.classList.remove('shake'), 500);
  }

  // Build the HTML for the grouped codon reference (used in both the floating panel and inline refs)
  function buildCodonGroups() {
    return AA_ORDER.map(aa => {
      const info = AA_INFO[aa];
      const codons = LETTER_TO_CODONS[aa] || [];
      const isStop = aa === '*';
      const codonsHtml = codons.map(codon =>
        '<span class="aa-codon' + (isStop ? ' stop' : '') + '">' +
          codon.split('').map(b => '<span class="base base-' + b.toLowerCase() + '">' + b + '</span>').join('') +
        '</span>'
      ).join('');
      return '<div class="aa-group' + (isStop ? ' stop' : '') + '">' +
        '<div class="aa-header">' +
          '<span class="aa-letter">' + aa + '</span>' +
          '<span class="aa-name">' + info.name + '</span>' +
          '<span class="aa-full">' + info.full + '</span>' +
        '</div>' +
        '<div class="aa-codons">' + codonsHtml + '</div>' +
      '</div>';
    }).join('');
  }

  function renderCodonRef() {
    const grid = document.getElementById('codon-panel-grid');
    grid.innerHTML = buildCodonGroups();
  }

  // Build the inline collapsible codon reference used in-phase
  function inlineCodonRef(hint) {
    const hintHtml = hint
      ? '<div class="inline-codon-ref-hint">' + hint + '</div>'
      : '';
    return '<details class="inline-codon-ref">' +
      '<summary>' +
        '<span class="inline-codon-ref-icon">Codon reference · all 64 codons</span>' +
        '<span class="inline-codon-ref-chev">▾</span>' +
      '</summary>' +
      '<div class="inline-codon-ref-body">' +
        hintHtml +
        '<div class="inline-codon-grid">' + buildCodonGroups() + '</div>' +
      '</div>' +
    '</details>';
  }

  function initCodonFab() {
    const fab = document.getElementById('codon-fab');
    const panel = document.getElementById('codon-panel');
    let open = false;

    function toggle() {
      open = !open;
      fab.classList.toggle('open', open);
      panel.classList.toggle('open', open);
      fab.setAttribute('aria-label', open ? 'Close codon reference' : 'Open codon reference');
    }

    fab.addEventListener('click', toggle);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) toggle();
    });

    // Close when clicking outside (but not on the FAB itself)
    document.addEventListener('click', (e) => {
      if (open && !panel.contains(e.target) && !fab.contains(e.target)) toggle();
    });
  }

  function renderIntro() {
    // Pick a real worked example: word "DNA" -> codons -> back
    const exampleWord = 'DNA';
    const exampleCodons = exampleWord.split('').map(letter => {
      // Pick the first codon for each amino acid for stability
      return LETTER_TO_CODONS[letter][0];
    });

    // Genome size data: organism, size in megabases, emoji, tagline
    const genomes = [
      { name: 'E. coli',     mb: 4.6,   emoji: '🦠', label: '4.6 million', sub: 'a bacterium' },
      { name: 'Fruit fly',   mb: 143,   emoji: '🪰', label: '143 million', sub: 'Drosophila' },
      { name: 'Rice',        mb: 430,   emoji: '🌾', label: '430 million', sub: 'Oryza sativa' },
      { name: 'Strawberry',  mb: 720,   emoji: '🍓', label: '720 million', sub: 'cultivated' },
      { name: 'Chicken',     mb: 1200,  emoji: '🐔', label: '1.2 billion', sub: 'Gallus gallus' },
      { name: 'Dog',         mb: 2500,  emoji: '🐕', label: '2.5 billion', sub: 'Canis familiaris' },
      { name: 'Mouse',       mb: 2700,  emoji: '🐁', label: '2.7 billion', sub: 'Mus musculus' },
      { name: 'Cat',         mb: 2840,  emoji: '🐈', label: '2.8 billion', sub: 'Felis catus' },
      { name: 'Human',       mb: 3055,  emoji: '🧑', label: '3.1 billion', sub: 'Homo sapiens' }
    ];
    const maxMb = Math.max(...genomes.map(g => g.mb));

    const baseInfo = [
      { letter: 'A', name: 'Adenine',  pair: 'pairs with T', cls: 'a-card' },
      { letter: 'T', name: 'Thymine',  pair: 'pairs with A', cls: 't-card' },
      { letter: 'G', name: 'Guanine',  pair: 'pairs with C', cls: 'g-card' },
      { letter: 'C', name: 'Cytosine', pair: 'pairs with G', cls: 'c-card' }
    ];

    gameArea.innerHTML =
      '<div class="phase-content">' +

        // Section 1: What is DNA?
        '<div class="intro-section">' +
          '<div class="intro-eyebrow">Welcome</div>' +
          '<div class="intro-title">What is DNA?</div>' +
          '<div class="intro-prose">' +
            'DNA is the <strong>instruction manual</strong> for every living thing on Earth — from bacteria to strawberries to you. It\'s a long molecule shaped like a twisted ladder (the famous <strong>double helix</strong>) found inside almost every cell of your body. Every cell carries a complete copy.' +
          '</div>' +
          '<div class="intro-prose">' +
            'What makes DNA an instruction manual is that it stores information using a chemical alphabet. But unlike English, which uses 26 letters, DNA uses just <strong>4</strong>.' +
          '</div>' +
        '</div>' +

        // Section 2: The 4-letter code
        '<div class="intro-section">' +
          '<div class="intro-eyebrow">The alphabet of life</div>' +
          '<div class="intro-title">Just four letters: A, T, G, C</div>' +
          '<div class="intro-prose">' +
            'Each "letter" is actually a small molecule called a <strong>base</strong>. The four bases always pair up the same way — A with T, and G with C — which is why DNA forms two matching strands.' +
          '</div>' +
          '<div class="base-showcase">' +
            baseInfo.map(b =>
              '<div class="base-card ' + b.cls + '">' +
                '<div class="base-card-letter">' + b.letter + '</div>' +
                '<div class="base-card-name">' + b.name + '</div>' +
                '<div class="base-card-pair">' + b.pair + '</div>' +
              '</div>'
            ).join('') +
          '</div>' +
          '<div class="intro-prose" style="margin-top: 18px;">' +
            'Your cells read DNA in groups of <strong>three letters</strong> at a time. Each three-letter group is called a <strong>codon</strong>, and each codon means one specific amino acid — the building blocks of proteins. There are 64 possible codons (4 × 4 × 4), and they map to 20 amino acids plus 3 "stop" signals.' +
          '</div>' +
        '</div>' +

        // Section 3: Worked example - encode and decode
        '<div class="intro-section">' +
          '<div class="intro-eyebrow">Worked example</div>' +
          '<div class="intro-title">Encoding and decoding the word "' + exampleWord + '"</div>' +
          '<div class="intro-prose">' +
            'In this game, you\'ll encode short words by translating each letter into its codon, then later decode DNA back into letters. Here\'s how the word "' + exampleWord + '" works using real biology:' +
          '</div>' +
          '<div class="worked-example">' +
            '<div class="worked-step">' +
              '<div class="worked-step-num">1</div>' +
              '<div class="worked-step-body">' +
                '<div class="worked-step-label">Encoding · letters to DNA</div>' +
                '<div class="worked-step-content">' +
                  exampleWord.split('').map((l, i) =>
                    '<span class="worked-letter">' + l + '</span><span class="worked-arrow">→</span><span class="worked-codon">' +
                    exampleCodons[i].split('').map(b => '<span class="base base-' + b.toLowerCase() + '">' + b + '</span>').join('') +
                    '</span>' + (i < exampleWord.length - 1 ? '<span style="color: var(--text-muted); margin: 0 8px;">·</span>' : '')
                  ).join('') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="worked-step">' +
              '<div class="worked-step-num">2</div>' +
              '<div class="worked-step-body">' +
                '<div class="worked-step-label">Result · the full DNA sequence</div>' +
                '<div class="worked-step-content">' +
                  '<span class="dna-strand" style="display: inline-block; padding: 10px 14px; margin: 0; font-size: 16px;">' +
                    exampleCodons.join('').split('').map(b => '<span class="base base-' + b.toLowerCase() + '">' + b + '</span>').join('') +
                  '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="worked-step">' +
              '<div class="worked-step-num">3</div>' +
              '<div class="worked-step-body">' +
                '<div class="worked-step-label">Decoding · read in groups of 3</div>' +
                '<div class="worked-step-content">' +
                  exampleCodons.map((c, i) =>
                    '<span class="worked-codon">' +
                    c.split('').map(b => '<span class="base base-' + b.toLowerCase() + '">' + b + '</span>').join('') +
                    '</span><span class="worked-arrow">→</span><span class="worked-letter">' + exampleWord[i] + '</span>' +
                    (i < exampleCodons.length - 1 ? '<span style="color: var(--text-muted); margin: 0 8px;">·</span>' : '')
                  ).join('') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="intro-prose" style="margin-top: 14px; font-size: 13px;">' +
            'Most amino acids have <strong>multiple codons</strong> that code for them — so the same word can be encoded several different ways. That\'s called <em>degeneracy</em>, and it\'s one reason DNA is robust to certain mutations.' +
          '</div>' +
        '</div>' +

        // Section 4: Genome sizes
        '<div class="intro-section">' +
          '<div class="intro-eyebrow">Scale</div>' +
          '<div class="intro-title">How big are genomes?</div>' +
          '<div class="intro-prose">' +
            'A <strong>genome</strong> is all the DNA in one organism. Different species have wildly different amounts. If you printed the human genome at 10 letters per second, it would take about <strong>10 years</strong> to read it aloud. Yet a single cell holds the whole thing.' +
          '</div>' +
          '<div class="genome-chart">' +
            genomes.map(g => {
              // Use a sqrt scale so tiny genomes (E. coli at 4.6 Mb) remain visible
              // while preserving the rank order. Linear would make E. coli invisible (0.15%).
              const scaledPct = (Math.sqrt(g.mb) / Math.sqrt(maxMb)) * 100;
              return '<div class="genome-chart-row">' +
                '<div class="genome-label">' +
                  '<span class="genome-emoji">' + g.emoji + '</span>' +
                  '<span>' + g.name + '</span>' +
                '</div>' +
                '<div class="genome-bar-track">' +
                  '<div class="genome-bar-fill" style="width: ' + scaledPct.toFixed(2) + '%;"></div>' +
                '</div>' +
                '<div class="genome-value"><strong>' + g.label + '</strong></div>' +
              '</div>';
            }).join('') +
            '<div class="genome-chart-note">' +
              'Bars show approximate genome size in <strong>base pairs</strong>, scaled by square root so smaller genomes stay visible — the actual numbers in the right column tell the true story. The human genome contains roughly 3.1 billion base pairs spread across 23 chromosome pairs. Surprisingly, larger genomes don\'t mean more genes — humans and mice each have about 20,000 protein-coding genes.' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="start-cta">' +
          '<button class="start-cta-btn" id="start-game">Start playing →</button>' +
        '</div>' +

      '</div>';

    document.getElementById('start-game').addEventListener('click', () => {
      // Reset full game state when starting fresh
      state.phase = 'encode';
      state.round = 1;
      state.totalScore = 0;
      state.word = null;
      state.originalDNA = '';
      state.mutatedDNA = '';
      state.mutation = null;
      state.attemptsLeft = MAX_ATTEMPTS;
      state.solved = false;
      scoreEl.textContent = '0';
      roundEl.textContent = 'Round 1';
      updatePhaseIndicator();
      renderEncode();
    });
  }

  function renderEncode() {
    // Pick a random target word for this round
    const targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    state.word = targetWord;
    state.originalDNA = encodeWord(targetWord);

    // Build the letter pool: include all letters of the target + extras (total ~12 tiles)
    const targetLetters = targetWord.split('');
    const extraCount = Math.max(0, 12 - targetLetters.length);
    const availableExtras = 'ACDEFGHIKLMNPQRSTVWY'.split('').filter(l => !targetLetters.includes(l));
    const extras = [];
    while (extras.length < extraCount && availableExtras.length > 0) {
      const idx = Math.floor(Math.random() * availableExtras.length);
      extras.push(availableExtras.splice(idx, 1)[0]);
    }
    // Shuffle pool
    const pool = [...targetLetters, ...extras].sort(() => Math.random() - 0.5);

    // Build state for this phase
    const buildState = {
      placed: new Array(targetWord.length).fill(null), // placed letter at each position
      tileUsed: new Array(pool.length).fill(false) // which pool tiles are used
    };

    gameArea.innerHTML =
      '<div class="phase-content">' +
        '<div class="section-title">Build the message</div>' +
        '<div class="section-desc">Here\'s a real DNA sequence. Read each codon (group of 3) and pick the amino acid it codes for. You\'re spelling the word in amino acid one-letter codes — the same notation real biologists use.</div>' +

        '<div class="target-display">' +
          '<div class="target-label">Target DNA · decode each codon</div>' +
          '<div class="target-codons" id="target-codons"></div>' +
        '</div>' +

        '<div class="build-progress">' +
          '<div class="progress-label" id="progress-label">0 / ' + targetWord.length + ' decoded</div>' +
          '<div class="progress-bar-wrap"><div class="progress-bar-fill" id="progress-fill"></div></div>' +
        '</div>' +

        '<div class="letter-pool-wrap">' +
          '<div class="letter-pool-label">Letter tiles · tap to place</div>' +
          '<div class="letter-pool" id="letter-pool"></div>' +
        '</div>' +

        '<div class="build-controls">' +
          '<div class="build-feedback" id="build-feedback"></div>' +
          '<button class="btn btn-ghost" id="clear-build" style="padding: 10px 18px;">Clear</button>' +
          '<button class="btn" id="to-mutate" disabled>Release into the wild <span class="btn-arrow">→</span></button>' +
        '</div>' +

        inlineCodonRef('This is the real genetic code — 64 codons coding for 20 amino acids (and 3 stop signals). Most amino acids have several synonymous codons, which is why the same word can be encoded different ways. Letters shown here are the standard one-letter amino acid codes.') +
      '</div>';

    const targetCodonsEl = document.getElementById('target-codons');
    const letterPoolEl = document.getElementById('letter-pool');
    const progressLabel = document.getElementById('progress-label');
    const progressFill = document.getElementById('progress-fill');
    const feedback = document.getElementById('build-feedback');
    const toMutateBtn = document.getElementById('to-mutate');
    const clearBtn = document.getElementById('clear-build');

    function renderTargetCodons() {
      const activeIdx = buildState.placed.indexOf(null);
      targetCodonsEl.innerHTML = targetWord.split('').map((_, i) => {
        const codon = state.originalDNA.slice(i * 3, i * 3 + 3);
        const placed = buildState.placed[i];
        const isSolved = placed !== null;
        const isActive = !isSolved && i === activeIdx;
        const seqHtml = codon.split('').map(b =>
          '<span class="base base-' + b.toLowerCase() + '">' + b + '</span>'
        ).join('');
        return '<div class="target-codon' + (isSolved ? ' solved' : '') + (isActive ? ' active' : '') + '" data-idx="' + i + '">' +
          '<div class="target-codon-seq">' + seqHtml + '</div>' +
          '<div class="target-codon-slot">' + (placed || '') + '</div>' +
        '</div>';
      }).join('');

      // Clicking a placed slot removes that letter
      targetCodonsEl.querySelectorAll('.target-codon.solved').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.idx);
          const letter = buildState.placed[idx];
          if (letter === null) return;
          // Find and free the first used tile with this letter
          for (let i = 0; i < pool.length; i++) {
            if (pool[i] === letter && buildState.tileUsed[i]) {
              buildState.tileUsed[i] = false;
              break;
            }
          }
          buildState.placed[idx] = null;
          updateUI();
        });
      });
    }

    function renderPool() {
      letterPoolEl.innerHTML = pool.map((letter, i) =>
        '<button class="letter-tile" data-tile-idx="' + i + '"' + (buildState.tileUsed[i] ? ' disabled' : '') + '>' +
          letter +
        '</button>'
      ).join('');

      letterPoolEl.querySelectorAll('.letter-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const tileIdx = parseInt(tile.dataset.tileIdx);
          if (buildState.tileUsed[tileIdx]) return;
          const letter = pool[tileIdx];
          const nextSlot = buildState.placed.indexOf(null);
          if (nextSlot === -1) return;

          // Check if this is the correct letter for the active slot
          if (letter === targetWord[nextSlot]) {
            buildState.placed[nextSlot] = letter;
            buildState.tileUsed[tileIdx] = true;
            const thisCodon = state.originalDNA.slice(nextSlot * 3, nextSlot * 3 + 3);
            showFeedback('✓ ' + thisCodon + ' codes for ' + letter + ' (' + AA_INFO[letter].name + ')', 'correct');
            updateUI();
          } else {
            // Wrong letter - shake the tile
            tile.classList.remove('wrong-flash');
            void tile.offsetWidth;
            tile.classList.add('wrong-flash');
            const expectedCodon = state.originalDNA.slice(nextSlot * 3, nextSlot * 3 + 3);
            showFeedback('✗ ' + expectedCodon + ' does not decode to ' + letter + '. Try again.', 'wrong');
          }
        });
      });
    }

    let feedbackTimer;
    function showFeedback(msg, type) {
      clearTimeout(feedbackTimer);
      feedback.textContent = msg;
      feedback.className = 'build-feedback show ' + (type || '');
      feedbackTimer = setTimeout(() => {
        feedback.classList.remove('show');
      }, 2400);
    }

    function updateUI() {
      renderTargetCodons();
      renderPool();
      const placedCount = buildState.placed.filter(x => x !== null).length;
      progressLabel.textContent = placedCount + ' / ' + targetWord.length + ' decoded';
      progressFill.style.width = (placedCount / targetWord.length * 100) + '%';

      if (placedCount === targetWord.length) {
        toMutateBtn.disabled = false;
        showFeedback('✓ Complete! Message encoded as DNA.', 'correct');
        // Mini confetti burst for completing the encode
        const rect = toMutateBtn.getBoundingClientRect();
        launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else {
        toMutateBtn.disabled = true;
      }
    }

    clearBtn.addEventListener('click', () => {
      buildState.placed = new Array(targetWord.length).fill(null);
      buildState.tileUsed = new Array(pool.length).fill(false);
      updateUI();
      showFeedback('Cleared. Try again.', '');
    });

    toMutateBtn.addEventListener('click', () => {
      if (buildState.placed.some(x => x === null)) return;
      state.phase = 'mutate';
      updatePhaseIndicator();
      renderMutate();
    });

    updateUI();
  }

  function renderMutate() {
    gameArea.innerHTML =
      '<div class="phase-content">' +
        '<div class="section-title">Mutation incoming</div>' +
        '<div class="section-desc">A random base substitution will strike one position in your DNA — one base will swap for another. Watch what happens to the message.</div>' +
        '<div class="dna-label">Your original DNA · ' + state.word + '</div>' +
        '<div class="dna-strand">' + renderDNA(state.originalDNA, -1, false) + '</div>' +
        '<div class="mutation-trigger">' +
          '<div class="mutation-label">Ready?</div>' +
          '<button class="big-btn" id="trigger-mut">⚡ Apply random mutation</button>' +
        '</div>' +
        '<div id="mut-result"></div>' +
      '</div>';

    document.getElementById('trigger-mut').addEventListener('click', () => {
      const mut = mutate(state.originalDNA);
      state.mutatedDNA = mut.mutated;
      state.mutation = mut;

      document.getElementById('trigger-mut').style.display = 'none';
      document.querySelector('.mutation-label').style.display = 'none';

      const r = document.getElementById('mut-result');
      r.innerHTML =
        '<div class="mutation-card">' +
          '<div class="mutation-type">' + mut.type + '</div>' +
          '<div class="mutation-desc">' + mut.description + '</div>' +
        '</div>' +
        '<div class="dna-label" style="margin-top: 16px;">Mutated DNA</div>' +
        '<div class="dna-strand">' + renderDNA(state.mutatedDNA, mut.pos, true) + '</div>' +
        '<div style="display: flex; justify-content: flex-end; margin-top: 20px;">' +
          '<button class="btn" id="to-decode">Try to decode it <span class="btn-arrow">→</span></button>' +
        '</div>';

      document.getElementById('to-decode').addEventListener('click', () => {
        state.phase = 'decode';
        state.attemptsLeft = MAX_ATTEMPTS;
        state.solved = false;
        updatePhaseIndicator();
        renderDecode();
      });
    });
  }

  function renderDecode() {
    const t = translateDNA(state.mutatedDNA);

    gameArea.innerHTML =
      '<div class="phase-content">' +
        '<div class="section-title">What does it spell now?</div>' +
        '<div class="section-desc">Here\'s the full mutated DNA sequence. Read it in groups of 3 from left to right, look up each codon, and type what the new message spells. Three attempts.</div>' +

        '<div class="dna-label">Mutated DNA · ' + state.mutatedDNA.length + ' bases</div>' +
        '<div class="dna-strand">' + renderDNA(state.mutatedDNA, state.mutation.pos, true) + '</div>' +

        '<div class="answer-input-section">' +
          '<div class="answer-prompt">Your original message was <strong>' + state.word + '</strong>. What does the mutated DNA spell now? <span style="color: var(--text-tertiary);">(use * for a stop codon, ? for incomplete codons)</span></div>' +
          '<div class="answer-input-row">' +
            '<input type="text" class="answer-input" id="answer-input" maxlength="10" placeholder="type answer..." autocomplete="off" spellcheck="false">' +
            '<button class="btn" id="submit-answer">Submit</button>' +
          '</div>' +
          '<div class="feedback" id="feedback"></div>' +
          '<div class="attempts-remaining">' +
            'Attempts' +
            '<span class="dots" id="attempt-dots">' +
              '<span class="attempt-dot"></span>' +
              '<span class="attempt-dot"></span>' +
              '<span class="attempt-dot"></span>' +
            '</span>' +
          '</div>' +
        '</div>' +

        inlineCodonRef('Chunk the DNA into groups of 3 starting from the left. Look up each codon in the table — if you hit a stop codon (TAA, TAG, or TGA), translation halts there. Write * for a stop.') +
      '</div>';

    const input = document.getElementById('answer-input');
    const submitBtn = document.getElementById('submit-answer');
    const feedback = document.getElementById('feedback');
    const correctAnswer = t.map(x => x.letter).join('');

    input.focus();
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
      input.classList.remove('wrong', 'correct');
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitBtn.click();
    });

    submitBtn.addEventListener('click', () => handleSubmit());

    function handleSubmit() {
      const guess = input.value.trim().toUpperCase();
      if (!guess) return;

      if (guess === correctAnswer) {
        state.solved = true;
        input.classList.add('correct');
        input.disabled = true;
        submitBtn.disabled = true;

        feedback.className = 'feedback feedback-correct show';
        feedback.innerHTML = '✓ Correct! The mutation turned <strong>' + state.word + '</strong> into <strong>' + correctAnswer + '</strong>.';

        const rect = submitBtn.getBoundingClientRect();
        launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

        setTimeout(() => {
          const continueBtn = document.createElement('button');
          continueBtn.className = 'btn btn-success';
          continueBtn.style.marginTop = '16px';
          continueBtn.innerHTML = 'See the full breakdown <span class="btn-arrow">→</span>';
          continueBtn.addEventListener('click', () => {
            state.phase = 'reveal';
            updatePhaseIndicator();
            renderReveal(correctAnswer, true);
          });
          feedback.appendChild(continueBtn);
        }, 600);

      } else {
        state.attemptsLeft--;
        input.classList.add('wrong');
        shakeGameArea();

        const dots = document.querySelectorAll('.attempt-dot');
        dots[MAX_ATTEMPTS - state.attemptsLeft - 1].classList.add('used');

        if (state.attemptsLeft > 0) {
          feedback.className = 'feedback feedback-wrong show';
          feedback.innerHTML = '✗ Not quite. ' + state.attemptsLeft + ' attempt' + (state.attemptsLeft === 1 ? '' : 's') + ' left.' +
            (state.attemptsLeft === 1 ? '<div class="feedback feedback-hint show" style="margin-top: 10px;">💡 Hint: break the DNA into groups of 3 and look up each codon in the reference table below.</div>' : '');

          setTimeout(() => {
            input.classList.remove('wrong');
            input.disabled = false;
            input.focus();
            input.select();
          }, 500);
        } else {
          input.disabled = true;
          submitBtn.disabled = true;

          feedback.className = 'feedback feedback-wrong show';
          feedback.innerHTML = '✗ Out of attempts. The correct answer was <strong>' + correctAnswer + '</strong>.';

          setTimeout(() => {
            const continueBtn = document.createElement('button');
            continueBtn.className = 'btn btn-ghost';
            continueBtn.style.marginTop = '16px';
            continueBtn.innerHTML = 'See what happened <span class="btn-arrow">→</span>';
            continueBtn.addEventListener('click', () => {
              state.phase = 'reveal';
              updatePhaseIndicator();
              renderReveal(correctAnswer, false);
            });
            feedback.appendChild(continueBtn);
          }, 400);
        }
      }
    }
  }

  function renderReveal(decoded, correctlySolved) {
    let survived = 0;
    for (let i = 0; i < state.word.length; i++) {
      if (decoded[i] === state.word[i]) survived++;
    }
    const pct = Math.round((survived / state.word.length) * 100);

    const survivalScore = survived * 10;
    const attemptBonus = correctlySolved ? (state.attemptsLeft === 3 ? 20 : state.attemptsLeft === 2 ? 10 : 5) : 0;
    const totalRoundScore = survivalScore + attemptBonus;

    const prevTotal = state.totalScore;
    state.totalScore += totalRoundScore;

    // Build a context-aware explanation
    const decodedTranslation = translateDNA(state.mutatedDNA);
    const hitStop = decodedTranslation.some(x => x.isStop);
    const exps = {
      substitution: (() => {
        if (decoded === state.word) {
          return 'This was a <strong>silent mutation</strong> — the base changed, but the new codon still codes for the same amino acid. Thanks to the degeneracy of the genetic code, many substitutions leave the protein completely unchanged. These are very common in nature and one reason SNPs are so plentiful in populations.';
        }
        if (hitStop) {
          return 'This was a <strong>nonsense mutation</strong> — the substitution created a premature stop codon, halting translation early. The ribosome dropped off, and the resulting protein is truncated. Duchenne muscular dystrophy is one famous example of a disease caused by nonsense mutations.';
        }
        return 'This was a <strong>missense mutation</strong> — the substitution swapped one amino acid for another. The reading frame survives, so only one position changed. Most disease-causing SNPs work this way — sickle cell anemia, for instance, is a single E→V substitution in hemoglobin.';
      })()
    };

    const resultClass = correctlySolved ? 'win' : 'lose';
    const resultLabel = correctlySolved ? 'Solved!' : 'Oof';
    const resultText = correctlySolved
      ? (survived === state.word.length ? 'Perfect translation!' : 'You decoded the damage')
      : 'The mutation won this round';

    gameArea.innerHTML =
      '<div class="phase-content">' +
        '<div class="section-title">Round ' + state.round + ' results</div>' +
        '<div class="section-desc">Here\'s how much of your message survived the mutation, and how well you read the damage.</div>' +

        '<div class="big-result ' + resultClass + '">' +
          '<div class="big-result-label">' + resultLabel + '</div>' +
          '<div class="big-result-text">' + resultText + '</div>' +
        '</div>' +

        '<div class="stat-grid">' +
          '<div class="stat-card">' +
            '<div class="stat-label">Letters survived</div>' +
            '<div class="stat-value">' + survived + '/' + state.word.length + '</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div class="stat-label">Survival rate</div>' +
            '<div class="stat-value">' + pct + '%</div>' +
          '</div>' +
          '<div class="stat-card' + (correctlySolved ? ' highlight' : '') + '">' +
            '<div class="stat-label">Points earned</div>' +
            '<div class="stat-value ' + (correctlySolved ? 'success' : '') + '">+' + totalRoundScore + '</div>' +
          '</div>' +
        '</div>' +

        (correctlySolved && attemptBonus > 0 ?
          '<div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); letter-spacing: 0.1em; text-transform: uppercase; text-align: center; margin-bottom: 20px;">' +
            'Survival: +' + survivalScore + '  ·  Attempt bonus: +' + attemptBonus +
          '</div>' : '') +

        '<div class="lesson-card">' +
          '<div class="lesson-title">' + state.mutation.type + ' · what happened</div>' +
          '<div class="lesson-body">' + exps[state.mutation.type] + '</div>' +
        '</div>' +

        '<div class="dna-label" style="margin-top: 24px;">How each mutated codon decoded</div>' +
        '<div class="codon-breakdown">' +
          (() => {
            const decodedCodons = translateDNA(state.mutatedDNA);
            const bytesUsed = decodedCodons.reduce((s, c) => s + c.codon.length, 0);
            const discardedTail = state.mutatedDNA.slice(bytesUsed);

            const cellsHtml = decodedCodons.map((x, i) => {
              const originalLetter = state.word[i] || '';
              const matches = x.letter === originalLetter;
              const stopCls = x.isStop ? ' stop-codon' : '';
              const letterStyle = x.isStop
                ? 'color: var(--danger);'
                : originalLetter && !matches ? 'color: var(--danger);'
                : originalLetter && matches ? 'color: var(--success);' : '';
              return '<div class="codon-cell' + stopCls + '">' +
                '<div class="codon-cell-seq">' +
                  x.codon.split('').map(b => '<span class="base base-' + b.toLowerCase() + '">' + b + '</span>').join('') +
                '</div>' +
                '<div class="codon-cell-arrow">↓</div>' +
                '<div class="codon-cell-letter' + (x.letter === '?' ? ' unknown' : '') + '" style="' + letterStyle + '">' +
                  (x.isStop ? 'STOP' : x.letter) +
                '</div>' +
                (originalLetter ?
                  '<div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-tertiary); margin-top: 4px; letter-spacing: 0.1em;">' +
                    (x.isStop ? 'was ' + originalLetter : 'was ' + originalLetter) +
                  '</div>' :
                  ''
                ) +
              '</div>';
            }).join('');

            const discardedHtml = discardedTail.length > 0 ?
              '<div class="codon-cell discarded" title="Not translated — ribosome stopped">' +
                '<div class="codon-cell-seq">' +
                  discardedTail.split('').map(b => '<span class="base base-' + b.toLowerCase() + '" style="opacity: 0.5;">' + b + '</span>').join('') +
                '</div>' +
                '<div class="codon-cell-arrow">↓</div>' +
                '<div class="codon-cell-letter" style="color: var(--text-muted); font-size: 11px;">not read</div>' +
              '</div>'
              : '';

            return cellsHtml + discardedHtml;
          })() +
        '</div>' +

        inlineCodonRef('Compare each codon to its original counterpart. Green = survived. Red = changed. This is exactly the kind of analysis computational biologists do when studying how mutations affect protein function.') +

        '<div class="footer-row">' +
          '<div class="footer-info">Total: <strong>' + state.totalScore + '</strong> points · Round ' + state.round + '</div>' +
          '<button class="btn" id="new-round">Next round <span class="btn-arrow">→</span></button>' +
        '</div>' +
      '</div>';

    animateScore(prevTotal, state.totalScore);
    if (correctlySolved && totalRoundScore > 0) {
      setTimeout(() => {
        const rect = scoreEl.getBoundingClientRect();
        launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }, 300);
    }

    roundEl.textContent = 'Round ' + state.round;

    document.getElementById('new-round').addEventListener('click', () => {
      state.round++;
      state.phase = 'encode';
      state.word = null;
      state.originalDNA = '';
      state.mutatedDNA = '';
      state.mutation = null;
      state.attemptsLeft = MAX_ATTEMPTS;
      state.solved = false;
      roundEl.textContent = 'Round ' + state.round;
      updatePhaseIndicator();
      renderEncode();
    });
  }

  initFloatingBases();
  renderCodonRef();
  initCodonFab();

  // Help button: revisit the intro at any time
  document.getElementById('help-btn').addEventListener('click', () => {
    state.phase = 'intro';
    updatePhaseIndicator();
    renderIntro();
  });

  updatePhaseIndicator();
  renderIntro();
})();
