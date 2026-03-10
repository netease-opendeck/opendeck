/**
 * PM2 ecosystem config for OpenDeck backend process
 * Used by install/uninstall scripts
 */
const path = require('path');

const root = path.resolve(__dirname);

module.exports = {
  apps: [
    {
      name: 'deck-backend',
      cwd: path.join(root, 'backend'),
      script: 'dist/main.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
    },
  ],
};
