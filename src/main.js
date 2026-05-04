import './style.css'

const app = document.querySelector('#app')

const LEVELS = [
  {
    title: 'Passage 01',
    difficulty: 'Rookie',
    challenge: 'Warm-up mission: learn line transitions and stop exactly on the marker.',
    targetMode: 'random',
    text: `Astronomers estimate that the Milky Way contains hundreds of billions of stars, and most of those stars orbit a supermassive black hole at the galactic center while radio telescopes map cold hydrogen clouds that reveal spiral structure.

When a massive star exhausts nuclear fuel, gravity can collapse the core, and if the remnant mass is high enough no known force can stop further compression, producing a black hole with an event horizon that traps light.

Spectroscopy lets researchers measure composition, temperature, and velocity, and by comparing spectral lines scientists infer motion through Doppler shifts across distant stellar systems.`
  },
  {
    title: 'Passage 02',
    difficulty: 'Skilled',
    challenge: 'Precision mission: use vertical moves wisely to maintain momentum streaks.',
    targetMode: 'distance',
    text: `In classical mechanics, momentum equals mass multiplied by velocity, and conservation laws help physicists predict motion after collisions while energy transfer changes speed without violating total system balance.

Quantum theory describes particles with probability amplitudes rather than fixed trajectories, and measurements collapse outcomes into values that experiments can record while interference patterns demonstrate wave behavior even for single electrons.

Modern laboratories test these principles with superconducting circuits, where careful isolation reduces thermal and electromagnetic noise so measurements remain reproducible.`
  },
  {
    title: 'Passage 03',
    difficulty: 'Skilled+',
    targetMode: 'edge',
    text: `Cells use membranes to regulate transport between internal and external environments, and membrane proteins act as channels, pumps, and receptors that maintain concentration gradients required for metabolism.

In ecosystems, energy flows from producers to consumers and decomposers, while nutrient cycles return essential elements to soil, water, and atmosphere and population changes cascade through food webs.

Computer scientists model these interactions with graph algorithms, using network analysis to identify hubs, bottlenecks, and resilient pathways in biological and ecological systems.`
  },
  {
    title: 'Passage 04',
    difficulty: 'Advanced',
    targetMode: 'punctuation',
    text: `Security teams monitor authentication logs, endpoint telemetry, and network flow records to identify unusual behavior before attackers escalate privileges or move laterally across internal systems.

Blue team analysts correlate indicators from multiple sensors, compare process ancestry trees, and isolate suspicious hosts while preserving forensic evidence needed for post-incident review.

Effective defense relies on layered controls, rapid patch cycles, and realistic incident simulations that expose weak assumptions long before a real intrusion occurs.`
  },
  {
    title: 'Passage 05',
    difficulty: 'Advanced+',
    targetMode: 'far',
    text: `Climate researchers combine satellite observations, ocean buoy records, and paleoclimate proxies to estimate how temperature, precipitation, and atmospheric circulation respond to changing greenhouse gas concentrations.

Regional impacts are uneven: some areas face prolonged drought and heat stress, while others experience stronger rainfall events, coastal flooding, and shifting storm patterns that challenge existing infrastructure.

Adaptation planning uses scenario ensembles, uncertainty intervals, and risk maps so policymakers can prioritize investments with the greatest resilience payoff over decades.`
  },
  {
    title: 'Passage 06',
    difficulty: 'Expert',
    targetMode: 'edge-far',
    text: `Neural circuits process sensory input through distributed populations of cells whose firing patterns encode timing, intensity, and context before signals are integrated into perception and action.

Modern experiments pair calcium imaging with closed-loop stimulation, allowing scientists to perturb selected neurons and observe how activity reorganizes across large cortical networks.

Computational models test hypotheses about learning by comparing predicted spike statistics with observed recordings, revealing where assumptions about plasticity break down.`
  },
  {
    title: 'Passage 07',
    difficulty: 'Master',
    targetMode: 'mixed-hard',
    text: `Distributed services coordinate through message passing, replication protocols, and consensus algorithms that preserve correctness despite node failures, delayed packets, and partial network partitions.

Engineers balance consistency, availability, and latency by selecting data models and quorum strategies that match product requirements while avoiding cascading retries during peak load.

Observability is essential: structured logs, traces, and high-cardinality metrics help teams detect emergent bottlenecks and verify that remediation steps actually reduce tail latency.`
  },
  {
    title: 'Passage 08',
    difficulty: 'Legend',
    targetMode: 'legend',
    text: `Interplanetary guidance solutions account for gravitational assists, finite thrust windows, and communication delay, requiring trajectory planners to update state estimates with sparse and noisy measurements.

Navigation teams validate burn sequences through Monte Carlo simulation, fault injection, and cross-checks between independent software stacks to reduce the probability of mission-ending deviation.

During critical maneuvers, operators monitor telemetry envelopes in real time, compare residuals against expected bands, and commit contingency plans within tight decision deadlines.`
  }
]

