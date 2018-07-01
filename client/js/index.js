/**
 * # Method to calculate the top, left, width, height and angle of rotation of a rectangle from its coordinates
 * # Here we are assuming that the origin is at the top left corner contradictory to page coodinates.
 * # An object with four coordinates like x1,x2,x3,x4,y1,y2,y3,y4 needs to be passed as an argument 
 * @param {object} coords 
 */ 
var getDimensionsWithAngle = function(coords) {
    
    // check data type of argument passed
    if(typeof coords != 'object'){
        return;
    }
    // check if rectangle is at 0 degree
    if(coords.y1 == coords.y2) {
        // add top, left, width and height and angle properties into coords object and return
        coords.top = coords.y1;
        coords.left = coords.x1;
        coords.width = coords.x2 - coords.x1;
        coords.height = coords.y3 - coords.y2;
        coords.angle = 0;
        return coords;
    }
    // get the arctangent in degrees from given coordinates
    var arctangent = Math.floor(Math.atan2(coords.y2 - coords.y1, coords.x2 - coords.x1) * 180 / Math.PI); // at this stage, this arctangent should not be 0
    coords.angle = arctangent;

    // get the center point coordinates
    coords.cx = (coords.x1 + coords.x3) / 2;
    coords.cy = (coords.y1 + coords.y3) / 2;

    // calculate the width and height by using distance between two points formula
    coords.width = Math.sqrt(Math.pow(coords.x2 - coords.x1, 2) + Math.pow(coords.y2 - coords.y1, 2));
    coords.height = Math.sqrt(Math.pow(coords.x3 - coords.x2, 2) + Math.pow(coords.y3 - coords.y2, 2));

    // update the distance from top and left
    coords.top = coords.y1;
    coords.left = coords.x1;
    
    // return modified object
    return coords;
    
}

// get value from a query string (url path)
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

// method to convert value to integer
function castInt( value ) {
    if(typeof value == 'number' || typeof value == 'string'){
        if(isNaN(parseFloat(value))) {
            return null;
        }
        return parseFloat(value);
    }
    return null;
}

// returns canvas data in base64 format
function generateCanvasImage(canvas) {
    var imageOnly = canvas.toDataURL({format: 'png',multiplier: 4});
    return imageOnly;
}

// method to convert base64 image to blob
function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

// method to upload canvas generated image to google cloud
function getPublicUrl() {
    // return a promise
    return new Promise(function(resolve, reject){
      // convert canvas data to base64;
      var imgData = generateCanvasImage(global_canvas);
      // remove 'data:image/png;base64,' from the output
      var strDataURI = imgData.substr(22, imgData.length);
      // convert base64 data to a blob
      var blob = dataURLtoBlob(imgData);
      // create object url from blob
      var objurl = URL.createObjectURL(blob);
      // prepare the form data
      var formData = new FormData();
      formData.append("tag","editedImages");
      formData.append("empID",localStorage.empID);
      formData.append("filename",blob,'file.png');
      try {
        postRequest(baseURL+'/external/upload', null, formData, function(res){
          resolve(res.imageUrl);
        }, null, false, true, false, false, false, null, null)
      } catch(e) {
        reject(e)
      }
    });
  }

  /** Main functions ahead
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
 *  # User should be able to change the reference object's dimensions in both pixel and mm (Done)
 *  # A quick summary of analysis should be visible to user whenever required.
 *  # One click should not lead to a box creation
 *  # Retrieval of objects from database (Done)
 *  # Data verification
 *  # Disable object grouping
 *  # Show reference object value in pixel
 */

// GLOBAL VARIABLES
var global_canvas; // global variable which holds canvas object
var global_target_image;
var global_started = false;
var global_x = 0, global_y = 0;
var global_category_array = [];
var global_object_drawn = false;
var global_reference_object_identifier = null; // holds unique hexID for referenceObject
var global_object_id_array = []; // holds all obejcts hexID in array
var global_picture_url = null;

// initialise the canvas;
prepareCanvas();

