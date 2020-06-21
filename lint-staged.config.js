/**
 * @param {string[]} files
 */
const lintAndFormat = (files) => [
  'yarn affected:lint --parallel --uncommitted --fix',
  `yarn format --files="${files.join(',')}"`,
  `git add ${files.join(' ')}`,
];

module.exports = {
  '*.{json,js,ts,sccs,html}': lintAndFormat,
};
