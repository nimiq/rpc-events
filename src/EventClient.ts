import {PostMessageRpcClient} from "@nimiq/rpc";

export type EventCallback = (value: any) => void;

export class EventClient {
    private _listeners: Map<string, Set<EventCallback>>;
    private readonly _targetWindow: Window;
    private readonly _targetOrigin?: string;
    private _rpcClient: PostMessageRpcClient;

    static async create(targetWindow: Window, targetOrigin: string = '*') {
        const client = new EventClient(targetWindow, targetOrigin);
        await client._init();
        return client;
    }

    private constructor(targetWindow: Window, targetOrigin: string) {
        this._listeners = new Map();
        this._targetWindow = targetWindow;
        this._targetOrigin = targetOrigin;
        this._rpcClient = new PostMessageRpcClient(targetWindow, targetOrigin);

        // We need our own event listener here.
        self.addEventListener('message', this._receive.bind(this));
    }

    private _init() {
        return this._rpcClient.init();
    }

    private _receive(message: {origin: string, data: {event: string, value: any}}) {
        const {origin, data: {event, value}} = message;

        // Discard all messages from unwanted origins or which are not events.
        if ((this._targetOrigin !== '*' && origin !== this._targetOrigin) || !event) return;

        const listeners = this._listeners.get(event);
        if (!listeners) return;
        for (const listener of listeners) {
            listener(value);
        }
    }

    async on(event: string, callback: EventCallback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
            await this._rpcClient.call('on', event);
        }

        this._listeners.get(event)!.add(callback);
    }

    async off(event: string, callback: EventCallback) {
        if (!this._listeners.has(event)) return;

        const listeners = this._listeners.get(event)!;
        listeners.delete(callback);

        if (listeners.size === 0) {
            this._listeners.delete(event);
            await this._rpcClient.call('off', event);
        }
    }
}
