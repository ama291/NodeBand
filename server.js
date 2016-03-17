var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ port: 8888 });

server.views({
    relativeTo: __dirname,
    path: 'templates',
    engines: {
        ejs: require('ejs')
    }
});

server.register(require('hapi-auth-cookie'), function (err) {
    server.auth.strategy('session', 'cookie', {
        password: 'secret',
        cookie: 'sid-example',
        redirectTo: '/login',
        isSecure: false
    });
});

var login = function (request, reply) {

    if (request.auth.isAuthenticated) {
        return reply.redirect('/');
    }

    var message = '';
    var account = null;

    if (request.method === 'get') {
        return reply.file('public/login.html');
    }

    if (request.method === 'post') {
        //user database
        var users = [];
        var mysql      = require('mysql');
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : 'root',
            database : 'node-band',
            port     : 8889
        });

        connection.connect();

        connection.query('SELECT * FROM users WHERE username="' + request.payload.username + '"', function(err, rows, fields) {
            if (err) throw err;
            if (rows[0]) {
                account = {username: rows[0].username, password: rows[0].password};
            }
        });

        connection.end(function (err){
            if (!request.payload.username || !request.payload.password) {
                //handle missing
                return reply.file('public/login.html');
            }
            else {
                if (!account || account.password !== request.payload.password) {
                    //handle invalid
                    return reply.file('public/login.html');
                }
                else {
                    request.auth.session.set(account);
                    return reply.redirect('/');
                }
            }
        });
    }
};

var register = function (request, reply) {
    if (request.method === 'get') {
        return reply.file('public/register.html');
    }

    if (request.method === 'post') {
        //user database
        var users = [];
        var mysql      = require('mysql');
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : 'root',
            database : 'node-band',
            port     : 8889
        });

        connection.connect();

        connection.query('INSERT INTO users (username, password) VALUES ("' + request.payload.username + '", "' + request.payload.password + '")', function(err, rows, fields) {
            if (err) throw err;
        });

        connection.end(function (err){
            return reply.redirect('/login');
        });
    }
}

var logout = function (request, reply) {

    request.auth.session.clear();
    return reply.redirect('/');
};

//routing
server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        var mysql      = require('mysql');
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : 'root',
            database : 'node-band',
            port     : 8889
        });

        var data;

        connection.connect();

        connection.query('SELECT * FROM songs', function(err, rows, fields) {
            if (err) throw err;
            data = rows;
        });

        connection.end(function (err){
            if (data) {
                reply.view('index', {account: request.auth.credentials.username, songList: data});
            }
            else {
                reply.file('public/error.html')
            }
        });
    },
    config: {
        auth: 'session'
    }
});
server.route({
    method: 'GET',
    path: '/song/{param}',
    handler: function (request, reply) {
        var mysql      = require('mysql');
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : 'root',
            database : 'node-band',
            port     : 8889
        });

        var data;

        connection.connect();

        connection.query('SELECT * FROM songs WHERE id = "' + request.params.param + '"', function(err, rows, fields) {
            if (err) throw err;
            data = rows[0];
        });

        connection.end(function (err){
            if (data) {
                reply.view('song', {account: request.auth.credentials.username, songData: data});
            }
            else {
                reply.file('public/error.html')
            }
        });
    },
    config: {
        auth: 'session'
    }
});
server.route({
    method: ['GET', 'POST'],
    path: '/login',
    handler: login
});
server.route({
    method: ['GET', 'POST'],
    path: '/register',
    handler: register
});
server.route({
    method: 'GET',
    path: '/logout',
    handler: logout
});
server.route({
    method: 'GET',
    path: '/{param}',
    handler: {
        directory: {
            path: 'public'
        }
    }
});
server.route({
    method: 'GET',
    path: '/css/{param}',
    handler: {
        directory: {
            path: 'public/css'
        }
    }
});
server.route({
    method: 'GET',
    path: '/js/{param}',
    handler: {
        directory: {
            path: 'public/js'
        }
    }
});
server.route({
    method: 'GET',
    path: '/fonts/{param}',
    handler: {
        directory: {
            path: 'public/fonts'
        }
    }
});

//start the server
server.start(function () {
    console.log('Server running at:', server.info.uri);
});