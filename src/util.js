export default class Util {
    /** @param {Object} proto
     *
     * @returns {Set<string>}
     */
    static userFunctions(proto) {
        return new Set(Util._deepFunctions(proto).filter(name => name !== 'constructor' && !name.includes('__')));
    }

    static getRandomId() {
        let array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0];
    }

    /** @param {Object} proto
     *
     * @returns {string[]}
     */
    static _deepFunctions(proto) {
        if (!proto || proto === Object.prototype) return [];

        const ownProps = Object.getOwnPropertyNames(proto);

        const ownFunctions = ownProps.filter(name => {
            const desc = Object.getOwnPropertyDescriptor(proto, name);
            return !!desc && typeof desc.value === 'function';
        });

        const deepFunctions = Util._deepFunctions(Object.getPrototypeOf(proto));

        return [...ownFunctions, ...deepFunctions];
    }
}
