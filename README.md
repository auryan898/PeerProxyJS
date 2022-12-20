# PeerProxyJS
Uses P2P connection (PeerJS) to establish Remote Objects (RMI) between a host and a client peer.

The "Client" are peers that request to utilize functions on the "Host" (called Server in the library).
Requests are always processed and returned as Promises for simplicity.

## Usage

Include peerproxy.js in a script tag like so:

```
<script src="lib/peerproxy.js"></script>
```

Example Code on Server/Host Peer:
```
// No authentication by default
var server = new PeerProxyJS.PeerProxyServer()
server.register_handler('action', (x, y) => {
  return x + y; // Returned Promises will be resolved before sending back to client
})

server.get_id(); // -> The server id to be used by the Client Peer
```

Example Code on Client Peer:
```
// No authentication by default
var proxy = new PeerProxyJS.PeerProxy("some-host-id");

proxy.action(123, 456).then((response) => {
  console.log("123 + 456 =", response);
})
```

## Authentication

Default Authenticator is of the format:
```
class PeerProxyAuthenticator {
    verify(text) {
        return text == 'password';
    }

    get_password() {
        return 'password';
    }
}
```

To override this, create your own custom class and pass it in (potentially a different one for Server/Host and Client):

```
class CustomAuthenticator {
    verify(text) {
        return ...; // TODO: Do a password verification of some sort
    }

    get_password() {
        return ...; // TODO: Give a key that is passed to the other Client/Server for use in their verify(key) function
    }
}

// Pass it in on creation of either Server or Client
var server = new PeerProxyJS.PeerProxyServer(new CustomAuthenticator());
var proxy = new PeerProxyJS.PeerProxy("some-host-id", new CustomAuthenticator());

```
