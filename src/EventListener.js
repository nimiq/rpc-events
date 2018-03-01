export default class EventListener {
    constructor() {
        this._listeners = new Map();
        const that = this;
        this.Receiver = class Receiver {
            fire(event, value) {
                that.fire(event, value);
            }
        };
    }

    fire(event, value) {
        if (!this._listeners.get(event)) return;

        for (const listener of this._listeners.get(event)) {
            listener(value);
        }
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
}