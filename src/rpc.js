import Util from './util.js';

export default class RPC {
    /**
     * @param {Window} targetWindow
     * @param {string} interfaceName
     * @param {string} [targetOrigin]
     * @returns {Promise}
     */
    static async Client(targetWindow, interfaceName, targetOrigin = '*') {
        return new Promise((resolve, reject) => {
            let connected = false;

            const interfaceListener = (message) => {
                if (message.source !== targetWindow
                    || message.data.status !== 'OK'
                    || message.data.interfaceName !== interfaceName) return;

                self.removeEventListener('message', interfaceListener);

                connected = true;

                resolve(new (RPC._Client(targetWindow, interfaceName, message.data.result))());
            };

            self.addEventListener('message', interfaceListener);

            const tryToConnect = () => {
                if (connected) return;

                try {
                    targetWindow.postMessage({ command: 'getRpcInterface', interfaceName, id: 0 }, targetOrigin);
                } catch (e){
                    console.log('postMessage failed:' + e);
                }
                setTimeout(tryToConnect, 1000);
            }

            setTimeout(tryToConnect, 100);

            setTimeout(() => reject('Connection timeout'), 10000);
        });
    }

    
    /**
     * @param {Window} targetWindow
     * @param {string} interfaceName
     * @param {array} funcNames
     * @returns {Class}
     * @private
     */
    static _Client(targetWindow, interfaceName, funcNames) {
        const Client = class {
            constructor() {
                this.availableMethods = funcNames;
                // Svub: Code smell that _targetWindow and _waiting are visible outside. Todo later!
                /** @private
                 *  @type {Window} */
                this._targetWindow = targetWindow;
                /** @private
                 *  @type {Map.<number,{resolve:Function,error:Function}>} */
                this._waiting = new Map();
                self.addEventListener('message', this._receive.bind(this));
            }

            close() {
                self.removeEventListener('message', this._receive.bind(this));
            }

            _receive(message) {
                // Discard all messages from unwanted sources
                // or which are not replies
                // or which are not from the correct interface
                if (message.source !== this._targetWindow
                    || !message.data.status
                    || message.data.interfaceName !== interfaceName) return;

                const callback = this._waiting.get(message.data.id);

                if (!callback) {
                    console.log('Unknown reply', message.data);
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
                    const obj = { command, interfaceName, args, id: Util.getRandomId() };
                    this._waiting.set(obj.id, { resolve, error });
                    this._targetWindow.postMessage(obj, '*');
                    setTimeout(() => error('request timeout'), 10000);
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

    /**
     * @param {Class} clazz: The class whose methods will be made available via postMessage RPC
     * @param {boolean} useAccessControl: If set, message.source and message.origin will be passed as first two arguments to each method.
     * @return {T extends clazz}
     */
    static Server(clazz, useAccessControl) {
        return new (RPC._Server(clazz, useAccessControl))();
    }

    static _Server(clazz, useAccessControl) {
        const Server = class extends clazz {
            constructor() {
                super();
                this._name = Server.prototype.__proto__.constructor.name;
                self.addEventListener('message', this._receive.bind(this));
            }

            close() {
                self.removeEventListener('message', this._receive.bind(this));
            }

            _replyTo(message, status, result) {
                message.source.postMessage({ status, result, interfaceName: this._name, id: message.data.id }, message.origin);
            }

            _receive(message) {
                try {
                    if (message.data.interfaceName !== this._name) return;

                    let args = message.data.args || [];

                    if (useAccessControl && message.data.command !== 'getRpcInterface') {
                        // Inject calling window and origin to function args
                        const { source: callingWindow, origin: callingOrigin } = message;
                        args = [callingWindow, callingOrigin, ...args];
                    }

                    // Test if request calls an existing method with the right number of arguments
                    const calledMethod = this[message.data.command];
                    if(!calledMethod) {
                        console.warn(`Non-existing method ${message.data.command} called: ${message}`);
                        return;
                    }

                    if (calledMethod.length < args.length) {
                        console.warn(`Too many arguments passed: ${message}`);
                        return;
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

// TODO: Handle unload/load events (how?)