const state = {
  levelIndex: 0,
  documentLines: [],
  wrappedLines: [],
  cursor: { line: 0, col: 0 },
  preferredCol: 0,
  moves: 0,
  target: null,
  targetVisual: null,
  isWon: false,
  optimalMoves: 0,
  maxCols: 80,
  streak: 0,
  bestStreak: 0,
  lastDistance: 0,
  levelData: null
}

const ui = {}

const SoundSystem = (() => {
  let audioContext = null
  let masterGain = null

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      masterGain = audioContext.createGain()
      masterGain.gain.value = 0.08
      masterGain.connect(audioContext.destination)
    }
    return audioContext
  }

  function getMasterGain() {
    getAudioContext()
    return masterGain
  }

  function playTick() {
    try {
      const ctx = getAudioContext()
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const env = ctx.createGain()

      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.04)

      env.gain.setValueAtTime(0.15, now)
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.04)

      osc.connect(env)
      env.connect(getMasterGain())

      osc.start(now)
      osc.stop(now + 0.04)
    } catch {
      // Audio context unavailable, silently fail
    }
  }

  function playChime() {
    try {
      const ctx = getAudioContext()
      const now = ctx.currentTime

      const notes = [
        { freq: 528, duration: 0.3 },
        { freq: 660, duration: 0.25 },
        { freq: 792, duration: 0.4 }
      ]

      notes.forEach((note, index) => {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()

        osc.frequency.value = note.freq
        env.gain.setValueAtTime(0.1, now + index * 0.05)
        env.gain.exponentialRampToValueAtTime(0.01, now + index * 0.05 + note.duration)

        osc.connect(env)
        env.connect(getMasterGain())

        osc.start(now + index * 0.05)
        osc.stop(now + index * 0.05 + note.duration)
      })
    } catch {
      // Audio context unavailable, silently fail
    }
  }

  return { playTick, playChime }
})()

