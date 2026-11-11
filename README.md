# Rush Hour — Random Puzzle Game

**Hypermedia Project Part 2-Universitat de Girona**

**Team members:** 
**Course:** Multimedia and User Interfaces 
**Project:** Rush Hour web game  
**Technologies:** HTML5, CSS3 and JavaScript


## 1. Project overview

Rush Hour is a single-player sliding-block puzzle played on a **6 × 6 board**. Several cars obstruct the way to an exit on the right. The player must move the blocking vehicles until the **green car (G)** can reach that exit. A horizontal vehicle moves only left or right; a vertical vehicle moves only up or down. Vehicles cannot overlap, jump over one another, or move beyond the grid.

Our implementation follows these core Rush Hour rules and adds **five difficulty categories with randomized, solvable puzzles**, mouse/touch dragging, keyboard and on-screen controls, an undo feature, puzzle restart, new puzzle generation, and personal best scores.

The entire website runs in the browser. It does not use external frameworks, libraries, images, servers, user accounts, or network requests.

## 2. How to run the game

1. Extract the submitted ZIP file.
2. Open the project folder.
3. Open `index.html` in a modern browser. Alternatively, use **Live Server** in Visual Studio Code.
4. On the main menu, select one of the five level cards to create a puzzle.

**No installation, compilation, or build process is required.** An internet connection is not necessary for gameplay.

## 3. How to play

1. Choose a difficulty level from the main menu.
2. Identify the green car marked **G**. Its target is the opening on the right side of the third row (row index 2 in code).
3. Select any vehicle and move it **along its own orientation**:
   - **Mouse or touch:** drag a car.
   - **Keyboard:** click/select a car, then use the arrow keys.
   - **On-screen buttons:** select a car and use the four direction buttons.
4. Move the other vehicles to clear a passage for G.
5. The game ends when G reaches the right-hand exit. The victory screen displays the score and the best recorded score for that exact puzzle arrangement.

**Scoring convention:** one completed sliding action counts as **one move**, even when a vehicle travels multiple cells in that single action. Moving a car by one cell with an arrow key is also one action. Invalid movements do not increase the move counter.

### Game controls

| Control | Behavior |
| --- | --- |
| **Back to levels** / top-left **Rush Hour** | Return to the main menu |
| **Undo** | Reverse the most recent valid move and restore the previous move count |
| **Restart** | Reset the **same puzzle** to its initial arrangement and zero moves |
| **New puzzle** | Generate a fresh arrangement in the current difficulty category |
| **Choose a level** (victory screen) | Return to the level-selection menu |
| **Next level** (victory screen) | Start a new puzzle in the next category; not shown on the final level |
| **Ctrl+Z / Cmd+Z** | Keyboard shortcut for Undo while playing |

## 4. Screens and navigation

The interface has three main screens, implemented as semantic HTML sections and shown or hidden with JavaScript.

### 4.1 Main menu

The menu shows the game title, a concise explanation of the goal, three short gameplay instructions, and **five clickable level cards**. A card identifies its level number, name, approximate difficulty, vehicle count, and minimum allowed solution length. Selecting a card starts a new puzzle.

### 4.2 Game screen

The game screen displays the current level, the 6 × 6 grid, an indicated exit, a live move counter, the best score (if available), a selected-car indicator, directional controls, and **Undo / Restart / New puzzle** buttons. The menu remains accessible without reloading the page.

### 4.3 Victory screen

When the green vehicle reaches the exit, the game displays a success message, the moves used, the best stored score, feedback about a new record where applicable, and options to choose another level or continue to the next one.

## 5. Difficulty categories and random puzzles

| Category | Name | Number of vehicles | Enforced minimum solution length for generated boards |
| --- | --- | ---: | ---: |
| Level 1 | Warm Up | 3 | 2 moves |
| Level 2 | Two Obstacles | 3 | 2 moves |
| Level 3 | Side Streets | 6 | 3 moves |
| Level 4 | Traffic Jam | 8 | 5 moves |
| Level 5 | Gridlock | 10 | 6 moves |

The levels are **difficulty categories**, not five unchanging boards. Choosing a category normally gives a different arrangement. The minimum values above are filtering thresholds—not promises that every puzzle has exactly that many moves, nor a strict ranking of every generated puzzle against every other one.

### 5.1 Why the cars are not placed at arbitrary random coordinates

Naively assigning random rows and columns can produce overlaps, out-of-bounds vehicles, or puzzles with no solution. To preserve the rules, `LEVELS` in `script.js` contains a known solvable *seed arrangement* for each category.

`generatePuzzle()` copies the relevant seed and repeatedly chooses **legal, reversible slides** with `Math.random()`. Because the resulting board can be moved back to the solvable seed, it remains solvable. The algorithm then rejects a candidate if it already represents a victory, is identical to the seed, was recently generated, or has a solution shorter than the category's required minimum.

To check the minimum difficulty, `solvableWithin()` performs **bounded breadth-first search (BFS)**: it explores reachable board states only up to a specified number of moves. If a solution is found *below* the threshold, the candidate is rejected. The generator tries up to **50 candidates**. If none satisfies its conditions, it falls back to the verified seed arrangement, so the game still provides a playable, solvable puzzle.

