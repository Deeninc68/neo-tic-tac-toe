const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];
const cells = [...document.querySelectorAll('.cell')];
const statusText = document.querySelector('#status-text');
const statusMark = document.querySelector('#status-mark');
const turnDot = document.querySelector('#turn-dot');
const difficulty = document.querySelector('#difficulty');
let board = Array(9).fill('');
let turn = 'X';
let mode = 'computer';
let finished = false;
let thinking = false;
let computerTimer;
let roundNumber = 0;

function loadScores() {
  try {
    const saved = JSON.parse(localStorage.getItem('cross-circle-scores'));
    return Object.fromEntries(['computer', 'friend'].map(key => [key,
      Object.fromEntries(['X', 'O', 'draw'].map(mark => [mark,
        Number.isSafeInteger(saved?.[key]?.[mark]) && saved[key][mark] >= 0 ? saved[key][mark] : 0
      ]))
    ]));
  } catch {
    return { computer: { X: 0, O: 0, draw: 0 }, friend: { X: 0, O: 0, draw: 0 } };
  }
}
const scores = loadScores();

function updateScores() {
  document.querySelector('#score-x').textContent = scores[mode].X;
  document.querySelector('#score-o').textContent = scores[mode].O;
  document.querySelector('#score-draw').textContent = scores[mode].draw;
  try { localStorage.setItem('cross-circle-scores', JSON.stringify(scores)); } catch { /* Play remains available without storage. */ }
}

function resultFor(position) {
  for (const line of winningLines) {
    if (position[line[0]] && line.every(index => position[index] === position[line[0]])) {
      return { winner: position[line[0]], line };
    }
  }
  return position.every(Boolean) ? { winner: 'draw', line: [] } : null;
}

function setStatus(text, mark = turn) {
  statusText.textContent = text;
  statusMark.textContent = mark === 'X' ? '×' : mark === 'O' ? '○' : '=';
  statusMark.className = `status-mark ${mark === 'O' ? 'o' : 'x'}`;
  turnDot.style.background = mark === 'O' ? 'var(--blue)' : 'var(--purple)';
  turnDot.style.opacity = finished ? '0' : '1';
}

function render() {
  cells.forEach((cell, index) => {
    cell.replaceChildren();
    if (board[index]) {
      const mark = document.createElement('span');
      mark.className = `mark ${board[index].toLowerCase()}`;
      mark.setAttribute('aria-hidden', 'true');
      cell.append(mark);
    }
    cell.disabled = Boolean(board[index]) || finished || thinking;
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${board[index] || 'empty'}`);
  });
}

function play(index) {
  if (finished || board[index]) return;
  board[index] = turn;
  const result = resultFor(board);
  if (result) {
    finished = true;
    scores[mode][result.winner]++;
    updateScores();
    render();
    result.line.forEach(i => cells[i].classList.add('winner'));
    if (result.winner === 'draw') setStatus('A draw. Great minds think alike.', 'draw');
    else if (mode === 'computer') setStatus(result.winner === 'X' ? 'You won! Nicely played.' : 'Computer wins. Rematch?', result.winner);
    else setStatus(`Player ${result.winner} wins. Bragging rights secured.`, result.winner);
    return;
  }
  turn = turn === 'X' ? 'O' : 'X';
  if (mode === 'computer' && turn === 'O') {
    thinking = true;
    setStatus('Computer is thinking…', 'O');
    render();
    const currentRound = roundNumber;
    computerTimer = setTimeout(() => {
      if (roundNumber !== currentRound) return;
      const move = chooseComputerMove();
      thinking = false;
      play(move);
    }, 550);
  } else {
    setStatus(mode === 'computer' ? 'Your turn. Make it count.' : `Player ${turn}, your move.`);
    render();
  }
}

function minimax(position, player, depth = 0) {
  const result = resultFor(position);
  if (result) return result.winner === 'O' ? 10 - depth : result.winner === 'X' ? depth - 10 : 0;
  let best = player === 'O' ? -Infinity : Infinity;
  position.forEach((value, i) => {
    if (value) return;
    position[i] = player;
    const score = minimax(position, player === 'O' ? 'X' : 'O', depth + 1);
    position[i] = '';
    best = player === 'O' ? Math.max(best, score) : Math.min(best, score);
  });
  return best;
}

function chooseComputerMove() {
  const empty = board.map((value, i) => value ? -1 : i).filter(i => i !== -1);
  if (difficulty.value === 'easy' || (difficulty.value === 'medium' && Math.random() < 0.35)) {
    return empty[Math.floor(Math.random() * empty.length)];
  }
  let bestScore = -Infinity;
  let bestMoves = [];
  for (const i of empty) {
    const position = [...board];
    position[i] = 'O';
    const score = minimax(position, 'X');
    if (score > bestScore) { bestScore = score; bestMoves = [i]; }
    else if (score === bestScore) bestMoves.push(i);
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function newRound() {
  clearTimeout(computerTimer);
  roundNumber++;
  board = Array(9).fill('');
  turn = 'X';
  finished = false;
  thinking = false;
  cells.forEach(cell => cell.classList.remove('winner'));
  render();
  setStatus(mode === 'computer' ? 'Your turn. Make it count.' : 'Player X, your move.');
}

cells.forEach((cell, index) => {
  cell.addEventListener('click', () => {
    if (!thinking) play(index);
  });
  cell.addEventListener('keydown', event => {
    const offsets = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    for (let step = 1; step <= 9; step++) {
      const next = (index + offsets[event.key] * step + 90) % 9;
      if (!cells[next].disabled) { cells[next].focus(); break; }
    }
  });
});

document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    document.querySelector('#difficulty-section').hidden = mode === 'friend';
    document.querySelector('#x-name').textContent = mode === 'friend' ? 'Player X' : 'You';
    document.querySelector('#o-name').textContent = mode === 'friend' ? 'Player O' : 'Computer';
    updateScores();
    newRound();
  });
});
difficulty.addEventListener('change', newRound);
document.querySelector('#new-round').addEventListener('click', newRound);
document.querySelector('#reset-scores').addEventListener('click', () => {
  scores[mode] = { X: 0, O: 0, draw: 0 };
  updateScores();
  newRound();
});
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    newRound();
  }
});
updateScores();
newRound();
