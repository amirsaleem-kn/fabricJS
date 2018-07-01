var queue = [];
var lock = "0";
var pendingRequests = [];
var pendingUrl = [];
var testFunction= null;

/**
 * Wrapper for ajax post request
 * @param  {String} url             request url
 * @param  {object} headers         request headers
 * @param  {object} data            data to be sent
 * @param  {function} successCallback function to be executed on request success
 * @param  {function} failCallback    function to be executed on request fail
 * @param  {boolean} processData     set this to true when passing data as an object
 * @param  {boolean} async           set this to true when making synchronous request
 * @param  {object} scopeTest       reference object if any to be accessed in the callback
 */
var postRequest = function(url,headers,data,successCallback,failCallback,processData,async,scopeTest, contentType, cache, beforeSend, complete){
    var argumentsArray = Array.from(arguments);
    var fun = arguments.callee;
    var insert = true;
    for(var i=0; i < queue.length; i++ ){
         if(queue[i]["url"]==(url+JSON.stringify(data))){
            insert = false;

            console.info("clash: "+url+JSON.stringify(data));
            debugger;
            return
        }
    }
    if(insert){
        queue.push({
            url: url+JSON.stringify(data),
            a: argumentsArray,
            b: fun
        });
    }
    testFunction = successCallback;
    var newCallback = (function(url) {
        var cached_function = testFunction;
        return function() {
            for(var i=0; i< queue.length; i++){
                if(queue[i]["url"]==(url+JSON.stringify(data))){
                    queue.splice(i,1);
                }
            }
            var result = cached_function.apply(this, arguments); // use .apply() to call it

            // more of your code

            return result;
        };
    })(url);

    var testRequest = $.ajax({
            method: "POST",
            url: url,
            contentType : contentType,
            cache : cache,
            headers: {
                //Content-Type : "application/x-www-form-urlencoded",
                appID: "8",
                version: "3",
                empID: localStorage.empID,
                token: localStorage.accessToken
            },
            data: data,
            scopeTest: scopeTest,
            processData: processData,
            beforeSend : beforeSend,
            complete : complete,
            success: newCallback,
            error: onRequestFailure,
            async: async
        });
      pendingRequests.push(testRequest);
      pendingUrl.push(url)
};

var postRequestWithExceptionHandling = function(url,headers,data,successCallback,failCallback,processData,async,scopeTest, contentType, cache, beforeSend, complete){
    var argumentsArray = Array.from(arguments);
    var fun = arguments.callee;
    var insert = true;
    for(var i=0; i < queue.length; i++ ){
         if(queue[i]["url"]==(url+JSON.stringify(data))){
            insert = false;

            console.info("clash: "+url+JSON.stringify(data));
            debugger;
            return
        }
    }
    if(insert){
        queue.push({
            url: url+JSON.stringify(data),
            a: argumentsArray,
            b: fun
        });
    }
    testFunction = successCallback;
    var newCallback = (function(url) {
        var cached_function = testFunction;
        return function() {
            for(var i=0; i< queue.length; i++){
                if(queue[i]["url"]==(url+JSON.stringify(data))){
                    queue.splice(i,1);
                }
            }
            var result = cached_function.apply(this, arguments); // use .apply() to call it

            // more of your code

            return result;
        };
    })(url);

    var testRequest = $.ajax({
            method: "POST",
            url: url,
            contentType : contentType,
            cache : cache,
            headers: {
                //Content-Type : "application/x-www-form-urlencoded",
                appID: "8",
                version: "3",
                empID: localStorage.empID,
                token: localStorage.accessToken
            },
            data: data,
            scopeTest: scopeTest,
            processData: processData,
            beforeSend : beforeSend,
            complete : complete,
            success: newCallback,
            error: function(res){
                console.log('OOPS FAILED');
                if(res.status===401 || res.status==='401'){
                    if(lock==="0"){
                        lock = "1";
                        pendingRequests.forEach(function(anItem){
                            anItem.abort();
                        })
                        pendingRequests = [];
                        pendingUrl =[];
                        postRequest("/sign-in", null, {userName: localStorage.userName, password: localStorage.password}, function(res){
                        lock = "0"
                        if(res.status=="success"){
                            localStorage.accessToken = res.data.accessToken;
                            if(res.data.features)
                                localStorage.featureArray = JSON.stringify(res.data.features);
                            var emptyingQueue = queue;
                            emptyingQueue.reverse();
                            queue= [];
                            for(var i= emptyingQueue.length-1; i>-1; i--){
                                var temp = emptyingQueue[i];
                                emptyingQueue.pop();
                                temp["b"].apply(this, temp["a"]);
                            }
                        }
                        else{
                            window.location = "/logout"
                            }
                        }, function(res){
                            lock = "0";
                                window.location = "/logout"
                        },true,null)
                    }
                }
                else if(res.status==403){
                    window.location = "/logout";
                } else {
                    var emptyingQueue = queue;
                    emptyingQueue.reverse();
                    queue= [];
                    for(var i= emptyingQueue.length-1; i>-1; i--){
                        var temp = emptyingQueue[i];
                        emptyingQueue.pop();
                    }
                    failCallback();
                }
            },
            async: async
        });
      pendingRequests.push(testRequest);
      pendingUrl.push(url)
};

