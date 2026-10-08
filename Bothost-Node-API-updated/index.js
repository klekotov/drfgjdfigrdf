// Bothost may invoke /app/index.js directly, even when Dockerfile CMD is set.
// Keep this small compatibility entrypoint and hand off to the ESM server bundle.
import('./index.mjs').catch((error) => {
  console.error('Failed to start the Node API:', error);
  process.exitCode = 1;
});