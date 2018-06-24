(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Naming conventions
 * --------------------
 * 1) Variable Names
 *      a) Global variables: use prefix global with all letters in lowercase seperated by underscore
 *      b) Local variables: camelCase convention.
 *      c) constants: All letters uppercase seperated by underscore
 * 
 * // TODO
 *  # User should be able to draw a rectangle using mouse drag (Done)
 *  # User should be able to drag, resize and rotate a rectangle (Done)
 *  # User should be able to delete single object (Done)
 *  # User should be able to delete all objects in one click (Done)
 *  # User should be able to retrieve objects from database (Done)
 *  # User should be able to analyse the objects based on a reference object (Done)
 *  # User should be able to change the reference object's dimensions in both pixel and mm
 *  # A quick summary of analysis should be visible to user whenever required.
 *  # One click should not lead to a box creation
 *  # Retrieval of objects from database (Done)
 */

// GLOBAL VARIABLES
var qs = require('qs');
var global_canvas;
var global_target_image;
var global_started = false;
var global_x = 0, global_y = 0;
var global_category_array = [];

function getQueryString(key){
    return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

// get distance between two points
function getDistance(x1, y1, x2, y2) {
    var xs = x2 - x1;
    var ys = y2 - y1;
    xs *= xs;
    ys *= ys;
    return Math.sqrt(xs + ys);
  }

prepareCanvas();

function prepareCanvas() {
    // set the target image
    global_target_image = new Image();
    global_target_image.src = '/client/images/potato_kufri_bahar_2.jpeg';

    // as soon as the image is loaded, prepare the canvas
    global_target_image.onload = function() {
        global_canvas = new fabric.Canvas('my-canvas', {
            width: this.naturalWidth,
            height: this.naturalHeight,
            backgroundImage: this.src
        });
        addEventHandlers();
        getObjectData();
    }
}

/**
 * Functon to add a rectangle to a canvas
 * @param {object} properties 
 */

function addRect(properties) {
    var rect = new fabric.Rect(properties);
    global_canvas.add(rect);
    global_canvas.setActiveObject(rect);
    //analyseObjects();
}

/**
 * Function to begin rectangle drawing
 * @param {object} options 
 */

function beginRectDraw(options) {
    if(options.target != null || options.target != undefined){
        return;
    }
    global_started = true;
    var mouse = global_canvas.getPointer();
    global_x = mouse.x;
    global_y = mouse.y;
    var properties = {
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 1,
        fill: null,
        stroke: 'rgb(0,255,0)',
        strokeWidth: 2,
    }
    addRect(properties);
}

/**
 * Function to draw react on mousemove
 * @param {options} options 
 */

function drawRect(options){
    if(!global_started) {
        return false;
    }

    if(options.target != null || options.target != undefined){
        return;
    }

    var mouse = global_canvas.getPointer();
    var x = Math.min(mouse.x,  global_x);
    var y = Math.min(mouse.y,  global_y);
    var w = Math.abs(mouse.x - global_x);
    var h = Math.abs(mouse.y - global_y);

    var square = global_canvas.getActiveObject();
    square.set('top', y).set('left', x).set('width', w).set('height', h); 
    square.setCoords();
    global_canvas.renderAll();
}

/**
 * Function to finish rectangle drawing
 */

function finishRect() {
    if(global_started) {
        global_started = false;
    }
}

function showDeleteBtn(options) {
    var deleteBtn = document.getElementsByClassName('delete-obj-btn')[0];
    var selected = global_canvas.getActiveObject();
    deleteBtn.style.display = 'block';
    deleteBtn.style.top = selected.top + 10 + 'px';
    deleteBtn.style.left = selected.left + 10 + 'px';
}

function hideDeleteBtn(options) {
    var deleteBtn = document.getElementsByClassName('delete-obj-btn')[0];
    deleteBtn.style.display = 'none';
}

// event listeners for canvas
function addEventHandlers() {
    global_canvas.on('mouse:down', function(options){ beginRectDraw(options) });
    global_canvas.on('mouse:up', function(options){ finishRect(options) });
    global_canvas.on('mouse:move', function(options){ drawRect(options) });
    global_canvas.on('object:selected', function(options){ showDeleteBtn(options) } );
    global_canvas.on('object:modified', function(options){ showDeleteBtn(options) } );
    global_canvas.on('object:moving', function(options){ showDeleteBtn(options) } );
    global_canvas.on('object:scaling', function(options){ showDeleteBtn(options) } );
    global_canvas.on('object:rotated', function(options){ showDeleteBtn(options) } );
}

// method to categorize the objects
function analyseObjects() {
    var local_category_array = [];
    var totalSum = 0;
    // create a copy of global_category_array
    global_category_array.forEach(function(aCategory){
        local_category_array.push(Object.assign({}, aCategory));
    });
    var totalObjects = global_canvas.getObjects().length;
    var anObject, objectSide, found = false;
    var objWidth, objHeight;
    // loop through the objects array
    for(var i = 0; i < totalObjects; i++) {
        // ignoring first object
        // as first object is reference object
        if(i == 0){
            continue;
        }
        found = false;
        anObject = global_canvas.getObjects()[i];
        // get the minimum of width and height
        objWidth = (getDistance(anObject['aCoords']['tl']['x'], anObject['aCoords']['tl']['y'], anObject['aCoords']['tr']['x'], anObject['aCoords']['tr']['y'])) * getPixelValueInMM();
        objHeight = (getDistance(anObject['aCoords']['tr']['x'], anObject['aCoords']['tr']['y'], anObject['aCoords']['br']['x'], anObject['aCoords']['br']['y'])) * getPixelValueInMM();
        objWidth > objHeight ? objectSide = objHeight : objectSide = objWidth;
        // loop through the categoryArray
        for(var j = 0; j < local_category_array.length; j++){
            // if minium of width or height of an object falls under the selected category
            if(objectSide >= local_category_array[j]['minSize'] && objectSide < local_category_array[j]['maxSize']) {
                // add side to the sum, this helps in weight calculation
                totalSum += objectSide;
                // increment the count for selected category
                local_category_array[j]['count'] += 1;
                // increase the sum in categoryArray
                if(local_category_array[j].hasOwnProperty('sum')){
                    local_category_array[j]['sum'] += 1; 
                } else {
                    local_category_array[j]['sum'] = 0;
                }
                // set flag to true
                found = true;
                // break the loop
                break;
            }
        }
        // if object did not fall in any category criteria
        if(!found){
            // add it to the super category
            totalSum += objectSide;
            local_category_array[4]['count'] += 1;
            if(local_category_array[4].hasOwnProperty('sum')){
                local_category_array[4]['sum'] += 1; 
            } else {
                local_category_array[4]['sum'] = 0;
            }
        }
    }
    // update the countInPercentage and weightInPercentage for category array
    local_category_array.forEach(function(aCategory, aCategoryIndex){
        aCategory['countInPercentage'] = (parseFloat(aCategory['count']*100)/totalObjects-1);
        if(Math.round(aCategory['countInPercentage']) !== aCategory['countInPercentage']){
            aCategory['countInPercentage'] = (aCategory['countInPercentage']).toFixed(2);
        }
        if(isNaN(aCategory['percentage'])){
            aCategory['percentage'] = 0;
        }
        aCategory['sumInPercentage'] = ( parseFloat(aCategory['sum']*100 / parseFloat(totalSum)) )
        if(Math.round(aCategory['sumInPercentage']) !== aCategory['sumInPercentage']){
            aCategory['sumInPercentage'] = (aCategory['sumInPercentage']).toFixed(2);
        }
        if(isNaN(aCategory['sumInPercentage'])){
            aCategory['sumInPercentage'] = 0;
        }
    });
    console.log(local_category_array);
}

// method to retrive object data
function getObjectData() {
    // call fetch api to get object data
    request({
        method: "get",
        url: "/fetch/processed-image-object",
        params: {refID: 100, refTable: 'TestTable'}
    }).then(function(data){
        var objectPosition, objectSide;
        global_category_array = data.helper.categoryArray;
        var pixelValueInMM = data.helper.pixelValueInMM || 0.885;
        // create a referenceObject
        if(data.helper.referenceObject == null){
            var refDimensions = {};
            refDimensions.width = 196;
            refDimensions.height = 196;
            refDimensions.top = global_canvas.getHeight() - 196;
            refDimensions.left = global_canvas.getWidth() - 196;
            refDimensions.opacity = 1;
            refDimensions.fill = null;
            refDimensions.stroke = 'orange';
            refDimensions.strokeWidth = 2;
            document.getElementById('ref-width').value = (refDimensions.width * pixelValueInMM);
            document.getElementById('ref-height').value = (refDimensions.height * pixelValueInMM);
            addRect(refDimensions);
        } else {
            var referenceObject = data.helper.referenceObject;
            var refDimensions = getDimensionsWithAngle({
                x1: referenceObject[0].x,
                x2: referenceObject[1].x,
                x3: referenceObject[2].x,
                x4: referenceObject[3].x,
                y1: referenceObject[0].y,
                y2: referenceObject[1].y,
                y3: referenceObject[2].y,
                y4: referenceObject[3].y
            });
            refDimensions.opacity = 1;
            refDimensions.fill = null;
            refDimensions.stroke = 'orange';
            refDimensions.strokeWidth = 2;
            document.getElementById('ref-width').value = (refDimensions.width * pixelValueInMM);
            document.getElementById('ref-height').value = (refDimensions.height * pixelValueInMM);
            addRect(refDimensions);
        }

        // loop through the objects and render each
        data.data.forEach(function(anObject, anObjectIndex){
            objectPosition = anObject.objectPosition;
            var dimensions = getDimensionsWithAngle({
                x1: objectPosition[0].x,
                x2: objectPosition[1].x,
                x3: objectPosition[2].x,
                x4: objectPosition[3].x,
                y1: objectPosition[0].y,
                y2: objectPosition[1].y,
                y3: objectPosition[2].y,
                y4: objectPosition[3].y
            });
            dimensions.opacity = 1;
            dimensions.fill = null;
            dimensions.stroke = 'rgb(0,255,0)';
            dimensions.strokeWidth = 2;
            addRect(dimensions);
        });
        analyseObjects();
    });
}

//method to calculate pixel value in mm
function getPixelValueInMM() {
    var refObject = global_canvas.getObjects()[0]['aCoords'];
    var refObjWidthInPx = (getDistance(refObject['tl']['x'], refObject['tl']['y'], refObject['tr']['x'], refObject['tr']['y']));
    var refObjHeightInPx = (getDistance(refObject['tr']['x'], refObject['tr']['y'], refObject['br']['x'], refObject['br']['y']));
    var refObjWidthInMM = document.getElementById('ref-width').value;
    var refObjHeightInMM = document.getElementById('ref-height').value;
    var pixelValueInMM = (((parseFloat(refObjWidthInMM) + parseFloat(refObjHeightInMM)) / 2) / ((parseFloat(refObjWidthInPx) + parseFloat(refObjHeightInPx)) / 2 )).toFixed(3);
    return pixelValueInMM;
}

// method to save data to a server
function saveObjectData() {
    var data = {};
    var objTopLeftX = [], objTopRightX = [], objBottomRightX = [], objBottomLeftX = [];
    var objTopLeftY = [], objTopRightY = [], objBottomRightY = [], objBottomLeftY = [];
    var objHeight = [], objWidth = [], objWidthNum, objHeightNum;
    var referenceObject = [];
    // get total number of objects
    var totalObjects = global_canvas.getObjects().length;
    var anObject;
    // loop through the objects and store their coordinates
    for(var i = 0; i < totalObjects; i++){
        // ignore first object, as first object is always reference object
        if(i == 0){
            anObject = global_canvas.getObjects()[i]['aCoords'];
            referenceObject.push(anObject.tl.x, anObject.tl.y, anObject.tr.x, anObject.tr.y, anObject.br.x, anObject.br.y, anObject.bl.x, anObject.bl.y);
            continue;
        }
        anObject = global_canvas.getObjects()[i]['aCoords'];
        objTopLeftX.push(anObject.tl.x);
        objTopRightX.push(anObject.tr.x);
        objBottomRightX.push(anObject.br.x);
        objBottomLeftX.push(anObject.bl.x);
        objTopLeftY.push(anObject.tl.y);
        objTopRightY.push(anObject.tr.y);
        objBottomRightY.push(anObject.br.y);
        objBottomLeftY.push(anObject.bl.y);
        objWidthNum = (getDistance(anObject['tl']['x'], anObject['tl']['y'], anObject['tr']['x'], anObject['tr']['y'])) * getPixelValueInMM();
        objHeightNum = (getDistance(anObject['tr']['x'], anObject['tr']['y'], anObject['br']['x'], anObject['br']['y'])) * getPixelValueInMM();
        objHeight.push(objHeightNum);
        objWidth.push(objWidthNum);
    };
    // prepare other required data
    data.imageWidth = global_canvas.getWidth();
    data.imageHeight = global_canvas.getHeight();
    data.numberOfObjects = totalObjects - 1;
    data.empID = 'EI201700050';
    data.refID = getQueryString('refID');
    data.refTable = getQueryString('refTable');
    data.predictedScale = getPixelValueInMM();
    data.blackBackground = null;
    data.referenceObject = referenceObject
    data.pictureUrl = getQueryString('image');
    data.typeID = getQueryString('typeID');
    data.lat = getQueryString('lat');
    data.lon = getQueryString('lon');
    data.appID = 8;
    data.version = '1.1.0';
    data.code = 0;
    data.token = 'u23ukjhd0034892kd3';
    data.originalImage = getQueryString('image');
    data.method = 'manual';
    data.lotNo = 143;
    data.qID = 34;
    data.mapID = 6;
    data.objectHeight = objHeight;
    data.objectWidth = objWidth;
    data.topLeftX = objTopLeftX;
    data.topRightX = objTopRightX;
    data.bottomRightX = objBottomRightX;
    data.bottomLeftX = objBottomLeftX;
    data.topLeftY = objTopLeftY;
    data.topRightY = objTopRightY;
    data.bottomRightY = objBottomRightY;
    data.bottomLeftY = objBottomLeftY;
    console.log(data);
    //send the data to a server
    request({
        method: "post",
        url: "/insert/image-object-data", // fetch/processed-image-object
        data: qs.stringify(data)
    }).then(function(data) {
        console.log(data);
    })
}

document.getElementById("obj-delete").addEventListener("click", function(){
    var allObjects = global_canvas.getObjects();
    while(allObjects.length != 0){
        global_canvas.remove(allObjects[0]);
    }
    hideDeleteBtn();
})

document.getElementsByClassName("delete-obj-btn")[0].addEventListener("click", function(){
    global_canvas.remove(global_canvas.getActiveObject());
    hideDeleteBtn();
});

document.getElementById("serialize-data").addEventListener("click", function(){
    console.log(JSON.stringify(global_canvas));
    saveObjectData();
});

document.getElementById('save-ref-dimension').addEventListener("click", function(){
    analyseObjects();
});

document.getElementById('ref-width').addEventListener('keyup', function(){
    analyseObjects();
});

document.getElementById('ref-width').addEventListener('keyup', function(){
    analyseObjects();    
});
},{"qs":3}],2:[function(require,module,exports){
'use strict';

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

module.exports = {
    'default': 'RFC3986',
    formatters: {
        RFC1738: function (value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function (value) {
            return value;
        }
    },
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

},{}],3:[function(require,module,exports){
'use strict';

var stringify = require('./stringify');
var parse = require('./parse');
var formats = require('./formats');

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

},{"./formats":2,"./parse":4,"./stringify":5}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var has = Object.prototype.hasOwnProperty;

var defaults = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    parameterLimit: 1000,
    plainObjects: false,
    strictNullHandling: false
};

var parseValues = function parseQueryStringValues(str, options) {
    var obj = {};
    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
    var parts = cleanStr.split(options.delimiter, limit);

    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];

        var bracketEqualsPos = part.indexOf(']=');
        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder);
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder);
            val = options.decoder(part.slice(pos + 1), defaults.decoder);
        }
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function (chain, val, options) {
    var leaf = val;

    for (var i = chain.length - 1; i >= 0; --i) {
        var obj;
        var root = chain[i];

        if (root === '[]') {
            obj = [];
            obj = obj.concat(leaf);
        } else {
            obj = options.plainObjects ? Object.create(null) : {};
            var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
            var index = parseInt(cleanRoot, 10);
            if (
                !isNaN(index)
                && root !== cleanRoot
                && String(index) === cleanRoot
                && index >= 0
                && (options.parseArrays && index <= options.arrayLimit)
            ) {
                obj = [];
                obj[index] = leaf;
            } else {
                obj[cleanRoot] = leaf;
            }
        }

        leaf = obj;
    }

    return leaf;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;

    // Get the parent

    var segment = brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    var keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options);
};

