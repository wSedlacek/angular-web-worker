module.exports = {
  extends: ['@commitlint/config-angular'],
  rules: {
    'body-min-length': [2, 'always', 10],
    'subject-case': [2, 'always', 'sentence-case'],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'pref',
        'refactor',
        'revert',
        'style',
        'test',
        'update',
      ],
    ],
  },
};