function createLayout() {
  app.innerHTML = `
    <main class="app-shell text-slate-900">
      <header class="app-topbar sticky top-0 z-10 border-b border-slate-300/70 px-4 py-2 backdrop-blur sm:px-6">
        <div class="topbar-row">
          <div class="brand-wrap">
            <div>
              <h1 class="brand-title">Cursor</h1>
              <span class="brand-subtitle" id="levelTitle">Passage 01</span>
            </div>
          </div>

          <div class="score-rack" aria-label="Run stats">
            <span class="hud-pill" id="levelLabel">Passage 01 / ${String(LEVELS.length).padStart(2, '0')}</span>
            <span class="hud-pill" id="movesLabel">Moves 0</span>
            <span class="hud-pill hud-pill-streak" id="streakLabel">Streak x0</span>
            <span class="hud-pill hud-pill-heat" id="heatLabel">Flow 0%</span>
          </div>
        </div>

      </header>

      <section class="workspace-wrap px-3 py-3 sm:px-4 sm:py-3">
        <div class="workspace-grid h-full gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div class="editor-shell">
            <div id="editorViewport" class="editor-viewport relative h-full overflow-y-auto overflow-x-hidden">
              <div class="editor-gutter sticky left-0 top-0 z-10 h-full w-10"></div>
              <div id="textSurface" class="text-surface absolute inset-0 overflow-visible pl-9 pr-7 pt-10 pb-20 sm:pl-14 sm:pr-12 sm:pt-12">
                <div id="textGrid" class="text-grid" aria-label="Game text"></div>
              </div>
            </div>
          </div>

          <aside class="side-panel mt-2 p-5 lg:mt-0 lg:h-full">
            <div class="side-panel-stack">
              <p class="panel-label">Objective</p>
              <div class="info-block mt-3">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Flag Position</p>
                <p id="targetWordLabel" class="mt-2 text-base font-semibold text-slate-800">Line 1, Col 1</p>
                <p id="targetMetaLabel" class="mt-2 text-xs text-slate-500">Reach the exact red flag position.</p>
              </div>

              <p class="panel-label mt-8">Session</p>
              <div class="info-list mt-3">
                <div class="info-item"><span>Passage</span><span id="panelLevelValue">01</span></div>
                <div class="info-item"><span>Pace</span><span id="panelDifficultyValue">Rookie</span></div>
                <div class="info-item"><span>Moves</span><span id="panelMovesValue">0</span></div>
                <div class="info-item"><span>Streak</span><span id="panelStreakValue">0</span></div>
                <div class="info-item"><span>Optimal</span><span id="panelOptimalValue">0</span></div>
              </div>

              <div class="howto-section">
                <p class="panel-label">How to Play</p>
                <div class="shortcut-list mt-3">
                  <div class="shortcut-item">Arrow Keys <span>Move the cursor</span></div>
                  <div class="shortcut-item">Line Wrap <span>Keep going across wrapped text</span></div>
                  <div class="shortcut-item">Red Flag <span>Land on the exact line and column</span></div>
                  <div class="shortcut-item">Efficiency <span>Fewer moves keeps the run cleaner</span></div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div id="overlay" class="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-slate-900/20 opacity-0">
        <div class="overlay-panel w-[92%] max-w-sm border border-slate-300 p-6 text-center">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Level Complete</p>
          <p id="resultText" class="mt-2 text-2xl font-semibold tracking-tight text-slate-900"></p>
          <p id="rankText" class="mt-2 text-base font-semibold text-slate-700"></p>
          <p id="efficiencyText" class="mt-2 text-sm font-medium text-slate-600"></p>
          <p id="streakResultText" class="mt-1 text-sm font-medium text-slate-600"></p>
          <div class="mt-6 flex justify-center gap-3">
            <button id="nextBtn" class="ui-btn ui-btn-primary">Next Level</button>
            <button id="retryBtn" class="ui-btn">Retry</button>
          </div>
        </div>
      </div>
    </main>
  `

  ui.levelLabel = document.getElementById('levelLabel')
  ui.movesLabel = document.getElementById('movesLabel')
  ui.streakLabel = document.getElementById('streakLabel')
  ui.heatLabel = document.getElementById('heatLabel')
  ui.levelTitle = document.getElementById('levelTitle')
  ui.editorViewport = document.getElementById('editorViewport')
  ui.textGrid = document.getElementById('textGrid')
  ui.targetWordLabel = document.getElementById('targetWordLabel')
  ui.targetMetaLabel = document.getElementById('targetMetaLabel')
  ui.panelLevelValue = document.getElementById('panelLevelValue')
  ui.panelDifficultyValue = document.getElementById('panelDifficultyValue')
  ui.panelMovesValue = document.getElementById('panelMovesValue')
  ui.panelStreakValue = document.getElementById('panelStreakValue')
  ui.panelOptimalValue = document.getElementById('panelOptimalValue')
  ui.overlay = document.getElementById('overlay')
  ui.resultText = document.getElementById('resultText')
  ui.rankText = document.getElementById('rankText')
  ui.efficiencyText = document.getElementById('efficiencyText')
  ui.streakResultText = document.getElementById('streakResultText')
  ui.nextBtn = document.getElementById('nextBtn')
  ui.retryBtn = document.getElementById('retryBtn')
}

function getDistanceToTarget() {
  if (!state.targetVisual) {
    return 0
  }
  return (
    Math.abs(state.cursor.line - state.targetVisual.line) +
    Math.abs(state.cursor.col - state.targetVisual.col)
  )
}

function updateStreak(previousDistance, nextDistance) {
  if (nextDistance < previousDistance) {
    state.streak += 1
  } else if (nextDistance > previousDistance) {
    state.streak = Math.max(0, state.streak - 1)
  }

  if (state.streak > state.bestStreak) {
    state.bestStreak = state.streak
  }

  state.lastDistance = nextDistance
}

