/**
 * PM2 ecosystem config for deck (backend + frontend)
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
    {
      name: 'deck-frontend',
      cwd: path.join(root, 'app'),
      script: 'npx',
      args: 'serve dist -l 5174 -s',
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
    },
  ],
};
