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
 *  # User should be able to analyse the objects based on a reference object
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
        strokeWidth: 2
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
        found = false;
        anObject = global_canvas.getObjects()[i];
        // get the minimum of width and height
        objWidth = anObject.width * getPixelValueInMM();
        objHeight = anObject.height * getPixelValueInMM();
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
        aCategory['countInPercentage'] = (parseFloat(aCategory['count']*100)/totalObjects);
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
    var refObject = global_canvas.getObjects()[0];
    var refObjWidthInPx = refObject.width;
    var refObjHeightInPx = refObject.height;
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
    var objHeight = [], objWidth = [];
    // get total number of objects
    var totalObjects = global_canvas.getObjects().length;
    var anObject;
    // loop through the objects and store their coordinates
    for(var i = 0; i < totalObjects; i++){
        anObject = global_canvas.getObjects()[i]['aCoords'];
        objTopLeftX.push(anObject.tl.x);
        objTopRightX.push(anObject.tr.x);
        objBottomRightX.push(anObject.br.x);
        objBottomLeftX.push(anObject.bl.x);
        objTopLeftY.push(anObject.tl.y);
        objTopRightY.push(anObject.tr.y);
        objBottomRightY.push(anObject.br.y);
        objBottomLeftY.push(anObject.bl.y);
        objHeight.push(global_canvas.getObjects()[i].height * getPixelValueInMM);
        objWidth.push(global_canvas.getObjects()[i].width * getPixelValueInMM);
    };
    // prepare other required data
    data.imageWidth = global_canvas.getWidth();
    data.imageHeight = global_canvas.getHeight();
    data.numberOfObjects = totalObjects
    data.empID = 'EI201700050';
    data.refID = getQueryString('refID');
    data.refTable = getQueryString('refTable');
    data.predictedScale = 0.885;
    data.blackBackground = null;
    data.referenceObject = null;
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

document.getElementById("obj-count").addEventListener("click", function(){
    console.log(global_canvas.getObjects());
});

document.getElementById("clone-obj").addEventListener("click", function(){
    var selectedObj = global_canvas.getActiveObject();
    var coords = {
        x1: selectedObj.aCoords.tl.x,
        x2: selectedObj.aCoords.tr.x,
        x3: selectedObj.aCoords.br.x,
        x4: selectedObj.aCoords.bl.x,
        y1: selectedObj.aCoords.tl.y,
        y2: selectedObj.aCoords.tr.y,
        y3: selectedObj.aCoords.br.y,
        y4: selectedObj.aCoords.bl.y
    }
    var dimensions = getDimensionsWithAngle(coords);
    global_canvas.remove(global_canvas.getActiveObject());
    hideDeleteBtn();
    addRect({
        width: dimensions.width,
        height: dimensions.height,
        top: dimensions.top,
        left: dimensions.left,
        angle: dimensions.angle,
        stroke: 'orange',
        fill: null
    })
});

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
})

document.getElementById("serialize-data").addEventListener("click", function(){
    console.log(JSON.stringify(global_canvas));
    saveObjectData();
})