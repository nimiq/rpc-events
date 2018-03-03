import Util from './util.js';

export default class RPC {
    static async Client(targetWindow) {
        return new Promise((resolve, reject) => {
            let connected = false;

            const interfaceListener = (message) => {
                if (message.origin !== targetWindow.origin || message.data.status !== 'OK') return;

                self.removeEventListener('message', interfaceListener);

                connected = true;

                resolve(new (RPC._Client(targetWindow, message.data.result))());
            };

            self.addEventListener('message', interfaceListener);

            const tryToConnect = () => {
                if (connected) return;

                targetWindow.postMessage({ command: 'getRpcInterface', id: 0 }, targetWindow.origin);
                setTimeout(tryToConnect, 1000);
            }

            setTimeout(tryToConnect, 100);

            setTimeout(() => reject('Connection timeout'), 10000);
        });
    }

    static _Client(targetWindow, funcNames) {
        const Client = class {
            /**
             * @param {string} [name
             */
            constructor() {
                this._targetWindow = targetWindow;
                /** @type {Map.<number,{resolve:Function,error:Function}>} */
                this._waiting = new Map();
                self.addEventListener('message', this._receive.bind(this));
            }

            close() {
                self.removeEventListener('message', this._receive.bind(this));
            }

            _receive(message) {
                // Discard all messages from unwanted origins or which are not replies
                if (message.origin !== this._targetWindow.origin || !message.data.status) return;

                const callback = this._waiting.get(message.data.id);

                if (!callback) {
                    console.log('Unknown reply', message);
                } else {
                    this._waiting.delete(message.data.id);

                    if (message.data.status === 'OK') {
                        callback.resolve(message.data.result);
                    } else if (message.data.status === 'error') {
                        callback.error(message.data.result);
                    }
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
                    const obj = { command: command, args: args, id: Util.getRandomId() };
                    this._waiting.set(obj.id, { resolve, error });
                    this._targetWindow.postMessage(obj, targetWindow.origin);
                });
            }
        };

        for (const funcName of funcNames) {
            Client.prototype[funcName] = function (...args) {
                return this._invoke(funcName, args);
            };
        }

        return Client;
    }

    static Server(clazz) {
        return new (RPC._Server(clazz))();
    }

    /**
     * @param {object} clazz
     * @return {T extends clazz}
     * @constructor
     */
    static _Server(clazz) {
        const Server = class extends clazz {
            constructor() {
                super();
                self.addEventListener('message', this._receive.bind(this));
            }

            close() {
                self.removeEventListener('message', this._receive.bind(this));
            }

            _replyTo(message, status, result) {
                message.source.postMessage({ status, result, id: message.data.id }, message.origin);
            }

            _receive(message) {
                try {
                    let args = [];
                    if (message.data.command !== 'getRpcInterface') {
                        // inject calling window and origin to function args
                        const { source: callingWindow, origin: callingOrigin } = message;
                        args = [...message.data.args, callingWindow, callingOrigin];
                    }

                    const result = this._invoke(message.data.command, args);

                    if (result instanceof Promise) {
                        result.then((finalRes) => { this._replyTo(message, 'OK', finalRes); });
                    } else {
                        this._replyTo(message, 'OK', result);
                    }
                } catch (e) {
                    this._replyTo(message, 'error', e.message || e);
                }
            }

            _invoke(command, args) {
                return this[command].apply(this, args);
            }
        };

        // Collect function names of the Server's interface
        Server.prototype._rpcInterface = [];
        for (const functionName of Util.userFunctions(clazz.prototype)) {
            Server.prototype._rpcInterface.push(functionName);
        }
        Server.prototype._rpcInterface.push('getRpcInterface');

        // Add function to retrieve the interface
        Server.prototype['getRpcInterface'] = function() {
           return Server.prototype._rpcInterface;
        }

        return Server;
    }
}