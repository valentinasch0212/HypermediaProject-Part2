"use strict";

// Each tier starts from a known-solvable layout. Puzzle generation scrambles
// that layout using legal moves, so every generated position remains solvable.
// Car tuples are [id, row, column, length, direction]; coordinates are zero-based.
// The target car G is horizontal in row 2 and must reach the right edge.
const SIZE = 6;
const COLORS = ["#8EA66B", "#D8A2A2", "#E4CDA4", "#F0B8B8", "#C5BA96", "#9CB2A1", "#D3A9AF", "#A5B9A0", "#C6A38B", "#D4BDBD", "#B4C48B"];
// Minimum number of moves required to solve a puzzle in each tier.
const MIN_MOVES = [2, 2, 3, 5, 6];
const LEVELS = [
  { name: "Warm Up", difficulty: "Easy · 3 cars", cars: [
    ["G", 2, 0, 2, "H"], ["A", 1, 3, 2, "V"], ["B", 4, 1, 2, "H"]
  ]},
  { name: "Two Obstacles", difficulty: "Easy · 3 cars", cars: [
    ["G", 2, 0, 2, "H"], ["A", 1, 2, 3, "V"], ["B", 0, 4, 3, "V"]
  ]},
  { name: "Side Streets", difficulty: "Medium · 6 cars", cars: [
    ["G", 2, 0, 2, "H"], ["A", 0, 4, 3, "V"], ["B", 3, 3, 3, "H"],
    ["C", 4, 1, 2, "V"], ["D", 3, 0, 2, "V"], ["E", 4, 3, 2, "H"]
  ]},
  { name: "Traffic Jam", difficulty: "Hard · 8 cars", cars: [
    ["G", 2, 0, 2, "H"], ["A", 1, 2, 2, "V"], ["B", 1, 3, 2, "H"],
    ["C", 3, 2, 3, "V"], ["D", 1, 5, 2, "V"], ["E", 2, 4, 3, "V"],
    ["F", 0, 3, 2, "H"], ["H", 5, 4, 2, "H"]
  ]},
  { name: "Gridlock", difficulty: "Expert · 10 cars", cars: [
    ["G", 2, 0, 2, "H"], ["A", 0, 0, 3, "H"], ["B", 0, 3, 2, "H"],
    ["C", 4, 4, 2, "H"], ["D", 3, 1, 3, "H"], ["E", 1, 0, 3, "H"],
    ["F", 4, 3, 2, "V"], ["H", 2, 4, 2, "V"], ["I", 0, 5, 3, "V"],
    ["J", 3, 0, 2, "V"]
  ]}
];

let cars = [];
let initialCars = [];
let puzzleKey = "";
let lastGeneratedKeys = new Set();
let moves = 0;
let currentLevel = 0;
let selectedId = null;
let finished = false;
let history = [];
let drag = null;

// Encode car positions only; IDs and car order stay fixed for a given template.
function layoutKey(state) {
  return state.map(car => `${car.id}:${car.row},${car.col}`).join("|");
}

// Convert a level's compact tuples into mutable car objects with display colors.
function fromTemplate(levelIndex) {
  return LEVELS[levelIndex].cars.map(([id, row, col, length, direction], i) => ({
    id, row, col, length, direction, color: COLORS[i % COLORS.length]
  }));
}

function isVictoryLayout(state) {
  const main = state.find(car => car.id === "G");
  return main.row === 2 && main.direction === "H" && main.col + main.length === SIZE;
}

