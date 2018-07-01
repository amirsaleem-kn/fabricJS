module.exports = function(settings){

    var app = settings.app;
    var config = settings.config;
    var baseUrl = config.baseUrl;
    app.get('/', function(req, res){
        res.render('index', {
            baseURL: baseUrl
        });
    });

};