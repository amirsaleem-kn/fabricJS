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
      var imgData = generateCanvasImage(canvas);
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
      // resolve the promise
      resolve(formData);
    });
  }