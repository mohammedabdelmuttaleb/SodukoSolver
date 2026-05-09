'use strict';

const state = {
  board: [],
  solution: [],
  given: [],
  notes: [],
  selected: null,
  notesMode: false,
  difficulty: 'easy',
  errors: 0,
  maxErrors: 3,
  score: 0,
  hints: 3,
  timerInterval: null,
  seconds: 0,
  gameActive: false,
};

const CLUES = { easy: 38, medium: 30, hard: 24, expert: 18 };

const boardEl        = document.getElementById('board');
const timerEl        = document.getElementById('timer');
const errorCountEl   = document.getElementById('error-count');
const scoreEl        = document.getElementById('score');
const hintCountEl    = document.getElementById('hint-count');
const progressRing   = document.getElementById('progress-ring');
const progressText   = document.getElementById('progress-text');
const freqGridEl     = document.getElementById('freq-grid');
const notesIndicator = document.getElementById('notes-indicator');

function emptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === num) return false;
  return true;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


function getPeers(r, c) {
  const peers = new Set();
  for (let i = 0; i < 9; i++) {
    peers.add(`${r},${i}`);
    peers.add(`${i},${c}`);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++)
    for (let j = bc; j < bc + 3; j++)
      peers.add(`${i},${j}`);

  peers.delete(`${r},${c}`);
  return [...peers].map(s => s.split(',').map(Number));
}

function buildCandidates(grid) {
  const candidates = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  );
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] !== 0) {
        candidates[r][c] = new Set();
        for (const [pr, pc] of getPeers(r, c))
          candidates[pr][pc].delete(grid[r][c]);
      }
  return candidates;
}

function selectMRV(grid, candidates) {
  let best = null, minSize = Infinity;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] === 0 && candidates[r][c].size < minSize) {
        minSize = candidates[r][c].size;
        best = [r, c];
      }
  return best;
}

function forwardCheck(grid, candidates, r, c, num) {
  const removed = [];
  for (const [pr, pc] of getPeers(r, c)) {
    if (grid[pr][pc] === 0 && candidates[pr][pc].has(num)) {
      candidates[pr][pc].delete(num);
      removed.push([pr, pc, num]);
      if (candidates[pr][pc].size === 0) return null;
    }
  }
  return removed;
}

function restoreCandidates(candidates, removed) {
  if (removed)
    for (const [r, c, num] of removed)
      candidates[r][c].add(num);
}

function cspBacktrack(grid, candidates, moves) {
  const cell = selectMRV(grid, candidates);
  if (!cell) return true;

  const [r, c] = cell;
  for (const num of candidates[r][c]) {
    grid[r][c] = num;
    const removed = forwardCheck(grid, candidates, r, c, num);

    if (removed !== null) {
      moves.push([r, c, num]);
      if (cspBacktrack(grid, candidates, moves)) return true;
      moves.pop();
    }

    grid[r][c] = 0;
    restoreCandidates(candidates, removed);
  }
  return false;
}


function cspSolve(grid) {
  const copy = grid.map(r => [...r]);
  const candidates = buildCandidates(copy);
  const moves = [];
  return cspBacktrack(copy, candidates, moves) ? moves : null;
}


function solveSudoku(grid) {
  const candidates = buildCandidates(grid);

  function backtrack() {
    const cell = selectMRV(grid, candidates);
    if (!cell) return true;

    const [r, c] = cell;
    const nums = shuffle([...candidates[r][c]]);

    for (const num of nums) {
      grid[r][c] = num;
      const removed = forwardCheck(grid, candidates, r, c, num);

      if (removed !== null && backtrack()) return true;

      grid[r][c] = 0;
      restoreCandidates(candidates, removed);
    }
    return false;
  }

  return backtrack();
}


function countSolutions(grid, limit = 2) {
  let count = 0;
  function solve() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              solve();
              if (count >= limit) { grid[row][col] = 0; return; }
              grid[row][col] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve();
  return count;
}

function generatePuzzle(difficulty) {
  const solution = emptyGrid();
  solveSudoku(solution);

  const puzzle = solution.map(r => [...r]);
  const clues = CLUES[difficulty] || 30;
  const cellsToRemove = 81 - clues;

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    puzzle[r][c] = 0;
    removed++;
  }

  return { puzzle, solution };
}

function isValidMove(board, row, col, num) {
  if (num === 0) return true;
  const prev = board[row][col];
  board[row][col] = 0;
  const ok = isValid(board, row, col, num);
  board[row][col] = prev;
  return ok;
}

function isCompleteByRules(board) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val === 0 || !isValidMove(board, r, c, val)) return false;
    }
  return true;
}

function startGame() {
  const { puzzle, solution } = generatePuzzle(state.difficulty);

  state.board = puzzle.map(r => [...r]);
  state.solution = solution;
  state.given = puzzle.map(r => r.map(v => v !== 0));
  state.notes = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );
  state.selected = null;
  state.errors = 0;
  state.score = 0;
  state.hints = 3;
  state.seconds = 0;
  state.gameActive = true;

  updateErrorDisplay();
  updateScore();
  hintCountEl.textContent = state.hints;
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimer, 1000);

  renderBoard();
  updateProgress();
  updateFreq();

  document.getElementById('win-overlay').classList.remove('visible');
  document.getElementById('gameover-overlay').classList.remove('visible');
}

