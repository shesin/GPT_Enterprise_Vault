console.log('main.ts loaded');

import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import { DEFAULT_PRODUCT_BOARD, listProductBoards } from '../../config/BoardCatalog';
import { BoardVariant } from '../../config/BoardConfig';
import { Move, Player } from '../../models/GameState';
import { executeAiRandomMove } from '../../simulation/SelfPlayRunner';
import { renderBoardSvg } from './BoardRenderer';

let engine: SmartBeadsEngine;
let selectedVariant: BoardVariant = DEFAULT_PRODUCT_BOARD;
let humanColor: Player = 'RED';
let aiColor: Player = 'BLUE';
let selectedPieceId: number | null = null;
let isAiThinking = false;

function getElements() {
  return {
    boardSelect: document.getElementById('boardSelect') as HTMLSelectElement,
    boardSvg: document.getElementById('board') as unknown as SVGSVGElement,
    colorSelect: document.getElementById('colorSelect') as HTMLSelectElement,
    restartBtn: document.getElementById('restartBtn') as HTMLButtonElement,
    endTurnBtn: document.getElementById('endTurnBtn') as HTMLButtonElement,
    turnStatus: document.getElementById('turnStatus') as HTMLDivElement,
    pieceStatus: document.getElementById('pieceStatus') as HTMLDivElement,
    captureStatus: document.getElementById('captureStatus') as HTMLDivElement,
    gameBanner: document.getElementById('gameBanner') as HTMLDivElement,
    instructionText: document.getElementById('instructionText') as HTMLDivElement,
    boardTitle: document.getElementById('boardTitle') as HTMLHeadingElement,
  };
}

function populateBoardSelector(): void {
  const { boardSelect } = getElements();
  const boards = listProductBoards();
  boardSelect.innerHTML = '';

  for (const entry of boards) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.displayName;
    boardSelect.appendChild(option);
  }

  boardSelect.value = selectedVariant;
  boardSelect.disabled = boards.length <= 1;
}

function initGame(): void {
  const { colorSelect, boardSelect, boardTitle } = getElements();
  selectedVariant = (boardSelect.value || DEFAULT_PRODUCT_BOARD) as BoardVariant;
  humanColor = colorSelect.value as Player;
  aiColor = humanColor === 'RED' ? 'BLUE' : 'RED';
  selectedPieceId = null;
  isAiThinking = false;

  const catalogEntry = listProductBoards().find((entry) => entry.id === selectedVariant);
  if (catalogEntry) {
    boardTitle.textContent = `SmartBeads — ${catalogEntry.displayName}`;
  }

  engine = new SmartBeadsEngine(selectedVariant);
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

  turnStatus.textContent = `Turn: ${state.moveCount + 1} (${current})`;
  pieceStatus.textContent = `Pieces - RED: ${engine.countPieces('RED')} | BLUE: ${engine.countPieces('BLUE')}`;
  captureStatus.textContent = `Captures - RED: ${state.captures.RED} | BLUE: ${state.captures.BLUE}`;

  const isHumanTurn = current === humanColor && !state.gameOver && !isAiThinking;
  endTurnBtn.disabled = !(isHumanTurn && chainPieceId !== null);

  if (state.gameOver) {
    gameBanner.style.display = 'block';
    gameBanner.className = 'banner game-over';
    const reason = state.endReason ? ` (${state.endReason})` : '';
    const winnerText = state.winner === 'DRAW'
      ? 'Game Over: Draw!'
      : `Game Over: ${state.winner} Wins!${reason}`;
    gameBanner.textContent = winnerText;
    instructionText.textContent = 'Game concluded. Click "New Game" to play again.';
  } else {
    gameBanner.style.display = 'none';
    if (isAiThinking) {
      instructionText.textContent = `AI (${aiColor}) is taking its turn...`;
    } else if (chainPieceId !== null) {
      instructionText.textContent = 'Capture chain active. Click a valid jump target or "End Turn Voluntarily".';
    } else if (selectedPieceId !== null) {
      instructionText.textContent = 'Piece selected. Click a highlighted target to move.';
    } else if (isHumanTurn) {
      instructionText.textContent = `Your turn (${humanColor}). Click one of your pieces.`;
    } else {
      instructionText.textContent = `AI (${aiColor}) turn.`;
    }
  }

  renderBoardSvg(
    boardSvg,
    state.board,
    legalMoves,
    chainPieceId,
    selectedPieceId,
    handleNodeClick,
    { showLabels: selectedVariant === '16' },
  );
}

function handleNodeClick(nodeId: number): void {
  const state = engine.getState();
  if (state.gameOver || state.currentPlayer !== humanColor || isAiThinking) {
    return;
  }

  const chainPieceId = engine.getChainPieceId();
  const legalMoves = engine.getLegalMoves();

  if (chainPieceId !== null) {
    const move = legalMoves.find((m) => m.from === chainPieceId && m.to === nodeId);
    if (move) {
      engine.applyMove(move);
      selectedPieceId = null;
      updateUI();
      if (engine.getState().currentPlayer === aiColor && !engine.getState().gameOver) {
        scheduleAiTurn();
      }
    }
    return;
  }

  if (selectedPieceId !== null) {
    const move = legalMoves.find((m) => m.from === selectedPieceId && m.to === nodeId);
    if (move) {
      engine.applyMove(move);
      selectedPieceId = null;
      updateUI();
      if (engine.getState().currentPlayer === aiColor && !engine.getState().gameOver) {
        scheduleAiTurn();
      }
      return;
    }
  }

  const clickedIntersection = state.board.intersections.find((point) => point.id === nodeId);
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
    if (engine.getState().currentPlayer === aiColor && !engine.getState().gameOver) {
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

    if (!engine.getState().gameOver && engine.getState().currentPlayer === aiColor) {
      scheduleAiTurn();
    }
  }, 350);
}

function bootstrap(): void {
  const { restartBtn, colorSelect, endTurnBtn, boardSelect } = getElements();

  populateBoardSelector();
  restartBtn.addEventListener('click', initGame);
  colorSelect.addEventListener('change', initGame);
  boardSelect.addEventListener('change', initGame);
  endTurnBtn.addEventListener('click', handleEndTurnClick);

  initGame();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap();
} else {
  window.addEventListener('DOMContentLoaded', bootstrap);
}
