var express = require('express');
var mysql = require('mysql');
var program = require('commander');
var session = require('cookie-session');
var bodyParser = require("body-parser");
var compression = require("compression");

var staticMiddlewareOptions = {
    dotfiles: 'deny',
    etag: true,
    extensions: ['html']
};

var app = express();

app.engine('html', require('hogan-express'));
app.set('view engine', 'html');
app.set('views', __dirname+'/client/views');
app.use('/client', express.static(__dirname+'/client'));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, appID, empID, version, token");
    next();
});

app.use(bodyParser.urlencoded({ "limit":"50mb",extended: true }))
app.use(compression()); //compressing payload on every request

program
.version('1.1.0')
.option('-p, --port [value]', 'specify the port number')
.option('-c, --config [src]', 'specify config options')
.parse(process.argv);

var config = require(program.config);

var poolConfig = {
	connectionLimit: 20,
	user: config["db"]["user"],
	password: config["db"]["password"],
	database: config["db"]["name"],
	debug: false,
	connectTimeout: 120000 ,
	timeout: 120000
};

poolConfig["host"] =  config["db"]["host"];

var connectionPool = mysql.createPool(poolConfig);

function serviceError(res, err) {
    res.json({
        status: "fail",
        message: 'some error has occurred',
        error: err
    });
    return;
}

function unprocessableEntity(res) {
    res.json({
        status: "fail",
        nessage: "missing parameters"
    });
    return;
}

var settings = {
    app: app,
    config: config,
    connectionPool: connectionPool,
    serviceError: serviceError,
    unprocessableEntity: unprocessableEntity
};

require(__dirname+'/routes/home.js')(settings);
require(__dirname+'/routes/api.js')(settings);

app.listen(program.port || 8080, function(){
    console.log('Listening to port: 8080');
});