function normalizeLevelText(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
}

function linesFromParagraphText(text) {
  const paragraphs = normalizeLevelText(text)
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const lines = []
  paragraphs.forEach((paragraph, index) => {
    lines.push(paragraph)
    if (index < paragraphs.length - 1) {
      lines.push('')
    }
  })

  return lines.length > 0 ? lines : ['']
}

function pickByMode(lines, candidates, mode) {
  if (mode === 'punctuation') {
    const punctuationTargets = candidates.filter((point) => {
      const char = lines[point.line][point.col]
      return /[,:;.-]/.test(char)
    })
    if (punctuationTargets.length > 0) {
      return punctuationTargets
    }
  }

  if (mode === 'edge' || mode === 'edge-far') {
    const edgeTargets = candidates.filter((point) => {
      const line = lines[point.line]
      return point.col <= 2 || point.col >= line.length - 3
    })
    if (edgeTargets.length > 0) {
      return edgeTargets
    }
  }

  if (mode === 'distance' || mode === 'far' || mode === 'edge-far' || mode === 'mixed-hard' || mode === 'legend') {
    const threshold = mode === 'distance' ? 28 : 42
    const distantTargets = candidates.filter((point) => point.line + point.col >= threshold)
    if (distantTargets.length > 0) {
      candidates = distantTargets
    }
  }

  if (mode === 'mixed-hard' || mode === 'legend') {
    const weighted = candidates.filter((point) => {
      const line = lines[point.line]
      const nearEdge = point.col <= 2 || point.col >= line.length - 3
      const isPunctuation = /[,:;.-]/.test(line[point.col])
      return nearEdge || isPunctuation
    })
    if (weighted.length > 0) {
      return weighted
    }
  }

  return candidates
}

function chooseFlagTarget(lines, mode = 'random') {
  const candidates = []
  lines.forEach((line, lineIndex) => {
    for (let col = 0; col < line.length; col += 1) {
      candidates.push({ line: lineIndex, col })
    }
  })

  if (candidates.length === 0) {
    return { line: 0, col: 0 }
  }

  const filtered = candidates.filter((point) => !(point.line === 0 && point.col === 0))
  const basePool = filtered.length > 0 ? filtered : candidates
  const pool = pickByMode(lines, basePool, mode)
  return pool[Math.floor(Math.random() * pool.length)]
}