function prepareCanvas() {
    // display the loader
    var loader = document.getElementById('full-page-loader');
    loader.style.display = 'block';
    // get base64 image data from URL, as we cannot read/manipulate the image which exists on some other domain
    console.log('Base URL: '+baseURL);
    getRequest(baseURL+"/getImageData", { imageUrl: getQueryString("image")}, function(imageData){
         // set the target image
        global_target_image = new Image();
        global_target_image.src = imageData.data; // base64 image data
        // as soon as the image is loaded, prepare the canvas
        global_target_image.onload = function() {
            global_canvas = new fabric.Canvas('my-canvas', {
                width: this.naturalWidth, // make canvas width equal to the image's original width
                height: this.naturalHeight, // make canvas height equal to the image's original height
                backgroundImage: this.src, // set image as canvas's background
                selection: false // disable grouping of objects
            });
            addEventHandlers();
            getObjectData();
        }
    });
}

/**
 * Functon to add a rectangle to a canvas
 * @param {object} properties 
 */

function addRect(properties) {
    var hexID = Math.floor(Math.random()*16777215).toString(16); // random object ID
    global_object_id_array.push(hexID);
    global_reference_object_identifier = global_object_id_array[0];
    // if stroke of rectangle is not given, default it to 100% green
    if(!properties.hasOwnProperty('stroke')) {
        properties.stroke = 'rgb(0,255,0)';
    }
    properties.id = hexID;
    properties.opacity = 1;
    properties.fill = null; // because we only want to show the borders
    properties.strokeWidth = 2;
    var rect = new fabric.Rect(properties);
    global_canvas.add(rect);
    global_canvas.setActiveObject(rect);
}

/**
 * Function to begin rectangle drawing
 * @param {object} options 
 */

function beginRectDraw(options) {
    global_object_drawn = false;
    if(options.target != null || options.target != undefined){
        global_object_drawn = true;
        return;
    }
    global_started = true;
    var mouse = global_canvas.getPointer();
    global_x = mouse.x;
    global_y = mouse.y;
    var properties = {
        top: 20,
        left: 20,
        width: 20,
        height: 20
    }
    addRect(properties);
}

/**
 * Function to draw rectangle on mousemove
 * @param {options} options 
 */

function drawRect(options){
    if(!global_started) {
        return false;
    }

    global_object_drawn = true;

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
    if(!global_object_drawn) {
        global_canvas.remove(global_canvas.getActiveObject());
        hideDeleteBtn();
        analyseObjects();
    }
    if(global_started) {
        global_started = false;
    }
}

// show delete button inside the selected object
function showDeleteBtn(options) {
    var deleteBtn = document.getElementsByClassName('delete-individual-obj-btn')[0];
    var selected = global_canvas.getActiveObject();
    if(selected.id == global_reference_object_identifier) {
        hideDeleteBtn();
    } else {
        deleteBtn.style.display = 'block';
        deleteBtn.style.top = selected.top + 60 + 'px';
        deleteBtn.style.left = selected.left + 5 + 'px';
    }
}

// hide the delete button from view
function hideDeleteBtn(options) {
    var deleteBtn = document.getElementsByClassName('delete-individual-obj-btn')[0];
    deleteBtn.style.display = 'none';
}

// method to refresh data when reference object is minified
function analyseOnReferenceObjectChange() {
    var activeObject = global_canvas.getActiveObject();
    var referenceObject = global_canvas.getObjects()[0];
    if(activeObject.id == referenceObject.id) {
        refreshRefObjectPixelDimension();
        analyseObjects();
    }
}

// method to refresh reference object dimension on header
function refreshRefObjectPixelDimension() {
    var activeObject = global_canvas.getObjects()[0];
    var refWidthInPx = document.getElementById('ref-width-in-px');
    var refHeightInPx = document.getElementById('ref-height-in-px')
    refWidthInPx.innerHTML = (getDistance(castInt(activeObject['aCoords']['tl']['x']), castInt(activeObject['aCoords']['tl']['y']), castInt(activeObject['aCoords']['tr']['x']), castInt(activeObject['aCoords']['tr']['y']))).toFixed(0);
    refHeightInPx.innerHTML = (getDistance(castInt(activeObject['aCoords']['tr']['x']), castInt(activeObject['aCoords']['tr']['y']), castInt(activeObject['aCoords']['br']['x']), castInt(activeObject['aCoords']['br']['y']))).toFixed(0);
    analyseObjects();
}

