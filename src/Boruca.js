class Boruca {

    /** @param {Object} x
     *
     * @returns {string[]}
     */
    static _deepProps(x) {
        if (!x || x === Object.prototype) return [];

        const ownProps = Object.getOwnPropertyNames(x);

        const deepProps = Boruca._deepProps(Object.getPrototypeOf(x));

        return [...ownProps, ...deepProps];
    }

    /** @param {Object} x
     *
     * @returns {string[]}
     */
    static _deepFunctions(x) {
        return Boruca._deepProps(x).filter(name => typeof x[name] === 'function');
    }

    /** @param {Object} x
     *
     * @returns {Set<string>}
     */
    static _userFunctions(x) {
        return new Set(Boruca._deepFunctions(x).filter(name => name !== 'constructor' && !name.includes('__')));
    }

    /**
     * Establishes a connection to the target frame.
     * Takes the class that should be made available to the target frame as `clazz` parameter.
     * Returns a promise that resolves to a class that mirrors the class that is made available in the target frame.
     */
    static proxy(targetWindow, targetOrigin, clazz, ownWindow) {
        return new Promise((resolve, error) => {
            new Boruca(targetWindow, targetOrigin, clazz, ownWindow, resolve, error);
        });
    }

    constructor(targetWindow, targetOrigin, clazz, ownWindow, resolve, error) {
        this._targetWindow = targetWindow;
        this._targetOrigin = targetOrigin;
        this._window = ownWindow || window;
        this._resolve = resolve;
        this._error = error;

        this._stub = new (Boruca.StubClass(clazz || class {}))(this._targetWindow, this._targetOrigin, this._window);

        this._window.addEventListener('message', this._createProxy.bind(this));

        this._sendInitCommand();
    }

    _createProxy(msg) {
        if(msg.data.command !== 'init' || this._proxy) return;

        this._proxy = true; // Placeholder to avoid race conditions

        this._sendInitCommand();

        try {
            this._proxy = new (Boruca.ProxyClass(msg.data.args))(this._targetWindow, this._targetOrigin, this._window);
            this._resolve({
                proxy: this._proxy,
                stub: this._stub
            });
        } catch (e) {
            this._error(e);
        }
    }

    _sendInitCommand() {
        this._targetWindow.postMessage({command: 'init', args: this._stub._funcNames}, this._targetOrigin);
    }

    static ProxyClass(funcNames) {
        const Proxy = class {
            /**
             * @param {Window} window
             * @param {string} [name]
             */
            constructor(targetWindow, targetOrigin, ownWindow) {
                this._messageId = 0;
                this._window = ownWindow;
                this._targetWindow = targetWindow;
                this._targetOrigin = targetOrigin;
                this._window.addEventListener('message', this._receive.bind(this));
                /** @type {Map.<number,{resolve:Function,error:Function}>} */
                this._waiting = new Map();
            }

            _receive(msg) {
                // Discard all messages from unwanted origins or which are not answers
                if (msg.origin !== this._targetOrigin || !msg.data.status) return;

                const cb = this._waiting.get(msg.data.id);

                if (!cb) return;

                this._waiting.delete(msg.data.id);
                if (msg.data.status === 'OK') {
                    cb.resolve(msg.data.result);
                } else if (msg.data.status === 'error') {
                    cb.error(msg.data.result);
                }
            }

            /**
             * @param {string} command
             * @param {object[]} [args]
             * @returns {Promise}
             * @private
             */
            _invoke(command, args = []) {
                return new Promise((resolve, error) => {
                    const obj = {command: command, args: args, id: this._messageId++};
                    this._waiting.set(obj.id, {resolve, error});
                    this._targetWindow.postMessage(obj, this._targetOrigin);
                });
            }
        };
        for (const funcName of funcNames) {
            Proxy.prototype[funcName] = function (...args) {
                return this._invoke(funcName, args);
            };
        }
        return Proxy;
    }

    /**
     * A stub is running in this frame
     *
     * @param {object} clazz
     * @return {Stub}
     * @constructor
     */
    static StubClass(clazz) {
        const Stub = class extends clazz {
            constructor(targetWindow, targetOrigin, ownWindow) {
                super();
                this._window = ownWindow;
                this._targetWindow = targetWindow;
                this._targetOrigin = targetOrigin;

                this._window.addEventListener('message', this._onmessage.bind(this));
            }

            _result(msg, status, result) {
                this._targetWindow.postMessage({status, result, id: msg.data.id}, this._targetOrigin);
            }

            _onmessage(msg) {
                // Discard all messages from unwanted origins or which are answers
                if (msg.origin !== this._targetOrigin || msg.data.status) return;

                try {
                    const res = this._invoke(msg.data.command, msg.data.args);
                    if (res instanceof Promise) {
                        res.then((finalRes) => { this._result(msg, 'OK', finalRes); });
                    } else {
                        this._result(msg, 'OK', res);
                    }
                } catch (e) {
                    this._result(msg, 'error', e.message || e);
                }
            }

            _invoke(command, args) {
                return this[command].apply(this, args);
            }
        };
        Stub.prototype._funcNames = [];

        for (const funcName of Boruca._userFunctions(clazz.prototype)) {
            Stub.prototype._funcNames.push(funcName);
        }

        return Stub;
    }
}
