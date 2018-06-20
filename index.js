/**
 * Naming conventions
 * --------------------
 * 1) Variable Names
 *      a) Global variables: use prefix global with all letters in lowercase seperated by underscore
 *      b) Local variables: camelCase convention.
 *      c) constants: All letters uppercase seperated by underscore
 * 
 * 2) Function Names  
 */

// GLOBAL VARIABLES
var global_cavnas;
var global_target_image;
var global_started = false;
var global_x = 0, global_y = 0;

// set the target image
global_target_image = new Image();
global_target_image.src = 'potato_kufri_bahar.jpg';

// as soon as the image is loaded, prepare the canvas
global_target_image.onload = function() {
    global_cavnas = new fabric.Canvas('my-canvas', {
        width: this.naturalWidth,
        height: this.naturalHeight,
        backgroundImage: this.src
    });
    addEventHandlers();
}

/**
 * Functon to add a rectangle to a canvas
 * @param {object} properties 
 */

function addRect(properties) {
    var rect = new fabric.Rect(properties);
    global_cavnas.add(rect);
    global_cavnas.setActiveObject(rect);
}

/**
 * Function to begin rectangle drawing
 * @param {object} options 
 */

function beginRectDraw(options) {
    console.dir(options);
    if(options.target != null || options.target != undefined){
        return;
    }
    global_started = true;
    var mouse = global_cavnas.getPointer();
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

    var mouse = global_cavnas.getPointer();
    var x = Math.min(mouse.x,  global_x);
    var y = Math.min(mouse.y,  global_y);
    var w = Math.abs(mouse.x - global_x);
    var h = Math.abs(mouse.y - global_y);

    var square = global_cavnas.getActiveObject();
    square.set('top', y).set('left', x).set('width', w).set('height', h); 
    square.setCoords();
    global_cavnas.renderAll();
}

/**
 * Function to finish rectangle drawing
 */

function finishRect() {
    if(global_started) {
        global_started = false;
    }
}

// event listeners for canvas
function addEventHandlers() {
    global_cavnas.on('mouse:down', function(options){ beginRectDraw(options) });
    global_cavnas.on('mouse:up', function(options){ finishRect(options) });
    global_cavnas.on('mouse:move', function(options){ drawRect(options) });
}

document.getElementById("obj-count").addEventListener("click", function(){
    console.log(global_cavnas.getObjects());
})

document.getElementById("obj-delete").addEventListener("click", function(){
    var allObjects = global_cavnas.getObjects();
    while(allObjects.length != 0){
        global_cavnas.remove(allObjects[0]);
    }
})

document.getElementById("obj-delete-selected").addEventListener("click", function(){
    global_cavnas.remove(global_cavnas.getActiveObject());
})