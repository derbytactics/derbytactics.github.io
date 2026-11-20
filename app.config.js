// Añade la ruta base solo cuando se publica en GitHub Pages (https://<usuario>.github.io/DerbyTactics/).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
