import './style.css'

const app = document.querySelector('#app')

const LEVELS = [
  {
    title: 'Astronomy',
    text: `Astronomers estimate that the Milky Way contains hundreds of billions of stars, and most of those stars orbit a supermassive black hole at the galactic center while radio telescopes map cold hydrogen clouds that reveal spiral structure.

When a massive star exhausts nuclear fuel, gravity can collapse the core, and if the remnant mass is high enough no known force can stop further compression, producing a black hole with an event horizon that traps light.

Spectroscopy lets researchers measure composition, temperature, and velocity, and by comparing spectral lines scientists infer motion through Doppler shifts across distant stellar systems.`
  },
  {
    title: 'Physics',
    text: `In classical mechanics, momentum equals mass multiplied by velocity, and conservation laws help physicists predict motion after collisions while energy transfer changes speed without violating total system balance.

Quantum theory describes particles with probability amplitudes rather than fixed trajectories, and measurements collapse outcomes into values that experiments can record while interference patterns demonstrate wave behavior even for single electrons.

Modern laboratories test these principles with superconducting circuits, where careful isolation reduces thermal and electromagnetic noise so measurements remain reproducible.`
  },
  {
    title: 'Biology',
    text: `Cells use membranes to regulate transport between internal and external environments, and membrane proteins act as channels, pumps, and receptors that maintain concentration gradients required for metabolism.

In ecosystems, energy flows from producers to consumers and decomposers, while nutrient cycles return essential elements to soil, water, and atmosphere and population changes cascade through food webs.

Computer scientists model these interactions with graph algorithms, using network analysis to identify hubs, bottlenecks, and resilient pathways in biological and ecological systems.`
  }
]

const BEST_SCORES_KEY = 'cursor-best-scores-v1'

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
  bestScores: {},
  optimalMoves: 0,
  maxCols: 80
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
    <main class="app-shell min-h-screen text-slate-900">
      <header class="app-topbar sticky top-0 z-10 flex items-center justify-between border-b border-slate-300/70 px-4 py-3 backdrop-blur sm:px-6">
        <div class="flex items-baseline gap-3">
          <h1 class="text-base font-semibold tracking-tight">Cursor</h1>
          <span class="hidden text-xs uppercase tracking-[0.2em] text-slate-500 sm:inline" id="levelTitle">Text Navigation Puzzle</span>
        </div>
        <div class="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6">
          <span id="levelLabel">Level 1 / ${LEVELS.length}</span>
          <span id="movesLabel">Moves 0</span>
          <span id="bestLabel">Best -</span>
        </div>
      </header>

      <section class="workspace-wrap px-4 py-4 sm:px-6 sm:py-5">
        <div class="workspace-grid h-[calc(100vh-98px)] gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="editor-shell">
            <div id="editorViewport" class="editor-viewport relative h-full overflow-y-auto overflow-x-hidden border border-slate-300/60">
              <div class="editor-gutter sticky left-0 top-0 z-10 h-full w-10 border-r border-slate-200/80"></div>
              <div id="textSurface" class="text-surface absolute inset-0 overflow-visible pl-14 pr-12 pt-12 pb-20">
                <div id="textGrid" class="text-grid" aria-label="Game text"></div>
              </div>
            </div>
          </div>

          <aside class="side-panel mt-4 h-80 border border-slate-300/60 p-8 lg:mt-0 lg:h-full">
            <p class="panel-label">Objective</p>
            <div class="info-block mt-3">
              <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Flag Position</p>
              <p id="targetWordLabel" class="mt-2 text-base font-semibold text-slate-800">Line 1, Col 1</p>
              <p id="targetMetaLabel" class="mt-2 text-xs text-slate-500">Match cursor to the red flag.</p>
            </div>

            <p class="panel-label mt-8">Session</p>
            <div class="info-list mt-3">
              <div class="info-item"><span>Current Level</span><span id="panelLevelValue">1</span></div>
              <div class="info-item"><span>Moves</span><span id="panelMovesValue">0</span></div>
              <div class="info-item"><span>Optimal</span><span id="panelOptimalValue">0</span></div>
              <div class="info-item"><span>Best</span><span id="panelBestValue">-</span></div>
            </div>

            <p class="panel-label mt-8">How to Play</p>
            <div class="shortcut-list mt-3">
              <div class="shortcut-item">Arrow Keys <span>Move the cursor</span></div>
              <div class="shortcut-item">Editor Navigation <span>Move like a document cursor</span></div>
              <div class="shortcut-item">Red Flag <span>Reach the exact line and column</span></div>
              <div class="shortcut-item">Efficiency <span>Minimize moves for a better rank</span></div>
            </div>
          </aside>
        </div>
      </section>

      <div id="overlay" class="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-slate-900/20 opacity-0">
        <div class="overlay-panel w-[92%] max-w-sm border border-slate-300 p-6 text-center">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Level Complete</p>
          <p id="resultText" class="mt-2 text-2xl font-semibold tracking-tight text-slate-900"></p>
          <p id="rankText" class="mt-2 text-base font-semibold text-sky-700"></p>
          <p id="efficiencyText" class="mt-2 text-sm font-medium text-slate-600"></p>
          <p id="bestResultText" class="mt-2 text-sm font-medium text-slate-600"></p>
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
  ui.bestLabel = document.getElementById('bestLabel')
  ui.levelTitle = document.getElementById('levelTitle')
  ui.editorViewport = document.getElementById('editorViewport')
  ui.textGrid = document.getElementById('textGrid')
  ui.targetWordLabel = document.getElementById('targetWordLabel')
  ui.targetMetaLabel = document.getElementById('targetMetaLabel')
  ui.panelLevelValue = document.getElementById('panelLevelValue')
  ui.panelMovesValue = document.getElementById('panelMovesValue')
  ui.panelOptimalValue = document.getElementById('panelOptimalValue')
  ui.panelBestValue = document.getElementById('panelBestValue')
  ui.overlay = document.getElementById('overlay')
  ui.resultText = document.getElementById('resultText')
  ui.rankText = document.getElementById('rankText')
  ui.efficiencyText = document.getElementById('efficiencyText')
  ui.bestResultText = document.getElementById('bestResultText')
  ui.nextBtn = document.getElementById('nextBtn')
  ui.retryBtn = document.getElementById('retryBtn')
}

