function castInt( value ) {
    if(typeof value == 'number' || typeof value == 'string'){
        if(isNaN(parseFloat(value))) {
            return null;
        }
        return parseFloat(value);
    }
    return null;
}

function getDistance(x1, y1, x2, y2) {
    var xs = x2 - x1;
    var ys = y2 - y1;
    xs *= xs;
    ys *= ys;
    return Math.sqrt(xs + ys);
}

module.exports = function(settings) {
    var app = settings.app;
    var config = settings.config;
    var connectionPool = settings.connectionPool;

    app.get('/health', function(req, res){
        res.json({
            status: "success"
        });
        return;
    });

}