function tickTimer() {
  if (!state.gameActive) return;
  state.seconds++;
  const m = String(Math.floor(state.seconds / 60)).padStart(2, '0');
  const s = String(state.seconds % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (state.given[row][col]) {
        cell.classList.add('given');
        cell.textContent = state.board[row][col];
      } else {
        const val = state.board[row][col];
        if (val !== 0) {
          cell.classList.add('user-input');
          cell.textContent = val;
          if (!isValidMove(state.board, row, col, val))
            cell.classList.add('error');
        } else {
          renderNotes(cell, row, col);
        }
      }

      cell.addEventListener('click', () => selectCell(row, col));
      boardEl.appendChild(cell);
    }
  }
  applyHighlights();
}

function renderNotes(cell, row, col) {
  const noteSet = state.notes[row][col];
  if (noteSet.size === 0) return;

  const grid = document.createElement('div');
  grid.classList.add('notes-grid');
  for (let n = 1; n <= 9; n++) {
    const span = document.createElement('span');
    span.classList.add('note-num');
    if (noteSet.has(n)) {
      span.textContent = n;
      span.classList.add('active');
    }
    grid.appendChild(span);
  }
  cell.appendChild(grid);
}

function selectCell(row, col) {
  state.selected = { row, col };
  applyHighlights();
}

function applyHighlights() {
  const cells = boardEl.querySelectorAll('.cell');
  cells.forEach(cell => cell.classList.remove('selected', 'highlight', 'same-num'));

  if (!state.selected) return;
  const { row, col } = state.selected;
  const selVal = state.board[row][col];

  cells.forEach(cell => {
    const r = +cell.dataset.row;
    const c = +cell.dataset.col;

    if (r === row && c === col) { cell.classList.add('selected'); return; }

    const sameBox =
      Math.floor(r / 3) === Math.floor(row / 3) &&
      Math.floor(c / 3) === Math.floor(col / 3);

    if (r === row || c === col || sameBox) cell.classList.add('highlight');

    if (selVal !== 0 && state.board[r][c] === selVal) {
      cell.classList.add('same-num');
      cell.classList.remove('highlight');
    }
  });
}

function inputNumber(num) {
  if (!state.selected || !state.gameActive) return;
  const { row, col } = state.selected;
  if (state.given[row][col]) return;

  if (state.notesMode && num !== 0) {
    const noteSet = state.notes[row][col];
    if (noteSet.has(num)) noteSet.delete(num);
    else noteSet.add(num);
    state.board[row][col] = 0;
    renderBoard();
    return;
  }

  if (num === 0) {
    state.board[row][col] = 0;
    state.notes[row][col].clear();
    renderBoard();
    updateFreq();
    updateProgress();
    return;
  }

  state.notes[row][col].clear();
  state.board[row][col] = num;

  if (!isValidMove(state.board, row, col, num)) {
    state.errors++;
    updateErrorDisplay();
    renderBoard();
    flashCell(row, col, 'error');
    if (state.errors >= state.maxErrors) setTimeout(gameOver, 600);
  } else {
    clearRelatedNotes(row, col, num);
    const pts = { easy: 10, medium: 15, hard: 20, expert: 30 };
    state.score += pts[state.difficulty] || 10;
    updateScore();
    renderBoard();
    flashCell(row, col, 'solved');
    updateProgress();
    updateFreq();
    if (isBoardComplete()) setTimeout(winGame, 500);
  }
}

function clearRelatedNotes(row, col, num) {
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let i = 0; i < 9; i++) {
    state.notes[row][i].delete(num);
    state.notes[i][col].delete(num);
  }
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      state.notes[r][c].delete(num);
}

function flashCell(row, col, cls) {
  const cell = getCellEl(row, col);
  if (!cell) return;
  cell.classList.add(cls);
  setTimeout(() => cell.classList.remove(cls), 600);
}

