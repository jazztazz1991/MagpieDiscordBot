module.exports = {
  apps: [
    {
      name: 'magpie-bot',
      script: 'dist/index.js',
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