/**
 * Wrapper for ajax get request
 * @param  {String}   url                  request url
 * @param  {object}   parameters           request parameters
 * @param  {Function} callback             function to be invoked on request success
 * @param  {object}   additionalParameters reference object if any to be accessed in the callback
 */
var getRequest = function(url,parameters,callback, beforeSend, complete){
    var argumentsArray = Array.from(arguments);
    var fun = arguments.callee;
    var insert = true;
    for(var i=0; i < queue.length; i++ ){
        if(queue[i]["url"]==(url+JSON.stringify(parameters))){
            insert = false;
            console.info("clash: "+url)
            //queue.splice(i,1);
            return
        }
    }
    if(insert){
       var obj = {
         url: url + JSON.stringify(parameters),
         a: argumentsArray,
         b: fun
       }
       queue.push(obj);
    }
    testFunction = callback;
    var newCallback = (function(url) {
            var cached_function = testFunction;
            return function() {
                for(var i=0; i< queue.length; i++){
                    if(queue[i]["url"]== (url+JSON.stringify(parameters))){
                        //console.log("success callback. Removing form the queue")
                        //console.log(queue[i]["url"])
                        queue.splice(i,1);
                    }
                }
                var result = cached_function.apply(this, arguments); // use .apply() to call it

                // more of your code

                return result;
            };
        })(url);

      var testRequest =  $.ajax({
                            method: "GET",
                            url: url,
                            data: parameters,
                            headers: {
                                appID: "8",
                                version: "3",
                                empID: localStorage.empID,
                                token: localStorage.accessToken
                            },
                            beforeSend: beforeSend,
                            complete: complete,
                            success: newCallback,
                            error: onRequestFailure
                        });
      pendingRequests.push(testRequest);
      pendingUrl.push(url)
    }

/**
 * function be called on request failure
 * @param  {object} res ajax response object
 */
function onRequestFailure(res){
    console.log('OOPS FAILED');
    if(res.status===401 || res.status==='401'){
        if(lock==="0"){
            lock = "1";
            pendingRequests.forEach(function(anItem){
                anItem.abort();
            })
            pendingRequests = [];
            pendingUrl =[];
            postRequest("/sign-in", null, {userName: localStorage.userName, password: localStorage.password}, function(res){
            lock = "0"
            if(res.status=="success"){
                localStorage.accessToken = res.data.accessToken;
                if(res.data.features)
                    localStorage.featureArray = JSON.stringify(res.data.features);
                //console.log("Inside accessToken referesh.");
                var emptyingQueue = queue;
                emptyingQueue.reverse();
                queue= [];
                for(var i= emptyingQueue.length-1; i>-1; i--){
                    var temp = emptyingQueue[i];
                    emptyingQueue.pop();
                    temp["b"].apply(this, temp["a"]);
                }
            }
            else{
                window.location = "/logout"
                }
            }, function(res){
                lock = "0";
                    window.location = "/logout"
            },true,null)
        }
    }
    else if(res.status==403){
        window.location = "/logout";
    }
}

function printObjectArray(anArray){
    for(var i=0; i< anArray.length; i++){
       console.log(anArray[i]["a"])
    }
}