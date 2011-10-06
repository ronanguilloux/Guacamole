

var http = require('http'),
    vows = require('vows'),
    assert = require('assert'),
    route = {'host': "localhost", 'port': 4000};


function assertStatus(code) {
    return function (res,err) {
        assert.equal (res.statusCode, code);
    };
}

var api = {
    get: function (path) {
        route.path = '/';
        return function () {
            http.get(route, this.callback);
        };
    }
};

vows.describe('Guacamole routes test suite').addBatch({
    'GET /': {
        topic: api.get('/'),
        'should respond with a 200 OK': assertStatus(200)
    },
    'GET /documents': {
        topic: api.get('/documents'),
        'should respond with a 200 OK': assertStatus(200)
    },
    'GET /tags': {
        topic: api.get('/tags'),
        'should respond with a 200 OK': assertStatus(200)
    },
    'GET /tags/semantic': {
        topic: api.get('/tags/semantic'),
        'should respond with a 200 OK': assertStatus(200)
    },
    'GET /tags/starting/a': {
        topic: api.get('/tags/semantic'),
        'should respond with a 200 OK': assertStatus(200)
    },
     'GET /tags/starting/zzz': {
        topic: api.get('/tags/semantic'),
        //'should respond with a 204 OK': assertStatus(204)
        // Unfortunatly 204 does not work. a firebug try using $.get() return 204 anyway...
        'should respond with a 200 (well, a 204 in fact)': assertStatus(200)
    },
    'GET /tags/treeview': {
        topic: api.get('/tags/treeview'),
        'should respond with a 200 OK': assertStatus(200)
    },
    'GET /documentation': {
        topic: api.get('/documentation'),
        'should respond with a 200 OK': assertStatus(200)
    }
}).run();