function measureCharWidth() {
  const probe = document.createElement('span')
  probe.className = 'char-cell'
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.textContent = 'M'
  ui.textGrid.appendChild(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width || 10
}

function getMaxColumns() {
  const width = ui.textGrid.getBoundingClientRect().width || ui.editorViewport.getBoundingClientRect().width
  const charWidth = measureCharWidth()
  return Math.max(4, Math.floor((width - charWidth * 2) / charWidth))
}

function wrapLineByWords(line, maxCols) {
  if (line.length === 0) {
    return [{ text: '', startCol: 0 }]
  }

  const words = line.split(' ')
  const wrapped = []
  let current = ''
  let currentStartCol = 0
  let logicalCol = 0

  function pushCurrent() {
    if (current.length > 0) {
      wrapped.push({ text: current, startCol: currentStartCol })
    }
  }

  function pushWordChunks(word, startCol) {
    for (let offset = 0; offset < word.length; offset += maxCols) {
      wrapped.push({
        text: word.slice(offset, offset + maxCols),
        startCol: startCol + offset
      })
    }
  }

  words.forEach((word, index) => {
    const separator = current.length === 0 ? '' : ' '
    const candidate = `${current}${separator}${word}`

    if (current.length === 0) {
      if (word.length > maxCols) {
        pushWordChunks(word, logicalCol)
      } else {
        current = word
        currentStartCol = logicalCol
      }
    } else if (candidate.length <= maxCols) {
      current = candidate
    } else {
      pushCurrent()
      if (word.length > maxCols) {
        pushWordChunks(word, logicalCol)
      } else {
        current = word
        currentStartCol = logicalCol
      }
    }

    logicalCol += word.length
    if (index < words.length - 1) {
      logicalCol += 1
    }
  })

  wrapped.push({ text: current, startCol: currentStartCol })
  return wrapped
}

function rebuildWrappedLines() {
  const wrapped = []
  state.documentLines.forEach((lineText, logicalLine) => {
    const chunks = wrapLineByWords(lineText, state.maxCols)
    chunks.forEach((chunk) => {
      wrapped.push({
        text: chunk.text,
        logicalLine,
        startCol: chunk.startCol
      })
    })
  })
  state.wrappedLines = wrapped.length > 0 ? wrapped : [{ text: '', logicalLine: 0, startCol: 0 }]
}

function toLogicalPosition(visualLine, visualCol) {
  const line = state.wrappedLines[visualLine]
  return {
    logicalLine: line.logicalLine,
    logicalCol: line.startCol + visualCol
  }
}

function toVisualPosition(logicalLine, logicalCol) {
  const candidates = []
  state.wrappedLines.forEach((line, index) => {
    if (line.logicalLine === logicalLine) {
      candidates.push({ index, line })
    }
  })

  if (candidates.length === 0) {
    return { line: 0, col: 0 }
  }

  for (const candidate of candidates) {
    const start = candidate.line.startCol
    const end = start + candidate.line.text.length
    if (logicalCol >= start && logicalCol <= end) {
      return { line: candidate.index, col: Math.max(0, Math.min(logicalCol - start, candidate.line.text.length)) }
    }
  }

  if (logicalCol < candidates[0].line.startCol) {
    return { line: candidates[0].index, col: 0 }
  }

  const last = candidates[candidates.length - 1]
  return { line: last.index, col: last.line.text.length }
}

function updateTargetVisual() {
  if (!state.target) {
    state.targetVisual = null
    return
  }

  state.wrappedLines.forEach((line, visualLine) => {
    if (state.targetVisual) {
      return
    }

    if (line.logicalLine !== state.target.line) {
      return
    }

    const start = line.startCol
    const end = start + line.text.length
    if (state.target.col >= start && state.target.col < end) {
      state.targetVisual = { line: visualLine, col: state.target.col - start }
    }
  })

  if (!state.targetVisual) {
    state.targetVisual = { line: 0, col: 0 }
  }
}

function reflowDocument(preserveCursor = true) {
  let logicalCursor = { logicalLine: 0, logicalCol: 0 }
  if (preserveCursor && state.wrappedLines.length > 0) {
    logicalCursor = toLogicalPosition(state.cursor.line, state.cursor.col)
  }

  state.maxCols = getMaxColumns()
  rebuildWrappedLines()
  updateTargetVisual()

  if (preserveCursor) {
    const next = toVisualPosition(logicalCursor.logicalLine, logicalCursor.logicalCol)
    state.cursor.line = next.line
    state.cursor.col = next.col
    state.preferredCol = next.col
  } else {
    state.cursor = { line: 0, col: 0 }
    state.preferredCol = 0
  }
}

function applyMoveToState(snapshot, dx, dy) {
  const next = {
    line: snapshot.line,
    col: snapshot.col,
    preferredCol: snapshot.preferredCol
  }

  if (dy !== 0) {
    const newLine = next.line + dy
    if (newLine < 0 || newLine >= state.wrappedLines.length) {
      return null
    }

    next.line = newLine
    next.col = Math.min(next.preferredCol, state.wrappedLines[newLine].text.length)
  }

  if (dx !== 0) {
    const lineLength = state.wrappedLines[next.line].text.length

    if (dx < 0 && next.col === 0) {
      const previousLine = next.line - 1
      if (previousLine < 0) {
        return null
      }
      next.line = previousLine
      next.col = state.wrappedLines[previousLine].text.length
      next.preferredCol = next.col
      return next
    }

    if (dx > 0 && next.col === lineLength) {
      const followingLine = next.line + 1
      if (followingLine >= state.wrappedLines.length) {
        return null
      }
      next.line = followingLine
      next.col = 0
      next.preferredCol = 0
      return next
    }

    const newCol = next.col + dx
    if (newCol < 0 || newCol > lineLength) {
      return null
    }
    next.col = newCol
    next.preferredCol = newCol
  }

  if (dx === 0 && dy !== 0) {
    next.preferredCol = snapshot.preferredCol
  }

  return next
}

function computeOptimalMoves(target) {
  const targetVisual = state.targetVisual
  if (!targetVisual) {
    return 0
  }

  const queue = [{ line: 0, col: 0, preferredCol: 0, dist: 0 }]
  const visited = new Set(['0|0'])

  while (queue.length > 0) {
    const current = queue.shift()
    if (current.line === targetVisual.line && current.col === targetVisual.col) {
      return current.dist
    }

    const deltas = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]

    deltas.forEach(([dx, dy]) => {
      const next = applyMoveToState(current, dx, dy)
      if (!next) {
        return
      }

      const key = `${next.line}|${next.col}`
      if (visited.has(key)) {
        return
      }

      visited.add(key)
      queue.push({ ...next, dist: current.dist + 1 })
    })
  }

  return 0
}

