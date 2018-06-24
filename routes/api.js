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

    app.post('/insert/image-object-data', function(req, res){
        // change string null to actual null
        for(var key in req.body){
            if(req.body[key] == 'null') {
                req.body[key] = null;
            }
        }
        var token = req.get('token') || req.body.token;
        var imageWidth = castInt(req.body.imageWidth) || null;
        var imageHeight = castInt(req.body.imageHeight) || null;
        var noOfObjects = req.body.numberOfObjects || null;
        var empID = req.body.empID || null;
        var algoCode = req.body.algoCode || null;
        var refID = castInt(req.body.refID) || null;
        var refTable = req.body.refTable || null;
        var predictedScale = req.body.predictedScale || null;
        var blackBackground = req.body.blackBackground || null;
        var referenceObject = req.body.referenceObject || null;
        var timestamp = Date.now();
        var base64Image = req.body.imageJpg || null;
        var code = req.body.code || null;
        var objTopLeftX = req.body.topLeftX || null;
        var objTopRightX = req.body.topRightX || null;
        var objBottomRightX = req.body.bottomRightX || null;
        var objBottomLeftX = req.body.bottomLeftX || null;
        var objTopLeftY = req.body.topLeftY || null;
        var objTopRightY = req.body.topRightY || null;
        var objBottomRightY = req.body.bottomRightY || null;
        var objBottomLeftY = req.body.bottomLeftY || null;
        var pictureUrl = req.body.pictureUrl || null;
        var typeID = req.body.typeID || null;
        var lat = req.body.lat || null;
        var lon = req.body.lon || null;
        var appID = req.body.appID || null;
        var version = req.body.version || null;
        var originalImage=req.body.originalImage||null;
        var algoVersion = req.body.algoVersion || null;
        var mapID = req.body.mapID || version;
        var areaCode = req.body.aoc||null;
        var lotNo = req.body.lotNo || null;
        var qID = req.body.qID || null;
        var i,j;
        var method = req.body.method || 'automated';
        var notifyUser = req.body.notifyUser||null;

        cprint(req.body.aoc+' area code')
        // get the token from config
        var existingToken = config['encPass'];

        // send 422 (missing parameters)
        if(!refID || !refTable || !code || !token || !empID || !typeID){
            settings.unprocessableEntity(res);
            return;
        }

        // initialize a helper array
        var helperArray = [];

        // check if blackBackground is present
        if(blackBackground){
            for(i = 0; i < blackBackground.length;){
                helperArray.push(castInt(blackBackground[i]) + ' ' + castInt(blackBackground[i+1]));
                i += 2;
            }
            blackBackground = 'LINESTRING('+helperArray+')';
        }

        // empty the helperArray
        helperArray = [];
        noReference = false;

        // check if referenceObject is present
        if(referenceObject){
            for(i = 0; i < referenceObject.length;){
                if(castInt(referenceObject[i]) == null){
                    noReference = true;
                    break;
                }
                helperArray.push(castInt(referenceObject[i]) + ' ' + castInt(referenceObject[i+1]));
                i += 2;
            }
            referenceObject = 'LINESTRING('+helperArray+')';
        }

        if(noReference) {
            referenceObject = null;
        }

        connectionPool.getConnection(function(err, connection){
            if(err) {
                cprint(err, 1);
                settings.serviceError(res, err.toString());
                return;
            }
            // begin the transaction
            connection.beginTransaction(function(err){
                if(err) {
                    cprint(err, 1);
                    settings.serviceError(res, err.toString());
                    return;
                }
                connection.query("UPDATE ProcessedImageData set IsActive = ? WHERE ReferenceTable = ? AND ReferenceID = ?", [0, refTable, refID], function(err, updateRows){
                    cprint(this.sql);
                    if(err) {
                        cprint(err, 1);
                        connection.destroy();
                        settings.serviceError(res, err.toString());
                        return;
                    }
                    var imageDataInsertQuery = "INSERT INTO ProcessedImageData(ReferenceID, ReferenceTable, CreatedAt, ImageHeight, ImageWidth, BlackClothPosition, ReferenceObjectPosition, PixelValueInMM, NoOfObjects, Code, PictureUrl, EmpID, ReferenceObjectPositionCopy, MapID, AlgoVersion, Method, IsActive) VALUES(?, ?, ?, ?, ?, LinestringFromText(?), LinestringFromText(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    var imageDataQueryArray = [refID, refTable, timestamp, imageHeight, imageWidth, blackBackground, referenceObject, predictedScale, noOfObjects, code, pictureUrl, empID, referenceObject, mapID, algoVersion, method, 1];
                    // insert image level data into ProcessedImageData table
                    connection.query(imageDataInsertQuery, imageDataQueryArray, function(err, result){
                        cprint(this.sql);
                        if(err) {
                            return connection.rollback(function(){
                                cprint(err, 1);
                                connection.destroy();
                                settings.serviceError(res, err.toString());
                                return;
                            });
                        }
                        // get the id of record inserted
                        var imageID = result.insertId;
                        // check if any object got detected in the processing of image
                        if(noOfObjects == null){
                            connection.commit(function(err){
                                if(err) {
                                    return connection.rollback(function(){
                                        cprint(err, 1);
                                        connection.destroy();
                                        settings.serviceError(res, err.toString());
                                        return;
                                    });
                                }
                                connection.destroy();
                                res.json({
                                    statusCode: '200',
                                    status: 'success',
                                    message: 'records inserted successfully'
                                });
                                return;
                            })
                        } else {
                            noOfObjects = castInt(noOfObjects);
                            // get category data from ProcessedObjectCategoryMaster table
                            connection.query("SELECT * FROM ProcessedObjectCategoryMaster Where TypeID = ?", [typeID], function(err, categoryRows){
                                cprint(this.sql);
                                if(err) {
                                    return connection.rollback(function(){
                                        cprint(err, 1);
                                        connection.destroy();
                                        settings.serviceError(res, err.toString());
                                        return;
                                    });
                                }
                                var categoryArray = [];
                                if(categoryRows.length > 0) {
                                    // loop through the category array, create an object for each category to categorise the objects later
                                    categoryRows.forEach(function(category, index){
                                        categoryArray.push(
                                            {
                                                categoryID: category['CategoryID'],
                                                alias: category['Alias'],
                                                minSize: category['MinSize'],
                                                maxSize: category['MaxSize'],
                                                count: 0
                                            }
                                        );
                                    });
                                }

                                // insert image object

                                var iterator = 0;
                                var objectHeight, objectWidth, objPos, objectSide = null;

                                insertImageObject();

                                function insertImageObject() {
                                    var employee = null;
                                    if(iterator == noOfObjects) {
                                        iterator = 0;
                                        mappingInsertion();
                                        function mappingInsertion() {
                                            if(iterator == categoryArray.length){
                                                connection.commit(function(err){
                                                    if(err) {
                                                        return connection.rollback(function(){
                                                            cprint(err, 1);
                                                            connection.destroy();
                                                            settings.serviceError(res, err.toString());
                                                            return;
                                                        });
                                                    }
                                                    connection.destroy();
                                                    res.json({
                                                        statusCode: '200',
                                                        status: 'success',
                                                        message: 'records inserted successfully'
                                                    });
                                                    return;
                                                })
                                            } else {
                                                connection.query("INSERT INTO ProcessedObjectCategoryMapping(CategoryID, Count, ImageID) VALUES(?, ?, ?)", [categoryArray[iterator]['categoryID'], categoryArray[iterator]['count'], imageID], function(err, result){
                                                    cprint(this.sql);
                                                    if(err) {
                                                        return connection.rollback(function(){
                                                            cprint(err, 1);
                                                            connection.destroy();
                                                            settings.serviceError(res, err.toString());
                                                            return;
                                                        });
                                                    }
                                                    iterator++;
                                                    // recursive call to the function (using recursion because for loop will create a)
                                                    mappingInsertion();
                                                });
                                            }
                                        }
                                    } else {
                                        // ##### insert object data into ImageObject table #####

                                        // if any of the coordinate is null, its an invalid GIS format, don't insert

                                        if(objTopLeftX == null || objTopLeftY == null || objTopRightX == null || objTopRightY == null || objBottomRightX == null || objBottomRightY == null || objBottomLeftX == null || objBottomLeftY == null){
                                            connection.destroy();
                                            res.json({
                                                statusCode: '200',
                                                status: 'success',
                                                message: 'records inserted successfully'
                                            });
                                            return;
                                        }

                                        // coordinates of an object
                                        var tlXY = castInt(objTopLeftX[iterator]) + ' ' + castInt(objTopLeftY[iterator]); // TOP LEFT (X,Y)
                                        var trXY = castInt(objTopRightX[iterator]) + ' ' + castInt(objTopRightY[iterator]); // TOP RIGHT (X,Y)
                                        var brXY = castInt(objBottomRightX[iterator]) + ' ' + castInt(objBottomRightY[iterator]); // BOTTOM RIGHT (X,Y)
                                        var blXY = castInt(objBottomLeftX[iterator]) + ' ' + castInt(objBottomLeftY[iterator]); // BOTTOM LEFT (X,Y)


                                        objectWidth = getDistance(castInt(objTopLeftX[iterator]), castInt(objTopLeftY[iterator]), castInt(objTopRightX[iterator]), castInt(objTopRightY[iterator])) * castInt(predictedScale);
                                        objectHeight = getDistance(castInt(objTopRightX[iterator]), castInt(objTopRightY[iterator]), castInt(objBottomRightX[iterator]), castInt(objBottomRightY[iterator])) * castInt(predictedScale);
                                        objectHeight > objectWidth ? objectSide = objectWidth : objectSide = objectHeight;

                                        objPos = 'LINESTRING('+tlXY+', '+trXY+', '+brXY+', '+blXY+')';

                                        // get the category of the object

                                        var found = false;
                                        var nullColumnIndex = 0;
                                        var categoryID = null;
                                        for(i = 0; i < categoryArray.length; i++) {
                                            if(categoryArray[i]['maxSize'] == null){
                                                nullColumnIndex = i;
                                            }
                                            if((objectSide >= categoryArray[i]['minSize'] && objectSide < categoryArray[i]['maxSize']) && objectSide != null ){
                                                found = true;
                                                categoryArray[i]['count'] += 1;
                                                categoryID = categoryArray[i]['categoryID'];
                                                break;
                                            }
                                        }

                                        if(!found && objectSide != null){
                                            cprint('----------------')
                                            cprint(nullColumnIndex);
                                            cprint(categoryArray)
                                            cprint('----------------')
                                            categoryArray[nullColumnIndex]['count'] += 1;
                                            categoryID = categoryArray[nullColumnIndex]['categoryID'];
                                        }

                                        connection.query('INSERT INTO ProcessedImageObject(ImageID, ObjectHeight, ObjectWidth, ObjectPosition, CategoryID, ObjectPositionCopy) VALUES(?, ?, ?, LinestringFromText(?), ?, ?)', [imageID, objectHeight, objectWidth, objPos, categoryID, objPos], function(err, result){
                                            cprint(this.sql);
                                            if(err) {
                                                return connection.rollback(function(){
                                                    cprint(err, 1);
                                                    connection.destroy();
                                                    settings.serviceError(res, err.toString());
                                                    return;
                                                });
                                            }
                                            iterator++;
                                            // recursive call to the function (using recursion because for loop will create a)
                                            insertImageObject();
                                        });

                                    }
                                }

                            });
                        }
                    });
                });
            });
        });
    });

    app.get("/fetch/processed-image-object", function(req, res){
        var refID = req.query.refID || null;
        var refTable = req.query.refTable || null;
        var typeID = req.query.typeID || 'CT021' // using CT021 as default for now as currently we have CT021 data in the table, the client may not pass the typeID
 
        if(!refID || !refTable) {
            settings.unprocessableEntity(res);
            return;
        }
 
        var categoryArray = [];
 
        connectionPool.getConnection(function(err, connection){
            if(err) {
                cprint(err, 1);
                settings.serviceError(res, err.toString());
                return;
            }
            connection.query("SELECT * FROM ProcessedObjectCategoryMaster Where TypeID = ?", [typeID], function(err, categoryRows){
                cprint(this.sql);
                if(categoryRows.length > 0) {
                 // loop through the category array, create an object for each category to categorise the objects later
                 categoryRows.forEach(function(category, index){
                     categoryArray.push(
                             {
                                 categoryID: category['CategoryID'],
                                 alias: category['Alias'],
                                 minSize: category['MinSize'],
                                 maxSize: category['MaxSize'],
                                 count: 0
                             }
                         );
                     });
                 }
                 connection.query("SELECT ImageID, ReferenceObjectPosition, PixelValueInMM, NoOfObjects FROM ProcessedImageData WHERE ReferenceID = ? AND ReferenceTable  = ? AND IsActive = ?", [refID, refTable, '1'], function(err, masterRows){
                     cprint(this.sql);
                     if(err) {
                         cprint(err, 1);
                         connection.destroy();
                         settings.serviceError(res, err.toString());
                         return;
                     }
                     if(masterRows.length == 0) {
                         connection.destroy();
                         res.json({
                              helper: {
                                  imageID: null,
                                  referenceObject: null,
                                  pixelValueInMM: null,
                                  numberOfObjects: 0,
                                  categoryArray: categoryArray
                              },
                             data: [],
                             status: 'success',
                             message: 'records fetched successfully'
                         });
                         return;
                     }
                     var imageID = masterRows[masterRows.length - 1]['ImageID'];
                     var referenceObject = masterRows[masterRows.length - 1]['ReferenceObjectPosition'];
                     var pixelValueInMM = masterRows[masterRows.length - 1]['PixelValueInMM'];
                     var numberOfObjects = masterRows[masterRows.length - 1]['NoOfObjects'];
                     connection.query("SELECT * FROM ProcessedImageObject WHERE ImageID = ?", [imageID], function(err, objectRows){
                          connection.destroy();
                          cprint(this.sql);
                          if(err) {
                              cprint(err, 1);
                              settings.serviceError(res, err.toString());
                              return;
                          }
                          var data = [];
                          if(objectRows.length > 0 ){
                                  objectRows.forEach(function(anObject, index){
                                      data.push({
                                          objectID: anObject['ObjectID'],
                                          objectPosition: anObject['ObjectPosition']
                                      });
                                  });
                                  res.json({
                                      helper: {
                                          imageID: imageID,
                                          referenceObject: referenceObject,
                                          pixelValueInMM: pixelValueInMM,
                                          numberOfObjects: numberOfObjects,
                                          categoryArray: categoryArray
                                      },
                                      data: data,
                                      status: 'success',
                                      message: 'records fetched successfully'
                                  });
                                  return;
                          } else {
                                  res.json({
                                      helper: {
                                          imageID: imageID,
                                          referenceObject: referenceObject,
                                          pixelValueInMM: pixelValueInMM,
                                          numberOfObjects: numberOfObjects,
                                          categoryArray: categoryArray
                                      },
                                      data: [],
                                      status: 'success',
                                      message: 'records fetched successfully'
                                  });
                                  return;
                          }
                     });
                 });
            });
        });
 
    });
}