// method to categorize the objects
function analyseObjects() {
    var objCount = document.getElementById('object-count');
    var local_category_array = [];
    var totalSum = 0;
    // create a copy of global_category_array
    global_category_array.forEach(function(aCategory){
        local_category_array.push(Object.assign({}, aCategory));
    });
    var totalObjects = global_canvas.getObjects().length;
    objCount.innerHTML = totalObjects;
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
        objWidth = (getDistance(castInt(anObject['aCoords']['tl']['x']), castInt(anObject['aCoords']['tl']['y']), castInt(anObject['aCoords']['tr']['x']), castInt(anObject['aCoords']['tr']['y']))) * castInt(getPixelValueInMM());
        objHeight = (getDistance(castInt(anObject['aCoords']['tr']['x']), castInt(anObject['aCoords']['tr']['y']), castInt(anObject['aCoords']['br']['x']), castInt(anObject['aCoords']['br']['y']))) * castInt(getPixelValueInMM());
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
                    local_category_array[j]['sum'] += objectSide; 
                } else {
                    local_category_array[j]['sum'] = 0;
                }
                // set flag to true
                found = true;
                // break the loop
                break;
            }
        }
        // if object did not fall in any category criteria above
        if(!found){
            // add it to the super category
            totalSum += objectSide;
            local_category_array[4]['count'] += 1;
            if(local_category_array[4].hasOwnProperty('sum')){
                local_category_array[4]['sum'] += objectSide; 
            } else {
                local_category_array[4]['sum'] = 0;
            }
        }
    }
    // update the countInPercentage and weightInPercentage for category array
    local_category_array.forEach(function(aCategory, aCategoryIndex){
        // this is the percentage
        aCategory['countInPercentage'] = ( parseFloat(aCategory['count']*100 / (parseInt(totalObjects) - 1)) )
        // does the value contains floating point numbers?
        if(Math.round(aCategory['countInPercentage']) !== aCategory['countInPercentage']){
            // fix the number of digits after decimal to 2
            aCategory['countInPercentage'] = (aCategory['countInPercentage']).toFixed(2);
        }
        // if got some weird value like NaN, undefined, infinity or null, make it 0
        if(isNaN(aCategory['countInPercentage'])){
            aCategory['countInPercentage'] = 0;
        }
        // this is the weight in percentage
        aCategory['sumInPercentage'] = ( parseFloat(aCategory['sum']*100 / parseFloat(totalSum)) );
        // does the value contains floating point numbers?
        if(Math.round(aCategory['sumInPercentage']) !== aCategory['sumInPercentage']){
            // fix the number of digits after decimal to 2
            aCategory['sumInPercentage'] = (aCategory['sumInPercentage']).toFixed(2);
        }
        // if got some weird value like NaN, null, undefined or infinity, make it 0
        if(isNaN(aCategory['sumInPercentage'])){
            aCategory['sumInPercentage'] = 0;
        }
        // render the data
        $(".category-value").eq(aCategoryIndex).html(
            '<table> <tr><th>Total</th><th>Count %</th><th>Weight %</th></tr> <tr><td>'+aCategory['count']+'</td><td>'+aCategory['countInPercentage']+'</td><td>'+aCategory['sumInPercentage']+'</td></tr></table>'
        )
    });
}

