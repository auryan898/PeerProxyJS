
var data_buffer = {};

function verify(text) {
    return true; // TODO: Do a jwt password verification of some sort
}

function data_receive_callback(data) {
    if (!(data instanceof Object)) {
        return;
    }
    var key = data.__key__;
    var jwt = data.__jwt__;
    delete data.__key__;
    delete data.__jwt__;

    if (!verify(data.__jwt__)) {
        return;
    }

    data_buffer[key].resolve(data);
}

function add_key_promise(action, key=null) {
    if (key == null) {
        key = crypto.randomUUID();
    }
    action(key); // Perform action
    var promise = new Promise(function(resolve, reject) {
        data_buffer[key] = {
            'resolve': resolve,
            'reject': reject
        }
    });
    return promise;
}


// peer = new Peer();

// var conn = peer.connect('some-peer-id');

// var can_send = false;
// conn.on('open', function() {
//     can_send = true;
// });

// conn.on('data', data_receive_callback);

