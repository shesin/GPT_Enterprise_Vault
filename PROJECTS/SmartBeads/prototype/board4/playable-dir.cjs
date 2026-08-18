'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
/** NFT survivors not in the locked V1 seven — Web-pass, product-left-out. */
const UNREJECTED_GAMES_DIR = path.join(ROOT, 'unrejected games');

/**
 * Locked V1 / ladder playables live in board4 root.
 * Left-out NFT playables live in unrejected games/.
 */
function playablePath(filename) {
  const leftOut = path.join(UNREJECTED_GAMES_DIR, filename);
  if (fs.existsSync(leftOut)) {
    return leftOut;
  }
  return path.join(ROOT, filename);
}

module.exports = { ROOT, UNREJECTED_GAMES_DIR, playablePath };
