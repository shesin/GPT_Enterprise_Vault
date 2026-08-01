console.log('main.ts loaded');

import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import { BoardDefinition, Move, Player } from '../../models/GameState';
import { executeAiRandomMove } from '../../simulation/SelfPlayRunner';

// Web Playtest Controller for Board4
let engine: SmartBeadsEngine;
let humanColor: Player = 'RED';
let aiColor: Player = 'BLUE';
let selectedPieceId: number | null = null;
let isAiThinking = false;

// Geometry mapping for Board4 (4x4)
const SIZE = 4;
const PADDING = 60;
const SPACING = 90;

function getNodeCoordinates(id: number): { x: number; y: number } {
  const row = Math.floor(id / SIZE);
  const col = id % SIZE;
  return {
    x: PADDING + col * SPACING,
    y: PADDING + row * SPACING,
  };
}

function getElements() {
  return {
    boardSvg: document.getElementById('board') as unknown as SVGSVGElement,
    colorSelect: document.getElementById('colorSelect') as HTMLSelectElement,
    restartBtn: document.getElementById('restartBtn') as HTMLButtonElement,
    endTurnBtn: document.getElementById('endTurnBtn') as HTMLButtonElement,
    turnStatus: document.getElementById('turnStatus') as HTMLDivElement,
    pieceStatus: document.getElementById('pieceStatus') as HTMLDivElement,
    captureStatus: document.getElementById('captureStatus') as HTMLDivElement,
    gameBanner: document.getElementById('gameBanner') as HTMLDivElement,
    instructionText: document.getElementById('instructionText') as HTMLDivElement,
  };
}

function initGame(): void {
  console.log('initGame called');
  const { colorSelect } = getElements();
  humanColor = colorSelect.value as Player;
  aiColor = humanColor === 'RED' ? 'BLUE' : 'RED';
  selectedPieceId = null;
  isAiThinking = false;

  engine = new SmartBeadsEngine('4');

  updateUI();

  if (humanColor !== 'RED') {
    scheduleAiTurn();
  }
}

function updateUI(): void {
  const state = engine.getState();
  const {
    boardSvg,
    endTurnBtn,
    turnStatus,
    pieceStatus,
    captureStatus,
    gameBanner,
    instructionText,
  } = getElements();

  const chainPieceId = engine.getChainPieceId();
  const current = state.currentPlayer;
  const legalMoves = engine.getLegalMoves();

  // Status updates
  turnStatus.textContent = `Turn: ${state.moveCount + 1} (${current})`;
  pieceStatus.textContent = `Pieces - RED: ${engine.countPieces('RED')} | BLUE: ${engine.countPieces('BLUE')}`;
  captureStatus.textContent = `Captures - RED: ${state.captures.RED} | BLUE: ${state.captures.BLUE}`;

  // End Turn Button
  const isHumanTurn = current === humanColor && !state.gameOver && !isAiThinking;
  endTurnBtn.disabled = !(isHumanTurn && chainPieceId !== null);

  // Banner
  if (state.gameOver) {
    gameBanner.style.display = 'block';
    gameBanner.className = 'banner game-over';
    const winnerText = state.winner === 'DRAW' ? 'Game Over: Draw!' : `Game Over: ${state.winner} Wins!`;
    gameBanner.textContent = winnerText;
    instructionText.textContent = 'Game concluded. Click "New Game" to play again.';
  } else {
    gameBanner.style.display = 'none';
    if (isAiThinking) {
      instructionText.textContent = `AI (${aiColor}) is taking its turn...`;
    } else if (chainPieceId !== null) {
      instructionText.textContent = `Capture chain active for bead ${chainPieceId}. Click a valid jump target or click "End Turn Voluntarily".`;
    } else if (selectedPieceId !== null) {
      instructionText.textContent = `Bead ${selectedPieceId} selected. Click a highlighted green target to move, or click another piece.`;
    } else if (isHumanTurn) {
      instructionText.textContent = `Your turn (${humanColor}). Click one of your pieces to see legal moves.`;
    } else {
      instructionText.textContent = `AI (${aiColor}) turn.`;
    }
  }

  // Render SVG Board
  renderSvgBoard(boardSvg, state.board, legalMoves, chainPieceId);
}