function loadBestScores() {
  try {
    const raw = localStorage.getItem(BEST_SCORES_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

function saveBestScores() {
  localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(state.bestScores))
}

function getBestForLevel(levelIndex) {
  const value = state.bestScores[levelIndex]
  return Number.isFinite(value) ? value : null
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

function chooseFlagTarget(lines) {
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
  const pool = filtered.length > 0 ? filtered : candidates
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
  return Math.max(8, Math.floor(width / charWidth))
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

  words.forEach((word, index) => {
    const separator = current.length === 0 ? '' : ' '
    const candidate = `${current}${separator}${word}`

    if (current.length === 0) {
      current = word
      currentStartCol = logicalCol
    } else if (candidate.length <= maxCols) {
      current = candidate
    } else {
      wrapped.push({ text: current, startCol: currentStartCol })
      current = word
      currentStartCol = logicalCol
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
  ui.levelLabel.textContent = `Level ${state.levelIndex + 1} / ${LEVELS.length}`
  ui.movesLabel.textContent = `Moves ${state.moves}`

  const best = getBestForLevel(state.levelIndex)
  ui.bestLabel.textContent = best === null ? 'Best -' : `Best ${best}`
  ui.panelLevelValue.textContent = String(state.levelIndex + 1)
  ui.panelMovesValue.textContent = String(state.moves)
  ui.panelOptimalValue.textContent = String(state.optimalMoves)
  ui.panelBestValue.textContent = best === null ? '-' : String(best)

  if (state.target) {
    ui.targetWordLabel.textContent = `Line ${state.target.line + 1}, Col ${state.target.col + 1}`
    ui.targetMetaLabel.textContent = 'Move the cursor to this exact coordinate.'
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

  const previousBest = getBestForLevel(state.levelIndex)
  const isNewBest = previousBest === null || state.moves < previousBest
  if (isNewBest) {
    state.bestScores[state.levelIndex] = state.moves
    saveBestScores()
  }

  state.isWon = true
  SoundSystem.playChime()
  const rank = getRank(state.moves, state.optimalMoves)
  const isPrecisionBonus = state.moves === state.optimalMoves
  ui.resultText.textContent = `Finished in ${state.moves} moves`
  ui.rankText.textContent = `Rank ${rank}${isPrecisionBonus ? ' ◆' : ''}`
  ui.rankText.className = isPrecisionBonus ? 'precision-bonus' : ''
  ui.efficiencyText.textContent = `Optimal route estimate: ${state.optimalMoves} moves`

  if (isPrecisionBonus) {
    const precisionMsg = document.createElement('p')
    precisionMsg.className = 'precision-msg'
    precisionMsg.textContent = '✨ Perfect route! ✨'
    setTimeout(() => {
      ui.efficiencyText.parentElement.insertBefore(precisionMsg, ui.efficiencyText.nextSibling)
    }, 100)
  }

  const bestAfterWin = getBestForLevel(state.levelIndex)
  ui.bestResultText.textContent = isNewBest
    ? `New best for this level: ${bestAfterWin}`
    : `Best for this level: ${bestAfterWin}`

  updateHud()
  showOverlay()
}

function moveCursor(dx, dy) {
  if (state.isWon) {
    return
  }

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

  SoundSystem.playTick()
  renderFrame()
  checkWin()
}

function setupLevel(index) {
  const wrappedIndex = (index + LEVELS.length) % LEVELS.length
  state.levelIndex = wrappedIndex
  const levelData = LEVELS[wrappedIndex]
  state.documentLines = linesFromParagraphText(levelData.text)
  state.wrappedLines = []
  state.cursor = { line: 0, col: 0 }
  state.preferredCol = 0
  state.moves = 0
  state.isWon = false

  state.target = chooseFlagTarget(state.documentLines)
  reflowDocument(false)
  state.optimalMoves = computeOptimalMoves(state.target)

  hideOverlay()
  ui.rankText.textContent = ''
  ui.efficiencyText.textContent = ''
  ui.levelTitle.textContent = `Level ${wrappedIndex + 1} — ${levelData.title}`

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

state.bestScores = loadBestScores()

createLayout()
bindUiEvents()
setupLevel(0)
