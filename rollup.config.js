// rollup.config.js
export default [
    {
        input: 'build/main.js',
        output: {
            file: 'dist/boruca.common.js',
            format: 'cjs'
        }
    },
    {
        input: 'build/main.js',
        output: {
            file: 'dist/boruca.umd.js',
            format: 'umd',
            name: 'Boruca',
            globals: {
                '@nimiq/rpc': 'Rpc'
            }
        }
    }
];