function renderSvgBoard(
  svg: SVGSVGElement,
  board: BoardDefinition,
  legalMoves: Move[],
  chainPieceId: number | null,
): void {
  svg.innerHTML = ''; // Clear SVG contents

  // 1. Draw Connection Lines
  for (const conn of board.connections) {
    const fromCoord = getNodeCoordinates(conn.from);
    const toCoord = getNodeCoordinates(conn.to);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromCoord.x.toString());
    line.setAttribute('y1', fromCoord.y.toString());
    line.setAttribute('x2', toCoord.x.toString());
    line.setAttribute('y2', toCoord.y.toString());
    line.setAttribute('stroke', '#ccc');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }

  // Active selection / targets determination
  const activeSourceId = chainPieceId !== null ? chainPieceId : selectedPieceId;
  const validTargetIds = new Set<number>();

  if (activeSourceId !== null) {
    for (const move of legalMoves) {
      if (move.from === activeSourceId) {
        validTargetIds.add(move.to);
      }
    }
  }

  // 2. Draw Intersections, Highlights, and Beads
  for (const intersection of board.intersections) {
    const coord = getNodeCoordinates(intersection.id);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${coord.x}, ${coord.y})`);
    g.style.cursor = 'pointer';

    // Base Node Circle
    const nodeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    nodeCircle.setAttribute('r', '14');
    nodeCircle.setAttribute('fill', '#e0e0e0');
    nodeCircle.setAttribute('stroke', '#999');
    nodeCircle.setAttribute('stroke-width', '2');
    g.appendChild(nodeCircle);

    // Target Highlight (Dashed Green Ring)
    if (validTargetIds.has(intersection.id)) {
      const targetRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      targetRing.setAttribute('r', '22');
      targetRing.setAttribute('fill', 'none');
      targetRing.setAttribute('stroke', '#2a9d8f');
      targetRing.setAttribute('stroke-width', '4');
      targetRing.setAttribute('stroke-dasharray', '5,3');
      g.appendChild(targetRing);
    }

    // Selection Highlight (Gold Ring)
    if (activeSourceId === intersection.id) {
      const selectRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      selectRing.setAttribute('r', '24');
      selectRing.setAttribute('fill', 'none');
      selectRing.setAttribute('stroke', '#ffb703');
      selectRing.setAttribute('stroke-width', '5');
      g.appendChild(selectRing);
    }

    // Occupant Bead
    if (intersection.occupant) {
      const bead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bead.setAttribute('r', '18');
      bead.setAttribute('fill', intersection.occupant === 'RED' ? '#e63946' : '#1d3557');
      bead.setAttribute('stroke', '#ffffff');
      bead.setAttribute('stroke-width', '2');
      g.appendChild(bead);
    }

    // Node ID Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = intersection.id.toString();
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dy', '4');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', intersection.occupant ? '#ffffff' : '#666666');
    text.setAttribute('pointer-events', 'none');
    g.appendChild(text);

    // Click Event Handler
    g.addEventListener('click', () => handleNodeClick(intersection.id));

    svg.appendChild(g);
  }
}

function handleNodeClick(nodeId: number): void {
  const state = engine.getState();
  if (state.gameOver || state.currentPlayer !== humanColor || isAiThinking) {
    return;
  }

  const chainPieceId = engine.getChainPieceId();
  const legalMoves = engine.getLegalMoves();

  if (chainPieceId !== null) {
    // Mid capture chain: only jumps from chainPieceId are valid
    const move = legalMoves.find((m) => m.from === chainPieceId && m.to === nodeId);
    if (move) {
      engine.applyMove(move);
      selectedPieceId = null;
      updateUI();
      if (engine.getState().currentPlayer === aiColor) {
        scheduleAiTurn();
      }
    }
    return;
  }

  // Normal Turn
  if (selectedPieceId !== null) {
    const move = legalMoves.find((m) => m.from === selectedPieceId && m.to === nodeId);
    if (move) {
      engine.applyMove(move);
      selectedPieceId = null;
      updateUI();
      if (engine.getState().currentPlayer === aiColor) {
        scheduleAiTurn();
      }
      return;
    }
  }

  // Piece Selection
  const clickedIntersection = state.board.intersections.find((p) => p.id === nodeId);
  if (clickedIntersection?.occupant === humanColor) {
    const hasLegalMoves = legalMoves.some((m) => m.from === nodeId);
    selectedPieceId = hasLegalMoves ? nodeId : null;
  } else {
    selectedPieceId = null;
  }

  updateUI();
}

function handleEndTurnClick(): void {
  const state = engine.getState();
  if (state.gameOver || state.currentPlayer !== humanColor || isAiThinking) {
    return;
  }

  if (engine.getChainPieceId() !== null) {
    engine.endTurn();
    selectedPieceId = null;
    updateUI();
    if (engine.getState().currentPlayer === aiColor) {
      scheduleAiTurn();
    }
  }
}

function scheduleAiTurn(): void {
  const state = engine.getState();
  if (state.gameOver || state.currentPlayer === humanColor) {
    return;
  }

  isAiThinking = true;
  updateUI();

  setTimeout(() => {
    executeAiRandomMove(engine);
    isAiThinking = false;
    updateUI();

    // If AI is in a multi-jump chain, schedule next AI move
    if (!engine.getState().gameOver && engine.getState().currentPlayer === aiColor) {
      scheduleAiTurn();
    }
  }, 350);
}

// Event Listeners Initialization
function bootstrap(): void {
  const { restartBtn, colorSelect, endTurnBtn } = getElements();

  restartBtn.addEventListener('click', initGame);
  colorSelect.addEventListener('change', initGame);
  endTurnBtn.addEventListener('click', handleEndTurnClick);

  initGame();
}

// ES module scripts execute after the HTML parser reaches them, which for a
// module loaded via <script type="module"> can be after DOMContentLoaded has
// already fired. Guard against that by checking document.readyState first.
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap();
} else {
  window.addEventListener('DOMContentLoaded', bootstrap);
}
