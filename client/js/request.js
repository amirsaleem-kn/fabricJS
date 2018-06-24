/**
 * @description this file contains wrapper for making ajax request in axios with 401 authentication
 * Other function needs to call the request method with object as a parameter
*/

//const baseURL = baseURL;
var authTokenRequest;

/**
 * @description axios instance for ajax requests
*/

var client = axios.create({
  baseURL: 'http://kisan-network-api-test.appspot.com',
  headers: {
        appID: 8,
        version: "1.1.0",
        empID: 'EI201700050',
        token: localStorage.getItem('accessToken')
    }
});

/**
 * @description this method calls a requestNewToken method to issue a new toke to the client
*/

function getAuthToken() {
  if (!authTokenRequest) {
    authTokenRequest = requestNewToken();
    authTokenRequest.then(resetAuthTokenRequest, resetAuthTokenRequest);
  }
  return authTokenRequest;
}

/**
 * @description this method requests the server to issue a new token, the server response is updated in local storage accessToken
*/

function requestNewToken() {
  var newToken = request({
    method: "post",
    url: '/sign-in',
    data: qs.stringify({"userName":localStorage.getItem('userName'),"password":localStorage.getItem('password')})
  }).then((res)=>{
    // on successfull response of new token, update the token in local storage
    if(res.status == "success"){
      localStorage.setItem('accessToken',res.data.accessToken);
      //if featureArray is present in response object, update the featureArray in local storage
      if(res.data.features){
        localStorage.setItem('featureArray',JSON.stringify(res.data.features));
      }
    } else {
      window.location = "/logout";
    }
  });
  return newToken;
}

function resetAuthTokenRequest() {
  authTokenRequest = null;
}

/**
* @description if any of the API gets 401 status code, this method calls getAuthToken method to renew accessToken
* updates the error configuration and retries all failed requests again
*/

client.interceptors.response.use(function(res){
  return res
}, function(err) {
  var errorMessage = err.toString();
  const error = err.response;
  // in case of 502 error redirect to maintainance page.
  if(err.request.status === 502){
     window.location = "/maintainance";
  }
  // if error is 401
  if (error.status===401 && error.config && !error.config.__isRetryRequest) {
    // request for a new token

    return getAuthToken().then(response => {
      // update the error config with new token
      error.config.__isRetryRequest = true;
      error.config.headers.token= localStorage.getItem("accessToken");
      return client(error.config);
    });
  }
  else if(error.status==403){
      window.location = "/logout";
  }
});

/**
* @description wrapper for making ajax requests
* @param {object} object with method,url,data etc.
*/

const request = function(options) {
  const onSuccess = function(response) {
    return response.data;
  }
  const onError = function(error) {
    if (error.response) {
      console.log('error response code is '+ error.code);
      console.log(error.response);
    } else {
      console.log('error response code is '+ error.code);
      console.log(error.message);
    }

    return Promise.reject(error.response || error.message);
  }

  return client(options)
            .then(onSuccess)
            .catch(onError);
            options
}