**Design trade-off:** this approach prioritizes valid, solvable puzzles and low implementation complexity over perfectly uniform random generation. Rare repeats or a seed fallback are possible. We intentionally did not add more complex generation guarantees because they are unnecessary for the Rush Hour requirements.

### 5.2 Restart versus New puzzle

These two actions deliberately differ. **Restart** lets a player retry the *same challenge* fairly, while **New puzzle** provides variety and replayability. This distinction avoids changing the puzzle unexpectedly when the player simply wants a second attempt.

## 6. Project files

```text
RushHour/
├── index.html   # Semantic structure of the menu, game and victory screens
├── style.css    # Layout, typography, colors, responsive rules and transitions
├── script.js    # Game data, generation, movement, events, scores and UI updates
└── README.md    # Project description, instructions and design/technical report
```

- **`index.html`** contains the content and user-interface elements. It links to the external stylesheet and the deferred JavaScript file.
- **`style.css`** controls presentation, including the grid background, vehicle dimensions and positioning, interaction states, responsive breakpoints and animations.
- **`script.js`** manages data and browser interaction. It uses named functions and standard DOM APIs, with comments for the most important algorithms.
- **`README.md`** also serves as the project report, including the requested justification of the user interface and interaction decisions.

## 7. Technical implementation

### 7.1 Vehicle representation

Each car is represented by a JavaScript object with an identifier, starting row, starting column, length, movement orientation and color. Rows and columns are **zero-based** (`0` to `5`). The green target is always **G**, horizontal, in row index `2`.

Example representation:

```javascript
{
  id: "G",
  row: 2,
  col: 0,
  length: 2,
  direction: "H",
  color: "#8EA66B"
}
```

The game keeps `initialCars` for the puzzle's starting state and `cars` for its current state. Copying objects prevents a player's moves from silently changing the stored start of the puzzle.

### 7.2 Drawing and updating the board

`renderBoard()` creates vehicle buttons with `document.createElement()`, assigns labels and styles, places them using CSS percentages derived from the grid coordinates, and registers pointer/click listeners. The board background is drawn with CSS; no image assets are needed.

`showScreen()` changes the visible section without loading a new HTML page. Counters, selection feedback and records are updated through the DOM (`textContent`, classes and element attributes).

### 7.3 Collision detection and movement

`occupiedCells()` builds a **6 × 6 occupancy matrix**. Each cell is either empty (`null`) or contains the ID of the vehicle occupying it.

`allowedDistance()` checks a proposed slide **cell by cell**, verifies the board boundaries and blocks any square occupied by another car. It returns the permitted displacement, which can be shorter than the distance requested by the user. This prevents a drag action from jumping over an obstacle.

`moveCar()` applies the validated movement, saves the previous state to `history`, increases the move counter, redraws the board and checks for victory. Illegal or zero-distance moves do not change the game state or score.

### 7.4 Pointer, keyboard and button interaction

`beginDrag()`, `updateDrag()`, `endDrag()` and `cancelDrag()` implement pointer-based dragging for mouse and touch. The preview is snapped to valid grid cells. `moveSelected()` routes keyboard arrows and visible direction buttons to the same movement rules, rather than duplicating the logic.

This shared logic is important: **all input methods obey identical collision and boundary rules**.

### 7.5 Undo, victory and saved records

Each valid action adds a copy of the previous state and score to `history`. `undo()` restores that state. `checkVictory()` determines when the right end of G reaches the right boundary, then shows the victory screen.

The best score is stored using the browser's **`localStorage`**, with a key derived from the difficulty category and exact vehicle arrangement. This is more meaningful than comparing unrelated random puzzles under one common record. Scores are local to the browser/device, are not uploaded, and may disappear if browser storage is cleared. If storage is unavailable, the game remains playable without persistent records.

## 8. UI/UX design justification

The assignment requests not only a functioning puzzle but also a good interface and an explanation of its design. The following decisions are intentional.

### 8.1 Visual identity and color choices

The interface uses a restrained pastel palette:

| Color | Hex code | Role |
| --- | --- | --- |
| Dusty pink | `#D8A2A2` | Vehicle and level-card accents |
| Light pink | `#FFDCDC` | Soft decorative surfaces |
| Cream | `#FFF9D6` | Instructions, information panels and warm highlights |
| Sage green | `#8EA66B` | Main target car and primary actions |

Additional neutral text, backgrounds and vehicle shades maintain legibility and help distinguish cars. Green is used consistently for the car that must escape, giving it a recognizable role rather than treating color as decoration alone. The exit is visibly marked, and the selected car receives an outline.

**Arial/Helvetica** were chosen for familiarity and readability. Unnecessary footer text, decorative card arrows, excessive uppercase styling and a trailing punctuation mark in the brand were removed to keep the page simple and natural.

### 8.2 Information hierarchy

The experience follows the player's task in a clear sequence: **choose a level → solve a puzzle → see the result**. The main menu introduces the objective before presenting level choices; the game screen puts the board and relevant controls together; the victory screen focuses on performance and the next action. This minimizes unnecessary navigation and keeps important information close to where it is used.