module.exports = function (str, opts) {
    var options = opts ? utils.assign({}, opts) : {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
    options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options);
        obj = utils.merge(obj, newObj, options);
    }

    return utils.compact(obj);
};

},{"./utils":6}],5:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var formats = require('./formats');

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

var defaults = {
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify = function stringify( // eslint-disable-line func-name-matching
    object,
    prefix,
    generateArrayPrefix,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    formatter,
    encodeValuesOnly
) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder);
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            values = values.concat(stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        } else {
            values = values.concat(stringify(
                obj[key],
                prefix + (allowDots ? '.' + key : '[' + key + ']'),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        }
    }

    return values;
};

module.exports = function (object, opts) {
    var obj = object;
    var options = opts ? utils.assign({}, opts) : {};

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
    var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    if (typeof options.format === 'undefined') {
        options.format = formats['default'];
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }
    var formatter = formats.formatters[options.format];
    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        keys = keys.concat(stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
        ));
    }

    var joined = keys.join(delimiter);
    var prefix = options.addQueryPrefix === true ? '?' : '';

    return joined.length > 0 ? prefix + joined : '';
};

},{"./formats":2,"./utils":6}],6:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

var compactQueue = function compactQueue(queue) {
    var obj;

    while (queue.length) {
        var item = queue.pop();
        obj = item.obj[item.prop];

        if (Array.isArray(obj)) {
            var compacted = [];

            for (var j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }

    return obj;
};

var arrayToObject = function arrayToObject(source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

var merge = function merge(target, source, options) {
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {
            if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = arrayToObject(target, options);
    }

    if (Array.isArray(target) && Array.isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                if (target[i] && typeof target[i] === 'object') {
                    target[i] = merge(target[i], item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

var assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

var decode = function (str) {
    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};

var encode = function encode(str) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = typeof str === 'string' ? str : String(str);

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2D // -
            || c === 0x2E // .
            || c === 0x5F // _
            || c === 0x7E // ~
            || (c >= 0x30 && c <= 0x39) // 0-9
            || (c >= 0x41 && c <= 0x5A) // a-z
            || (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)]
            + hexTable[0x80 | ((c >> 12) & 0x3F)]
            + hexTable[0x80 | ((c >> 6) & 0x3F)]
            + hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

var compact = function compact(value) {
    var queue = [{ obj: { o: value }, prop: 'o' }];
    var refs = [];

    for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];

        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];
            var val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }

    return compactQueue(queue);
};

var isRegExp = function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

var isBuffer = function isBuffer(obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

module.exports = {
    arrayToObject: arrayToObject,
    assign: assign,
    compact: compact,
    decode: decode,
    encode: encode,
    isBuffer: isBuffer,
    isRegExp: isRegExp,
    merge: merge
};

},{}]},{},[1]);