// Check whether the target can be freed within a move limit. Breadth-first search
// explores each distinct layout once, so the first found victory is a shortest one.
// This is used to reject puzzles that fall below the minimum for their tier.
function solvableWithin(state, maxMoves) {
  if (isVictoryLayout(state)) return true;
  if (maxMoves < 1) return false;
  const visited = new Set([layoutKey(state)]);
  // Store the depth with each layout; advancing head avoids costly array shifts.
  const queue = [[copyCars(state), 0]];
  for (let head = 0; head < queue.length; head++) {
    const [position, depth] = queue[head];
    if (depth >= maxMoves) continue;
    for (let i = 0; i < position.length; i++) {
      const car = position[i];
      for (const sign of [-1, 1]) {
        for (let length = 1; length < SIZE; length++) {
          const distance = sign * length;
          if (allowedDistance(car, distance, position) !== distance) break;
          const next = copyCars(position);
          if (car.direction === "H") next[i].col += distance;
          else next[i].row += distance;
          if (isVictoryLayout(next)) return true;
          const key = layoutKey(next);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push([next, depth + 1]);
          }
        }
      }
    }
  }
  return false;
}

// Scramble a solvable seed with legal moves, then check the tier's minimum depth.
function generatePuzzle(levelIndex, random = Math.random) {
  const source = fromTemplate(levelIndex);
  const seedKey = layoutKey(source);
  const threshold = MIN_MOVES[levelIndex];
  for (let trial = 0; trial < 50; trial++) {
    const state = copyCars(source);
    // Higher tiers receive longer scrambles; avoid repeating the same car twice
    // in a row to reduce immediate back-and-forth moves.
    const amount = 14 + levelIndex * 8 + Math.floor(random() * 18);
    let previousId = null;
    for (let move = 0; move < amount; move++) {
      const options = [];
      for (const car of state) {
        if (car.id === previousId) continue;
        for (const direction of [-1, 1]) {
          for (let distance = 1; distance < SIZE; distance++) {
            const signed = direction * distance;
            if (allowedDistance(car, signed, state) !== signed) break;
            options.push({car, signed});
          }
        }
      }
      if (!options.length) break;
      const choice = options[Math.floor(random() * options.length)];
      if (choice.car.direction === "H") choice.car.col += choice.signed;
      else choice.car.row += choice.signed;
      previousId = choice.car.id;
    }
    const key = layoutKey(state);
    // Keep each accepted board unsolved, distinct from its seed and recent boards,
    // and difficult enough according to the bounded search above.
    if (!isVictoryLayout(state) && key !== seedKey &&
        !lastGeneratedKeys.has(`${levelIndex}:${key}`) &&
        !solvableWithin(state, threshold - 1)) {
      lastGeneratedKeys.add(`${levelIndex}:${key}`);
      if (lastGeneratedKeys.size > 250) lastGeneratedKeys.clear();
      return state;
    }
  }
  // Preserve guaranteed playability if all randomized attempts are rejected.
  return source;
}

function getElement(id) {
  return document.getElementById(id);
}

// Clone car records before changing positions, keeping saved game states isolated.
const copyCars = value => value.map(car => ({ ...car }));

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(el => el.classList.toggle("hidden", el.id !== id));
}

// Best scores are optional: restricted browsers may deny localStorage access.
function getBest(key = puzzleKey) {
  try {
    const value = Number(localStorage.getItem(`rush-hour-best-board-${key}`));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch { return null; }
}
function saveBest(key, score) {
  const previous = getBest(key);
  if (previous === null || score < previous) {
    try { localStorage.setItem(`rush-hour-best-board-${key}`, String(score)); } catch { /* Storage is optional. */ }
    return true;
  }
  return false;
}

// Build level buttons with text nodes rather than injecting HTML.
function renderLevelList() {
  const levelList = getElement("level-list");
  levelList.replaceChildren();

  LEVELS.forEach((level, index) => {
    const button = document.createElement("button");
    const number = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("small");

    button.type = "button";
    button.className = "level-card";
    number.className = "level-number";
    number.textContent = `Level ${index + 1}`;
    title.textContent = level.name;
    description.textContent = `${level.difficulty} · At least ${MIN_MOVES[index]} moves`;

    button.append(number, title, description);
    button.addEventListener("click", () => startLevel(index));
    levelList.appendChild(button);
  });
}

function startLevel(index, newPuzzle = true) {
  currentLevel = index;
  if (newPuzzle || !initialCars.length) {
    // Restart reuses this snapshot; choosing a new puzzle replaces it.
    initialCars = generatePuzzle(index);
    puzzleKey = `${index}:${layoutKey(initialCars)}`;
  }
  cars = copyCars(initialCars);
  moves = 0;
  history = [];
  selectedId = null;
  finished = false;
  drag = null;
  getElement("game-subtitle").textContent = `Level ${index + 1} · Random puzzle`;
  getElement("level-name").textContent = LEVELS[index].name;
  getElement("selected-info").textContent = "Select a car to move";
  showScreen("game-screen");
  renderBoard();
}

// Build a cell lookup table used by movement checks; null marks an empty square.
function occupiedCells(state = cars) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (const car of state) {
    for (let offset = 0; offset < car.length; offset++) {
      const r = car.row + (car.direction === "V" ? offset : 0);
      const c = car.col + (car.direction === "H" ? offset : 0);
      grid[r][c] = car.id;
    }
  }
  return grid;
}

