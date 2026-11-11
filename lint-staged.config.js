module.exports = {
  '*.{ts,html}': ['eslint --fix', 'prettier --write'],
  '*.{scss,json,md,yml,yaml,js}': ['prettier --write'],
};
