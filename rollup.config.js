// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';

export default [
    {
        input: 'build/main.js',
        output: {
            file: 'dist/rpc-events.common.js',
            format: 'cjs'
        },
        external: '@nimiq/rpc'
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
        external: '@nimiq/rpc'
    },
    {
        input: 'build/main.js',
        output: {
            file: 'dist/rpc-events.es.js',
            format: 'es'
        },
        plugins: [
            resolve()
        ]
    }
];