function getCellEl(row, col) {
  return boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function isBoardComplete() {
  return isCompleteByRules(state.board);
}

function winGame() {
  state.gameActive = false;
  clearInterval(state.timerInterval);

  const timeBonus = Math.max(0, 300 - state.seconds) * 2;
  state.score += timeBonus;
  updateScore();

  document.getElementById('ov-time').textContent = formatTime(state.seconds);
  document.getElementById('ov-errors').textContent = `${state.errors}/${state.maxErrors}`;
  document.getElementById('ov-score').textContent = state.score;
  document.getElementById('win-overlay').classList.add('visible');
}

function gameOver() {
  state.gameActive = false;
  clearInterval(state.timerInterval);
  document.getElementById('gameover-overlay').classList.add('visible');
}

function useHint() {
  if (!state.gameActive || state.hints <= 0) return;

  const candidates = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (!state.given[r][c] && state.board[r][c] !== state.solution[r][c])
        candidates.push([r, c]);

  if (candidates.length === 0) return;

  shuffle(candidates);
  const [row, col] = candidates[0];

  state.board[row][col] = state.solution[row][col];
  state.notes[row][col].clear();
  clearRelatedNotes(row, col, state.solution[row][col]);
  state.hints--;
  hintCountEl.textContent = state.hints;

  renderBoard();
  flashCell(row, col, 'hint-flash');
  updateProgress();
  updateFreq();

  state.selected = { row, col };
  applyHighlights();

  if (isBoardComplete()) setTimeout(winGame, 500);
}


function autoSolve() {
  if (!state.gameActive) return;

  const cleanBoard = state.board.map((row, r) =>
    row.map((val, c) => {
      if (state.given[r][c]) return val;
      return val === state.solution[r][c] ? val : 0; 
    })
  );

  const moves = cspSolve(cleanBoard);
  if (!moves) return; 

  const speed = 30;
  moves.forEach(([row, col, num], i) => {
    setTimeout(() => {
      state.board[row][col] = num;
      state.notes[row][col].clear();
      renderBoard();
      updateProgress();
      updateFreq();
      if (isBoardComplete()) setTimeout(winGame, 300);
    }, i * speed);
  });
}


function updateProgress() {
  let filled = 0;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] !== 0 && isValidMove(state.board, r, c, state.board[r][c]))
        filled++;

  const pct = Math.round((filled / 81) * 100);
  const circumference = 201;
  progressRing.style.strokeDashoffset = circumference - (circumference * pct / 100);
  progressText.textContent = `${pct}%`;
}

function updateFreq() {
  const counts = Array(10).fill(0);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] > 0) counts[state.board[r][c]]++;

  freqGridEl.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const item = document.createElement('div');
    item.classList.add('freq-item');

    const numEl = document.createElement('div');
    numEl.classList.add('freq-num');
    numEl.textContent = n;

    const barEl = document.createElement('div');
    barEl.classList.add('freq-bar');

    const fillEl = document.createElement('div');
    fillEl.classList.add('freq-fill');
    fillEl.style.width = `${(counts[n] / 9) * 100}%`;
    if (counts[n] === 9) fillEl.classList.add('complete');

    barEl.appendChild(fillEl);

    const cntEl = document.createElement('div');
    cntEl.classList.add('freq-count');
    cntEl.textContent = `${counts[n]}/9`;

    item.appendChild(numEl);
    item.appendChild(barEl);
    item.appendChild(cntEl);

    if (counts[n] === 9) {
      numEl.style.color = 'var(--accent3)';
      item.style.opacity = '.5';
    }

    freqGridEl.appendChild(item);
  }

  document.querySelectorAll('.num-btn').forEach(btn => {
    const n = +btn.dataset.num;
    if (counts[n] === 9) btn.classList.add('disabled');
    else btn.classList.remove('disabled');
  });
}

function updateErrorDisplay() {
  errorCountEl.innerHTML = `${state.errors}<span class="stat-max">/${state.maxErrors}</span>`;
  if (state.errors >= state.maxErrors)
    errorCountEl.parentElement.style.borderColor = 'var(--error-color)';
}

function updateScore() {
  scoreEl.textContent = state.score;
}

function toggleNotes() {
  state.notesMode = !state.notesMode;
  notesIndicator.textContent = state.notesMode ? 'ON' : 'OFF';
  notesIndicator.classList.toggle('on', state.notesMode);
}

document.addEventListener('keydown', (e) => {
  if (!state.gameActive) return;

  if (state.selected && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    let { row, col } = state.selected;
    if (e.key === 'ArrowUp')    row = Math.max(0, row - 1);
    if (e.key === 'ArrowDown')  row = Math.min(8, row + 1);
    if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1);
    if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
    selectCell(row, col);
    return;
  }

  if (e.key >= '1' && e.key <= '9') { inputNumber(+e.key); highlightNumBtn(+e.key); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { inputNumber(0); return; }
  if (e.key.toLowerCase() === 'n') { toggleNotes(); return; }
});

function highlightNumBtn(num) {
  document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active-num'));
  const btn = document.querySelector(`.num-btn[data-num="${num}"]`);
  if (btn) {
    btn.classList.add('active-num');
    setTimeout(() => btn.classList.remove('active-num'), 200);
  }
}

document.getElementById('new-game-btn').addEventListener('click', startGame);
document.getElementById('hint-btn').addEventListener('click', useHint);
document.getElementById('erase-btn').addEventListener('click', () => inputNumber(0));
document.getElementById('notes-btn').addEventListener('click', toggleNotes);
document.getElementById('solve-btn').addEventListener('click', autoSolve);
document.getElementById('ov-new-btn').addEventListener('click', startGame);
document.getElementById('go-new-btn').addEventListener('click', startGame);

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.level;
  });
});

document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const num = +btn.dataset.num;
    inputNumber(num);
    highlightNumBtn(num);
  });
});

startGame();