// Return the furthest legal displacement in the requested direction. Checking
// each newly entered cell prevents cars from jumping over blockers or off-board.
function allowedDistance(car, signedDistance, state = cars) {
  if (!Number.isInteger(signedDistance) || signedDistance === 0) return 0;
  const grid = occupiedCells(state);
  const sign = Math.sign(signedDistance);
  const butterfly = car.direction === "H" ? "col" : "row";
  let travelled = 0;
  for (let step = 1; step <= Math.abs(signedDistance); step++) {
    // Only the leading edge enters new cells as the car slides.
    const next = car[butterfly] + (sign > 0 ? car.length - 1 + step : -step);
    if (next < 0 || next >= SIZE) break;
    const r = car.direction === "V" ? next : car.row;
    const c = car.direction === "H" ? next : car.col;
    if (grid[r][c] !== null && grid[r][c] !== car.id) break;
    travelled += sign;
  }
  return travelled;
}

// One move is one user action, even when the car slides across several cells.
function moveCar(id, signedDistance) {
  if (finished) return false;
  const car = cars.find(item => item.id === id);
  if (!car) return false;
  const permitted = allowedDistance(car, signedDistance);
  if (!permitted) return false;
  history.push({ cars: copyCars(cars), selectedId, moves });
  if (car.direction === "H") car.col += permitted;
  else car.row += permitted;
  moves++;
  renderBoard();
  checkVictory();
  return true;
}

function selectCar(id) {
  selectedId = id;
  const car = cars.find(item => item.id === id);
  getElement("selected-info").textContent = `Selected: ${id} · ${car.direction === "H" ? "horizontal ↔" : "vertical ↕"}`;
  document.querySelectorAll(".car").forEach(el => {
    const chosen = el.dataset.carId === id;
    el.classList.toggle("selected", chosen);
    el.setAttribute("aria-pressed", String(chosen));
  });
}

function renderBoard() {
  const board = getElement("board");
  board.replaceChildren();
  cars.forEach(car => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "car";
    el.dataset.carId = car.id;
    el.textContent = car.id;
    el.setAttribute("aria-label", `Car ${car.id}, ${car.direction === "H" ? "horizontal" : "vertical"}, row ${car.row + 1}, column ${car.col + 1}`);
    el.setAttribute("aria-pressed", String(car.id === selectedId));
    if (car.id === selectedId) el.classList.add("selected");
    // Position and size each car as a fraction of the square board.
    el.style.cssText = `left:${car.col / SIZE * 100}%;top:${car.row / SIZE * 100}%;width:${(car.direction === "H" ? car.length : 1) / SIZE * 100}%;height:${(car.direction === "V" ? car.length : 1) / SIZE * 100}%;background:${car.color};`;
    el.addEventListener("pointerdown", event => beginDrag(event, car, el));
    el.addEventListener("pointermove", updateDrag);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", cancelDrag);
    el.addEventListener("click", () => selectCar(car.id));
    board.append(el);
  });
  getElement("move-count").textContent = moves;
  getElement("best-count").textContent = getBest() ?? "—";
  getElement("undo-button").disabled = history.length === 0;
}

