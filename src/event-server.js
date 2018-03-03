import RPC from './rpc.js';

export default class EventServer {
    /**
     * @param {string} [name
     */
    constructor() {
        this._listeners = new Map();
        const that = this;
        new (RPC.Server(self, class {
            on(event, callingWindow, callingOrigin) {
                if (!that._listeners.get(event)) {
                    that._listeners.set(event, new Set());
                }
                that._listeners.get(event).add(that._nofifier(callingWindow, callingOrigin));
            }

            off(event, callingWindow, callingOrigin) {
                that._listeners.get(event).remove(callback);
                if (that._listeners.get(event).length === 0) {
                    that._listeners.delete(event);
                }
            }
        }))();
    }

    _nofifier(callingWindow, callingOrigin) {
        return (event, value) => callingWindow.postMessage({event, value}, callingOrigin);
    }

    fire(event, value) {
        if (!this._listeners.get(event)) return;

        for (const listener of this._listeners.get(event)) {
            listener(event, value);
        }
    }
}
