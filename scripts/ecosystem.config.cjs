/**
 * PM2 ecosystem config for deck (backend only, serves frontend statically)
 * Used by deck start/stop/restart/status
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
