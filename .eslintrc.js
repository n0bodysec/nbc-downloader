module.exports = {
	extends: ['@n0bodysec'],
	rules: {
		'import/extensions': ['error', 'ignorePackages', {
			js: 'always', mjs: 'always', jsx: 'always',
		}],
	},
};
