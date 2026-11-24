const { execSync } = require('child_process');

/** Cambio del código con el que se compila (se ve en el menú lateral para saber qué versión hay instalada). */
function commit() {
  // En los servidores de EAS no hay carpeta .git, pero EAS da el cambio en esta variable.
  if (process.env.EAS_BUILD_GIT_COMMIT_HASH) return process.env.EAS_BUILD_GIT_COMMIT_HASH.slice(0, 7);
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

// Añade la ruta base solo cuando se publica en GitHub Pages (https://<usuario>.github.io/DerbyTactics/).
module.exports = ({ config }) => ({
  ...config,
  extra: { ...config.extra, commit: commit(), builtAt: new Date().toISOString().slice(0, 10) },
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