function beginDrag(event, car, el) {
  if (finished || event.button !== 0) return;
  selectCar(car.id);
  // Pointer capture keeps drag events flowing even after the pointer leaves the car.
  drag = { pointerId: event.pointerId, id: car.id, startX: event.clientX, startY: event.clientY, el, distance: 0 };
  el.classList.add("dragging");
  el.setPointerCapture(event.pointerId);
}

function updateDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const car = cars.find(item => item.id === drag.id);
  const board = getElement("board");
  const cellPixels = board.getBoundingClientRect().width / SIZE;
  const pixels = car.direction === "H" ? event.clientX - drag.startX : event.clientY - drag.startY;
  // Snap pointer movement to whole cells, then clamp it to legal board movement.
  const wanted = Math.round(pixels / cellPixels);
  const permitted = allowedDistance(car, wanted);
  drag.distance = permitted;
  // Preview only the legal snapped position; commit it on pointer release.
  if (car.direction === "H") drag.el.style.left = `${(car.col + permitted) / SIZE * 100}%`;
  else drag.el.style.top = `${(car.row + permitted) / SIZE * 100}%`;
}

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  updateDrag(event);
  const { id, distance } = drag;
  drag = null;
  if (!moveCar(id, distance)) renderBoard();
}
function cancelDrag(event) {
  if (drag && event.pointerId === drag.pointerId) {
    drag = null;
    renderBoard();
  }
}

function moveSelected(direction) {
  if (!selectedId || finished) return;
  const car = cars.find(item => item.id === selectedId);
  const horizontal = direction === "left" || direction === "right";
  if ((car.direction === "H") !== horizontal) return;
  moveCar(car.id, direction === "right" || direction === "down" ? 1 : -1);
}

function undo() {
  if (finished || history.length === 0) return;
  const previous = history.pop();
  cars = copyCars(previous.cars);
  selectedId = previous.selectedId;
  moves = previous.moves;
  getElement("selected-info").textContent = selectedId ? `Selected: ${selectedId}` : "Select a car to move";
  renderBoard();
}

function checkVictory() {
  const main = cars.find(car => car.id === "G");
  if (main.row !== 2 || main.direction !== "H" || main.col + main.length !== SIZE) return;
  finished = true;
  const newBest = saveBest(puzzleKey, moves);
  getElement("final-count").textContent = moves;
  getElement("final-best").textContent = getBest() ?? moves;
  getElement("record-message").textContent = newBest ? "New personal best!" : "Well played! Try to beat your best.";
  getElement("next-button").hidden = currentLevel === LEVELS.length - 1;
  showScreen("victory-screen");
}

// Register browser UI handlers only when a DOM is available, so game rules can
// also be imported by the Node tests.
if (typeof document !== "undefined") {
// Keyboard arrows and on-screen controls share moveSelected to enforce one rule path.
document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("click", () => moveSelected(button.dataset.direction));
});
document.addEventListener("keydown", event => {
  if (getElement("game-screen").classList.contains("hidden")) return;
  const direction = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[event.key];
  if (direction) { event.preventDefault(); moveSelected(direction); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); }
});
getElement("undo-button").addEventListener("click", undo);
getElement("restart-button").addEventListener("click", () => startLevel(currentLevel, false));
getElement("new-puzzle-button").addEventListener("click", () => startLevel(currentLevel, true));
document.querySelectorAll('[data-action="menu"]').forEach(button => {
  button.addEventListener("click", () => { drag = null; renderLevelList(); showScreen("menu-screen"); });
});
getElement("home-link").addEventListener("click", event => { event.preventDefault(); drag = null; renderLevelList(); showScreen("menu-screen"); });
getElement("next-button").addEventListener("click", () => {
  if (currentLevel + 1 < LEVELS.length) startLevel(currentLevel + 1);
});

renderLevelList();
}

// Export the game rules and puzzle helpers for Node tests without a browser library.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, MIN_MOVES, SIZE, occupiedCells, allowedDistance, fromTemplate, generatePuzzle, layoutKey, isVictoryLayout, solvableWithin };
}
