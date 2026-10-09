module.exports = {
    root: true,
    extends: [
        '@nuxtjs/eslint-config-typescript',
    ],
    // add your custom rules here
    rules: {
        'comma-dangle': ['error', 'always-multiline'],
        indent: ['error', 4, {
            SwitchCase: 1,
            VariableDeclarator: 1,
            outerIIFEBody: 1,
            MemberExpression: 1,
            FunctionDeclaration: { parameters: 1, body: 1 },
            FunctionExpression: { parameters: 1, body: 1 },
            CallExpression: { arguments: 1 },
            ArrayExpression: 1,
            ObjectExpression: 1,
            ImportDeclaration: 1,
            flatTernaryExpressions: false,
            ignoreComments: false,
        }],
        'vue/multi-word-component-names': 'off',
        'space-before-function-paren': ['error', 'never'],
        'vue/html-indent': ['error', 4],
    },
}
