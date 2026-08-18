'use strict';
const path = require('path');

const ROOT = __dirname;
const UNREJECTED_GAMES_DIR = path.join(ROOT, 'unrejected games');

function playablePath(filename) {
  return path.join(UNREJECTED_GAMES_DIR, filename);
}

module.exports = { ROOT, UNREJECTED_GAMES_DIR, playablePath };
