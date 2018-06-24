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
 *  # One click 
 */

// GLOBAL VARIABLES
var global_canvas;
var global_target_image;
var global_started = false;
var global_x = 0, global_y = 0;

function getQueryString(key){
    return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

function getPixelValueInMM() {
    return false;
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
})

document.getElementById('canvas-zoom-value').addEventListener("keyup", function(){
    global_canvas.setZoom(this.value);
    global_canvas.renderAll();
});