function getRank(moves, optimalMoves) {
  if (moves <= optimalMoves + 2) {
    return 'S'
  }
  if (moves <= optimalMoves + 5) {
    return 'A'
  }
  if (moves <= optimalMoves + 10) {
    return 'B'
  }
  return 'C'
}

function buildCursorNode() {
  const cursor = document.createElement('span')
  cursor.id = 'cursor'
  cursor.className = 'cursor-beam'
  cursor.setAttribute('aria-hidden', 'true')
  cursor.textContent = '\u200B'
  return cursor
}

function buildFlagNode() {
  const flag = document.createElement('span')
  flag.className = 'target-flag'
  flag.setAttribute('aria-hidden', 'true')
  flag.textContent = '⚑'
  return flag
}

function renderTextGrid() {
  ui.textGrid.innerHTML = ''

  state.wrappedLines.forEach((wrappedLine, lineIndex) => {
    const row = document.createElement('div')
    row.className = 'text-row'
    const chars = wrappedLine.text.length > 0 ? wrappedLine.text.split('') : ['\u00A0']
    const logicalLength = wrappedLine.text.length

    for (let col = 0; col <= logicalLength; col += 1) {
      if (state.cursor.line === lineIndex && state.cursor.col === col) {
        row.appendChild(buildCursorNode())
      }

      if (col < logicalLength) {
        const char = document.createElement('span')
        char.className = 'char-cell'
        char.textContent = chars[col] === ' ' ? '\u00A0' : chars[col]

        if (state.targetVisual && state.targetVisual.line === lineIndex && state.targetVisual.col === col) {
          char.classList.add('target-cell')
          char.appendChild(buildFlagNode())
        }

        row.appendChild(char)
      }
    }

    if (logicalLength === 0) {
      const blankCell = document.createElement('span')
      blankCell.className = 'char-cell blank-cell'
      blankCell.textContent = '\u00A0'
      if (state.targetVisual && state.targetVisual.line === lineIndex && state.targetVisual.col === 0) {
        blankCell.classList.add('target-cell')
        blankCell.appendChild(buildFlagNode())
      }
      row.appendChild(blankCell)
    }

    ui.textGrid.appendChild(row)
  })
}

function updateHud() {
  ui.levelLabel.textContent = `Passage ${String(state.levelIndex + 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`
  ui.movesLabel.textContent = `Moves ${state.moves}`
  ui.streakLabel.textContent = `Streak x${state.streak}`

  const flowPercent = Math.min(100, state.streak * 12)
  ui.heatLabel.textContent = `Flow ${flowPercent}%`
  ui.heatLabel.classList.toggle('hud-pill-hot', flowPercent >= 72)

  ui.panelLevelValue.textContent = String(state.levelIndex + 1).padStart(2, '0')
  ui.panelDifficultyValue.textContent = state.levelData?.difficulty ?? 'Rookie'
  ui.panelMovesValue.textContent = String(state.moves)
  ui.panelStreakValue.textContent = String(state.streak)
  ui.panelOptimalValue.textContent = String(state.optimalMoves)

  if (state.target) {
    ui.targetWordLabel.textContent = `Line ${state.target.line + 1}, Col ${state.target.col + 1}`
    ui.targetMetaLabel.textContent = 'Reach the exact red flag position.'
  }
}

function ensureCursorInView() {
  const cursorNode = document.getElementById('cursor')
  if (!cursorNode) {
    return
  }

  cursorNode.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'smooth'
  })
}

function renderFrame() {
  renderTextGrid()
  updateHud()
  ensureCursorInView()
}

function showOverlay() {
  ui.overlay.classList.add('overlay-visible')
  ui.overlay.classList.remove('pointer-events-none')
}

