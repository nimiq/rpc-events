import {RpcServer, State, CommandHandler} from '@nimiq/rpc';

type WindowLike = string | MessagePort | ServiceWorker | Window;

export class EventServer {
    private _listeners: Map<string, Map<WindowLike, State>>;
    private _rpcServer: RpcServer;

    constructor(allowedOrigin?: string) {
        this._listeners = new Map();
        this._rpcServer = new RpcServer(allowedOrigin ? allowedOrigin : '*');

        this._rpcServer.onRequest('on', (state: State, event: string) => {
            // Catch cases without source, i.e., top level navigation.
            if (!state.source) return;

            // Register event listener.
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Map());
            }
            this._listeners.get(event)!.set(state.source, state);
            return true;
        });

        this._rpcServer.onRequest('off', (state: State, event: string) => {
            // Catch cases without source, i.e., top level navigation.
            if (!state.source) return;

            // Unregister event listener.
            const listeners = this._listeners.get(event);
            if (!listeners) return;

            const storedState = listeners.get(state.source);
            if (!storedState || storedState.origin !== state.origin) return;

            listeners.delete(state.source);
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
            return true;
        });

        this._rpcServer.init();
    }

    public fire(event: string, value: any) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;

        for (const state of listeners.values()) {
            let target;
            // If source is given, choose accordingly
            if (state.source) {
                if (state.source === 'opener') {
                    target = window.opener;
                } else if (state.source === 'parent') {
                    target = window.parent;
                } else {
                    target = state.source;
                }
            } else {
                // Else guess
                target = window.opener || window.parent;
            }

            target.postMessage({event, value}, state.origin);
        }
    }

    public onRequest(command: string, fn: CommandHandler) {
        this._rpcServer.onRequest(command, fn);
    }
}
