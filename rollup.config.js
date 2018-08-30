// rollup.config.js
const dependencies = Object.keys(require('./package.json').dependencies);

export default [
    {
        input: 'build/main.js',
        output: {
            file: 'dist/rpc-events.common.js',
            format: 'cjs'
        },
        external: dependencies
    },
    {
        input: 'build/main.js',
        output: {
            file: 'dist/rpc-events.umd.js',
            format: 'umd',
            name: 'Rpc',
            extend: true,
            globals: {
                '@nimiq/rpc': 'Rpc'
            }
        },
        external: dependencies
    },
    {
        input: 'build/main.js',
        output: {
            file: 'dist/rpc-events.es.js',
            format: 'es'
        },
        external: dependencies
    }
];
