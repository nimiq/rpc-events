export default class IObserver {
    constructor() {
        this._listeners = new Map();
    }

    on(event, callback) {
        if (!this._listeners.get(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    off(event, callback) {
        this._listeners.get(event).remove(callback);
    }

    fire(event, value) {
        if (!this._listeners.get(event)) return;

        for (const listener of this._listeners.get(event)) {
            listener(value);
        }
    }
}