### 8.3 Clear feedback and error prevention

The selected-car outline and text indicate which vehicle will move. The move counter changes only after a legal action. An invalid slide is restricted by the collision logic rather than allowing an impossible state. Undo and Restart make experimentation less frustrating and help the player recover from mistakes. Victory feedback confirms completion and displays the result.

### 8.4 Multiple input methods

Drag interaction makes the board feel like a physical sliding puzzle. Arrow keys and on-screen buttons provide precise alternatives, especially for users who prefer not to drag. Cars are implemented as actual buttons with accessible labels and selection states, while focus outlines support keyboard navigation. These are design choices to improve usability, not claims of complete accessibility certification.

### 8.5 Responsive design and motion

Flexbox, CSS Grid, fluid sizing and media queries adapt the menu, level cards and game area to smaller viewports. Small transitions improve feedback without being essential to understanding the game. A `prefers-reduced-motion` rule disables animations and transitions when the user has requested reduced motion.

### 8.6 Creativity without unnecessary complexity

The extra features—random puzzles, five categories, undo, restart, new puzzle generation, per-board scores and subtle animations—were included to improve replayability and control. They are implemented with standard browser technologies so that the project remains easy to run and maintain. They **extend** Rush Hour without changing its main objective or legal movement rules.

## 9. Verification and testing

### 9.1 Automated tests

The supplied `tests.js` was executed successfully with Node.js. It checks:

- The five seed boards are valid and solvable (minimum solutions: **2, 3, 4, 7 and 8** actions respectively).
- Occupancy matrix dimensions (6 × 6), uniqueness of car IDs and non-overlapping placements.
- Board edges, blocked movement and rejection of non-integer or zero-distance movement requests.
- **Eight randomly generated boards per category** (40 generated boards in one run), including valid placement, unsolved starting state, minimum allowed difficulty, and variation among results.

All checks passed in the final reviewed run. These tests verify the logic exercised by `tests.js`, not every possible random arrangement or every browser environment.

### 9.2 Manual interaction tests

Manual checks were also completed and reported as **passed** during development:

| Test scenario | Result |
| --- | --- |
| Drag a horizontal vehicle in both allowed directions | Passed |
| Drag a vertical vehicle up and down | Passed |
| Attempt to pass through another vehicle | Passed: blocked |
| Attempt to move outside the board | Passed: blocked |
| Select a car and move using arrow keys | Passed |
| Drag using a touch screen | Passed |
| Use Undo, Restart and New puzzle | Passed |
| Complete a level and view the victory screen | Passed |
| Reopen the page and check the saved best score | Passed |
| Check appearance on desktop and mobile-sized screens | Passed |

These results describe the manual checks performed by the project tester; they are not a substitute for checking the final submitted copy on its target devices.

## 10. Compliance with the assignment

| Assignment requirement | Where it is addressed |
| --- | --- |
| Implement Rush Hour as a single-player web game | Sections 1–3; `script.js` |
| Board with movable horizontal and vertical cars | Sections 3 and 7.1–7.3 |
| Move the main car to the exit | Sections 3 and 7.5 |
| Use standard HTML5, CSS and JavaScript | Sections 2, 6 and 7 |
| No external frameworks or libraries | Sections 1–2 and 6 |
| Clear code and comments, including complex algorithms | `script.js`; Section 7 |
| Main menu, instructions and level selection | Section 4.1; `index.html` |
| Game screen, score and return-to-menu option | Section 4.2; `index.html` |
| Board interaction | Sections 3 and 7.4 |
| Victory screen with score and menu option | Section 4.3; `index.html` |
| Good interface and justified user experience | Section 8 |
| README and website code delivered in a ZIP | Section 6 and final submission package |
| Creative extensions | Sections 5, 7.5 and 8.6 |
| Group of two | Add both team members at the beginning of this README |

The examples in the assignment are references rather than a compulsory visual template. Our design uses a different look while preserving the required screens, behavior and navigation.

## 11. Known limitations and design boundaries

- Random generation uses a limited number of attempts and can occasionally fall back to the seed configuration. It does **not** guarantee a unique board on every play.
- The five difficulty categories enforce minimum solution lengths, but the exact challenge can vary between puzzles within a category.
- A record is tied to an exact board arrangement and stored only in the local browser; there is no online leaderboard or cross-device synchronization.
- The game uses a conventional fixed **6 × 6** board and a right-side exit for the green car; these are deliberate scope choices.
- The website does not include audio, accounts or remote services, as none are required by the assignment.

## 12. Final submission checklist

- [ ] Replace the team-member placeholders with the actual names.
- [x] Include `index.html`, `style.css` and `script.js`.
- [x] Include the README and its design/UX justification.
- [x] Include optional `tests.js` for reproducible automated checks.
- [x] Run the game without external dependencies.
- [x] Verify automated rules and manual interactions.
- [ ] Confirm the ZIP opens and `index.html` loads correctly **after extraction**, before uploading to Moodle.

---

**Submission format:** one ZIP file containing the project source code and this README, as specified in *Hypermedia Project Part 2 — Create a web game: Rush Hour*.