function hideOverlay() {
  ui.overlay.classList.remove('overlay-visible')
  ui.overlay.classList.add('pointer-events-none')
}

function checkWin() {
  const target = state.targetVisual
  if (!target) {
    return
  }

  const reachedTarget =
    state.cursor.line === target.line &&
    state.cursor.col === target.col

  if (!reachedTarget) {
    return
  }

  state.isWon = true
  SoundSystem.playChime()
  const rank = getRank(state.moves, state.optimalMoves)
  const isPrecisionBonus = state.moves === state.optimalMoves
  ui.resultText.textContent = `Finished in ${state.moves} moves`
  ui.rankText.textContent = `Rank ${rank}`
  ui.rankText.classList.toggle('precision-bonus', isPrecisionBonus)
  ui.efficiencyText.textContent = `Optimal route estimate: ${state.optimalMoves} moves`
  ui.streakResultText.textContent = isPrecisionBonus
    ? `Perfect route. Best streak this run: x${state.bestStreak}`
    : `Best streak this run: x${state.bestStreak}`

  updateHud()
  showOverlay()
}

function moveCursor(dx, dy) {
  if (state.isWon) {
    return
  }

  const previousDistance = getDistanceToTarget()
  const next = applyMoveToState(
    {
      line: state.cursor.line,
      col: state.cursor.col,
      preferredCol: state.preferredCol
    },
    dx,
    dy
  )

  if (!next) {
    return
  }

  state.cursor.line = next.line
  state.cursor.col = next.col
  state.preferredCol = next.preferredCol
  state.moves += 1

  const nextDistance = getDistanceToTarget()
  updateStreak(previousDistance, nextDistance)

  SoundSystem.playTick()
  renderFrame()
  checkWin()
}

function setupLevel(index) {
  const wrappedIndex = (index + LEVELS.length) % LEVELS.length
  state.levelIndex = wrappedIndex
  const levelData = LEVELS[wrappedIndex]
  state.levelData = levelData
  state.documentLines = linesFromParagraphText(levelData.text)
  state.wrappedLines = []
  state.cursor = { line: 0, col: 0 }
  state.preferredCol = 0
  state.moves = 0
  state.streak = 0
  state.bestStreak = 0
  state.isWon = false

  state.target = chooseFlagTarget(state.documentLines, levelData.targetMode)
  reflowDocument(false)
  state.optimalMoves = computeOptimalMoves(state.target)
  state.lastDistance = getDistanceToTarget()

  hideOverlay()
  ui.rankText.textContent = ''
  ui.efficiencyText.textContent = ''
  ui.streakResultText.textContent = ''
  ui.levelTitle.textContent = levelData.title ?? `Passage ${wrappedIndex + 1}`

  renderFrame()

  ui.textGrid.classList.remove('level-fade-in')
  void ui.textGrid.offsetWidth
  ui.textGrid.classList.add('level-fade-in')

  ui.editorViewport.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

function handleKeyDown(event) {
  const key = event.key

  if (key === 'ArrowLeft') {
    event.preventDefault()
    moveCursor(-1, 0)
    return
  }

  if (key === 'ArrowRight') {
    event.preventDefault()
    moveCursor(1, 0)
    return
  }

  if (key === 'ArrowUp') {
    event.preventDefault()
    moveCursor(0, -1)
    return
  }

  if (key === 'ArrowDown') {
    event.preventDefault()
    moveCursor(0, 1)
    return
  }

  if (key === 'r' || key === 'R') {
    event.preventDefault()
    setupLevel(state.levelIndex)
    return
  }

  if ((key === 'n' || key === 'N' || key === 'Enter') && state.isWon) {
    event.preventDefault()
    setupLevel(state.levelIndex + 1)
  }
}

function bindUiEvents() {
  document.addEventListener('keydown', handleKeyDown)

  ui.nextBtn.addEventListener('click', () => {
    setupLevel(state.levelIndex + 1)
  })

  ui.retryBtn.addEventListener('click', () => {
    setupLevel(state.levelIndex)
  })

  window.addEventListener('resize', () => {
    reflowDocument(true)
    renderFrame()
  })
}

createLayout()
bindUiEvents()
setupLevel(0)
