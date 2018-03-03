import RPC from './rpc.js';

export default class EventServer {
    /**
     * @param {string} [name
     */
    constructor() {
        this._listeners = new Map();
        const that = this;
        new (RPC.Server(class {
            on(event, callingWindow, callingOrigin) {
                if (!that._listeners.get(event)) {
                    that._listeners.set(event, new Map());
                }
                that._listeners.get(event).set(callingWindow, callingOrigin);
            }

            off(event, callingWindow, callingOrigin) {
                const eventEntry = that._listeners.get(event)
                if (eventEntry.get(callingWindow) !== callingOrigin) return;

                eventEntry.delete(callingWindow);
                if (that._listeners.get(event).length === 0) {
                    that._listeners.delete(event);
                }
            }
        }))();
    }

    fire(event, value) {
        if (!this._listeners.get(event)) return;

        for (const listener of this._listeners.get(event)) {
            listener[0].postMessage({event, value}, listener[1]);
        }
    }
}