// method to retrive object data
function getObjectData() {
    // call fetch api to get object data
    getRequest(baseURL+"/fetch/processed-image-object", {
        refID: getQueryString('refID'),
        refTable: getQueryString('refTable')
    }, function(data){
        var objectPosition, objectSide;
        // loop through the category array and preaprare the category object
        data.helper.categoryArray.forEach(function(aCategory, aCategoryIndex){
            global_category_array.push({
                alias: aCategory['alias'],
                categoryID: aCategory['categoryID'],
                count: aCategory['count'],
                minSize: aCategory['minSize'],
                maxSize: aCategory['maxSize'],
                countInPercentage: 0,
                sumInPercentage: 0,
                sum: 0
            });
        });
        var pixelValueInMM = data.helper.pixelValueInMM || 0.885; //if pixelValueInMM is null use 0.885 as default
        // create a referenceObject
        // if reference object is not detected by automated algo function, place the reference object in bottom right corner
        if(data.helper.referenceObject == null){
            var refDimensions = {};
            refDimensions.width = 196;
            refDimensions.height = 196;
            refDimensions.top = global_canvas.getHeight() - 196;
            refDimensions.left = global_canvas.getWidth() - 196;
            refDimensions.stroke = 'orange';
            var refWidthInMM = refDimensions.width * pixelValueInMM;
            var refHeightInMM = refDimensions.height * pixelValueInMM;
            // if the value has digits after decimal, fixed the number of digits after decimal to 3
            if(Math.round(refWidthInMM) != refWidthInMM) {
                refWidthInMM = refWidthInMM.toFixed(3);
            }
            if(Math.round(refHeightInMM) != refHeightInMM) {
                refHeightInMM = refHeightInMM.toFixed(3);
            }
            document.getElementById('ref-width').value = refWidthInMM;
            document.getElementById('ref-height').value = refHeightInMM;
            addRect(refDimensions);
        } else {
            // reference object got detected in automated algo function, place it where it should be
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
            refDimensions.stroke = 'orange';
            var refWidthInMM = refDimensions.width * pixelValueInMM;
            var refHeightInMM = refDimensions.height * pixelValueInMM;
            // if the value has digits after decimal, fixed the number of digits after decimal to 3
            if(Math.round(refWidthInMM) != refWidthInMM) {
                refWidthInMM = refWidthInMM.toFixed(3);
            }
            if(Math.round(refHeightInMM) != refHeightInMM) {
                refHeightInMM = refHeightInMM.toFixed(3);
            }
            document.getElementById('ref-width').value = refWidthInMM;
            document.getElementById('ref-height').value = refHeightInMM;
            addRect(refDimensions);
        }
        refreshRefObjectPixelDimension();
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
            addRect(dimensions);
        });
        // after successfull render of objects, categorise them
        var loader = document.getElementById('full-page-loader');
        loader.style.display = 'none';
        analyseObjects();
    });
}

//method to calculate pixel value in mm
function getPixelValueInMM() {
    var refObject = global_canvas.getObjects()[0]['aCoords'];
    // get reference object height and width in pixel
    var refObjWidthInPx = (getDistance(refObject['tl']['x'], refObject['tl']['y'], refObject['tr']['x'], refObject['tr']['y']));
    var refObjHeightInPx = (getDistance(refObject['tr']['x'], refObject['tr']['y'], refObject['br']['x'], refObject['br']['y']));
    // get reference object height and width in mm (this is given by user or automated algorithm)
    var refObjWidthInMM = document.getElementById('ref-width').value;
    var refObjHeightInMM = document.getElementById('ref-height').value;
    // calculate one pixel translates to how many MM in real life
    var pixelValueInMM = (((parseFloat(refObjWidthInMM) + parseFloat(refObjHeightInMM)) / 2) / ((parseFloat(refObjWidthInPx) + parseFloat(refObjHeightInPx)) / 2 )).toFixed(3);
    return pixelValueInMM;
}

