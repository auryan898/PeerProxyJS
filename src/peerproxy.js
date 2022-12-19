

/**
 * 
 * @param {*} value any value
 * @returns a Promise wrapping the value, unless value is a Promise already.
 */
function value_to_promise(value) {
    if (value instanceof Promise) {
        return value;
    }

    return new Promise((resolve, reject) => {
        resolve(value);
    })
}

class PeerProxyAuthenticator {
    verify(text) {
        return text == 'password'; // TODO: Do a jwt password verification of some sort
    }

    get_password() {
        return 'password';
    }
}

class PeerProxyServer {
    constructor(f_prefix, authenticator) {
        this.authenticator = !authenticator ? new PeerProxyAuthenticator() : authenticator;

        // Used to denote registered function names
        this.f_prefix = f_prefix;

        this.peer = new Peer();
        var self = this;
        this.peer.on('connection', function (conn) {
            conn.on('data', self.data_answer_callback(conn));
        });
        this.handlers = {}
    }

    get_id() {
        return this.peer.id;
    }

    data_answer_callback(conn) {
        var self = this;
        return function (data) {
            if (!(data instanceof Object)) {
                return;
            }

            var f_name = data.__function__;
            var key = data.__key__;
            var args = data.__args__;


            // TODO: Authenticate before execution
            if (!self.authenticator.verify(data.__jwt__)) {
                conn.send({
                    '__key__': key,
                    '__error__': 'Authentication Failed'
                })
                return;
            }

            // TODO: Execute generic Promise functions
            value_to_promise(self.get_handler(f_name)(...args)).then((result) => {
                conn.send({
                    '__key__': key,
                    '__jwt__': self.authenticator.get_password(),
                    '__result__': result
                });
            });
        }
    }

    /**
     * 
     * @param {*} function_name String function name
     * @param {*} handler A function that returns a promise
     */
    register_handler(function_name, handler) {
        this.handlers[this.f_prefix + function_name] = handler;
    }

    get_handler(f_name) {
        return this.handlers[this.f_prefix + f_name];
    }
}

class _PeerProxy {
    constructor(peer_id, authenticator = null) {
        this.authenticator = !authenticator ? new PeerProxyAuthenticator() : authenticator;

        var self = this;
        this.data_buffer = {};
        this.can_send = false;

        this.peer = new Peer();
        this.peer.on('open', function () {
            self.conn = self.peer.connect(peer_id);
            self.conn.on('open', function () {
                self.can_send = true;
                self._execute_buffered();
            });
            self.conn.on('data', self.data_receive_callback.bind(self));
        });
    }

    _add_buffered(handler) {
        if (!this.hasOwnProperty('_buffered_actions')) {
            this._buffered_actions = []
        }
        this._buffered_actions.push(handler)
    }

    _execute_buffered() {
        if (this.hasOwnProperty('_buffered_actions')) {
            for (var i = 0; i < this._buffered_actions.length; i++) {
                this._buffered_actions[i]();
            }
            delete this._buffered_actions;
        }
    }

    data_receive_callback(data) {
        if (!data.hasOwnProperty('__key__')) {
            throw new Error("Data received does not have a key");
        }

        var key = data.__key__;
        if (data.hasOwnProperty('__error__')) {
            throw new Error("Server-side Error: " + data.__error__);
        }


        if (!data.hasOwnProperty('__jwt__') || !this.authenticator.verify(data.__jwt__)) {
            delete this.data_buffer[key];
            throw new Error("Client-side authentication failed");
            return;
        }

        delete data.__key__;
        delete data.__jwt__;

        if (!data.hasOwnProperty('__result__')) {
            throw new Error("Data received does not have a result");
        }
        this.data_buffer[key].resolve(data.__result__);
        delete this.data_buffer[key];
    }

    add_key_promise(action, key = null, timeout = 10_000) {
        if (key == null) {
            key = crypto.randomUUID();
        }
        action(key); // Perform action
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self.data_buffer[key] = {
                'resolve': resolve,
                'reject': reject
            }
        });
        setTimeout(function () {
            if (!self.data_buffer.hasOwnProperty(key)) {
                return;
            }

            self.data_buffer[key].reject("Peer Proxy Request Expired");
            delete self.data_buffer[key];
        }, timeout);
        return promise;
    }

    action(f_name) {
        var self = this;
        return function (...args) {
            var data = {
                '__function__': f_name,
                '__args__': args,
                '__jwt__': self.authenticator.get_password()
                // TODO: Add authentication stuff
            }
            return self.add_key_promise(function (key) {
                // if (can_send) {
                // }
                data['__key__'] = key;

                if (self.can_send) {
                    self.conn.send(data);
                } else {
                    self._add_buffered(() => { self.conn.send(data) });
                }
            })
        }
    }
}

class PeerProxy {
    constructor(peer_id, jwt) {
        var self = this;
        this._peerproxy = new _PeerProxy(peer_id, jwt);

        return new Proxy({}, {
            get(target, prop, receiver) {
                if (prop === "_peerproxy") {
                    return;
                }

                return self._peerproxy.action(prop)
            }
        });
    }
}