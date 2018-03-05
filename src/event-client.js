import RPC from './rpc.js';

export default class EventClient {
    /**
     * @param {Window} targetWindow
     * @returns {object}
     */
    static async create(targetWindow) {
        const client = new EventClient(targetWindow);
        client._rpcClient = await RPC.Client(targetWindow, 'EventRPCServer');
        return client;
    }

    constructor(targetWindow) {
        this._listeners = new Map();
        this._targetWindow = targetWindow;
        self.addEventListener('message', this._receive.bind(this));
    }

    _receive({origin, data: {event, value}}) {
        // Discard all messages from unwanted origins or which are not events
        if (origin !== this._targetWindow.origin || !event) return;

        if (!this._listeners.get(event)) return;

        for (const listener of this._listeners.get(event)) {
            listener(value);
        }
    }

    on(event, callback) {
        if (!this._listeners.get(event)) {
            this._listeners.set(event, new Set());
            this._rpcClient.on(event);
        }

        this._listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (!this._listeners.has(event)) return;

        this._listeners.get(event).delete(callback);

        if (this._listeners.get(event).size === 0) {
            this._listeners.delete(event);
            this._rpcClient.off(event);
        }
    }
}