// method to save data to a server
function saveObjectData(btn, notifyUser) {
    btn.innerHTML = 'Saving...';
    btn.setAttribute('disabled', true);
    btn.setAttribute('class', 'theme-btn theme-btn--small-disabled align-right');
    global_canvas.renderAll();
    var firstObject = global_canvas.getObjects()[1];
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
        // store reference object's coordinates
        if(i == 0){
            anObject = global_canvas.getObjects()[i]['aCoords'];
            referenceObject.push(anObject.tl.x, anObject.tl.y, anObject.tr.x, anObject.tr.y, anObject.br.x, anObject.br.y, anObject.bl.x, anObject.bl.y);
            continue; // no further execution for this iteration (skip this iteration)
        }
        // prepare object level data
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
    data.notifyUser = notifyUser;
    data.empID = 'EI201700050';
    data.refID = getQueryString('refID');
    data.refTable = getQueryString('refTable');
    data.predictedScale = getPixelValueInMM();
    data.blackBackground = null;
    data.referenceObject = referenceObject;
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
    //send the data to a server
    // first check if image is already uploaded ?
    if(global_picture_url == null) {
        getPublicUrl().then(function(url){
            data.pictureUrl = url;
            global_picture_url = url;
            // postRequestWithExceptionHandling(baseURL+"/insert/image-object-data", null, data, function(res){
            //     console.log(res);
            //     btn.innerHTML = 'Save Data';
            //     btn.setAttribute('disabled', false);
            //     btn.setAttribute('class', 'theme-btn theme-btn--highlighted theme-btn--small align-right');
            // }, function(){
            //     alert('some error has occurred, please retry after sometime');
            //     btn.innerHTML = 'Save Data';
            //     btn.setAttribute('disabled', false);
            //     btn.setAttribute('class', 'theme-btn theme-btn--highlighted theme-btn--small align-right');
            // });
        });
    } else {
        // postRequestWithExceptionHandling(baseURL+"/insert/image-object-data", null, data, function(res){
        //     console.log(res);
        //     btn.innerHTML = 'Save Data';
        //     btn.setAttribute('disabled', false);
        //     btn.setAttribute('class', 'theme-btn theme-btn--highlighted theme-btn--small align-right');
        // }, function(){
        //     alert('some error has occurred, please retry after sometime');
        //     btn.innerHTML = 'Save Data';
        //     btn.setAttribute('disabled', false);
        //     btn.setAttribute('class', 'theme-btn theme-btn--highlighted theme-btn--small align-right');
        // });
    }
}

// event listeners for canvas
function addEventHandlers() {
    global_canvas.on('mouse:down', function(options){ beginRectDraw(options) });
    global_canvas.on('mouse:up', function(options){ finishRect(options) });
    global_canvas.on('mouse:move', function(options){ drawRect(options) });
    global_canvas.on('object:selected', function(options){ showDeleteBtn(options) } );
    global_canvas.on('object:modified', function(options){ showDeleteBtn(options); analyseOnReferenceObjectChange(); } );
    global_canvas.on('object:moving', function(options){ showDeleteBtn(options) } );
    // global_canvas.on('object:scaling', function(options){ showDeleteBtn(options)} );
    // global_canvas.on('object:rotated', function(options){ showDeleteBtn(options)} );
}

// event listener to delete all objects on the screen except reference object
document.getElementById("obj-delete").addEventListener("click", function(){
    var allObjects = global_canvas.getObjects();
    while(allObjects.length != 1){
        global_canvas.remove(allObjects[1]);
    }
    hideDeleteBtn();
    analyseObjects();
})

//event listener to delete a selected object
document.getElementsByClassName("delete-individual-obj-btn")[0].addEventListener("click", function(){
    global_canvas.remove(global_canvas.getActiveObject());
    hideDeleteBtn();
    analyseObjects();
});

// event listener to update object data when reference object width in mm is changed
document.getElementById('ref-width').addEventListener('keyup', function(){
    // user is trying to enter falsy values ? make it 0, he cannot fool us.
    if(this.value == '' || this.value == null) {
        this.value = 0;
    }
    analyseObjects();
});

// event listener to update object data when reference object height in mm is changed
document.getElementById('ref-height').addEventListener('keyup', function(){
    // user is trying to enter falsy values ? make it 0, he cannot fool us.
    if(this.value == '' || this.value == null) {
        this.value = 0;
    }
    analyseObjects();    
});

// method to save data to the database
document.getElementById("serialize-data").addEventListener("click", function(){
    var checkboxVal = document.getElementById('send-whatsapp');
    var notifyUser = 0;
    if(checkboxVal.checked) {
        notifyUser = 1;
    }
    return;
    saveObjectData(this, notifyUser);
});

// method to refersh data
document.getElementById("refresh-btn").addEventListener("click", function(){
    //this.style.transform = 'rotate(60deg)';
    analyseObjects();
});

// event listener for details toggle
document.getElementById('show-details-btn').addEventListener("click", function(){
    var detailsWrapper = document.getElementsByClassName('object-wise-data-wrapper')[0];
    // details bar is visible ?
    if(detailsWrapper.style.display == 'block') {
        // hide details bar
        this.innerHTML = 'Show Details';
        detailsWrapper.style.display = 'none';
    } else {
        // show details bar
        detailsWrapper.style.display = 'block';
        this.innerHTML = 'Hide Details';
    }
});