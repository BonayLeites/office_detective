export default {
  'apps/web/**/*.{ts,tsx}': files => [
    `cd apps/web && eslint --fix --max-warnings=0 ${files.map(f => f.replace('apps/web/', '')).join(' ')}`,
    `prettier --write ${files.join(' ')}`,
  ],
  'apps/api/**/*.py': files => [
    `cd apps/api && uv run ruff check --fix ${files.map(f => f.replace('apps/api/', '')).join(' ')}`,
    `cd apps/api && uv run ruff format ${files.map(f => f.replace('apps/api/', '')).join(' ')}`,
  ],
  '*.{js,cjs,mjs}': ['prettier --write'],
  '*.{json,yaml,yml}': ['prettier --write'],
  '*.md': ['prettier --write'],
};
