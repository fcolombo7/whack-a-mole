/** WEBGL */
var gl;

var baseDir;
var shaderDir;
var assetDir;

var program;
var skybox_program;

//MODEL
var meshes;

//VAO
var vao_arr; //data structure containing all the VAO (one for each type of obj)
var skybox_vao;

//OBJECTS
var objects;
var holesWorldPositions;

//TEXTURES
var texture;
var skyboxTexture;

//UNIFORMS
var matrixLocation;
var lightDirectionHandle;
var lightColorHandle;
var normalMatrixPositionHandle;
var textLocation;

//ATTRIBUTES
var uvAttributeLocation;
var positionAttributeLocation;
var normalAttributeLocation;
var skyboxVertPosAttr;

//VARIABLES
var scaleFactor = 2.5;
/** camera parameters */
var envFolder = "01";
var cameraGamePosition = [0.0, 7.0, 4.0];
var cameraPosition = [0.0, 10.0, 20.0];
var target = [0.0, 0.8 * scaleFactor, 0.0]; //the target is not the origin but the point of the cabinet where the moles jump. 
var up = [0.0, 1.0, 0.0];

var hammerStartingPosition = [-1.5, 1.4, 1.3];

var molesStartingPositions = [[-0.63523, 0, 0], 
                              [0, 0, 0],
                              [0.6353, 0, 0], 
                              [-0.31763, -0.1, 0.4429], 
                              [0.31763, -0.1, 0.4429]]
/**directional light */
var directionalLight;
var directionalLightColor;

/**ambient light */
var ambientLight = [0.4, 0.4, 0.4];

//MATRICES
var projectionMatrix;
var viewMatrix;

//SCENE GRAPH
var sceneRoot;

//Definition of the structure used as scene graph (example taken from webGLTutorial2)
var Node = function () {
  this.children = [];
  this.localMatrix = utils.identityMatrix();
  this.worldMatrix = utils.identityMatrix();
};

Node.prototype.setParent = function (parent) {
  // remove us from our parent
  if (this.parent) {
    var ndx = this.parent.children.indexOf(this);
    if (ndx >= 0) {
      this.parent.children.splice(ndx, 1);
    }
  }

  // Add us to our new parent
  if (parent) {
    parent.children.push(this);
  }
  this.parent = parent;
};

Node.prototype.updateWorldMatrix = function (matrix) {
  if (matrix) {
    // a matrix was passed in so do the math
    this.worldMatrix = utils.multiplyMatrices(matrix, this.localMatrix);
  } else {
    // no matrix was passed in so just copy.
    utils.copy(this.localMatrix, this.worldMatrix);
  }

  // now process all the children
  var worldMatrix = this.worldMatrix;
  this.children.forEach(function (child) {
    child.updateWorldMatrix(worldMatrix);
  });
};

/** GAME */
var game;
var deltaYMole = 0.6; //up&down difference

// ------------------------------------------------------------------------------------------------------------------------------
/** FUNCTIONS */

function setViewportAndCanvas() {
  //SET Global states (viewport size, viewport background color, Depth test)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.85, 0.85, 0.85, 1.0); //TODO: background color as variable. 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  //ClearBits();
}

function getAttributesAndUniforms() {
  //objs
  uvAttributeLocation = gl.getAttribLocation(program, "inUV");
  positionAttributeLocation = gl.getAttribLocation(program, "inPosition");
  normalAttributeLocation = gl.getAttribLocation(program, "inNormal");
  matrixLocation = gl.getUniformLocation(program, "matrix");
  lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  lightColorHandle = gl.getUniformLocation(program, 'lightColor');
  ambientLightHandle = gl.getUniformLocation(program, 'ambientLight');
  normalMatrixPositionHandle = gl.getUniformLocation(program, 'nMatrix');
  textLocation = gl.getUniformLocation(program, "u_texture");

  //sky box
  skyboxTexHandle = gl.getUniformLocation(skyboxProgram, "u_texture");
  inverseViewProjMatrixHandle = gl.getUniformLocation(skyboxProgram, "inverseViewProjMatrix");
  skyboxVertPosAttr = gl.getAttribLocation(skyboxProgram, "in_position");
}

function loadObj() {
  vao_arr = [];
  meshes.forEach(mesh => {
    var vao = gl.createVertexArray();

    gl.bindVertexArray(vao);
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexNormals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(normalAttributeLocation);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    var uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.textures), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uvAttributeLocation);
    gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

    vao_arr.push(vao);
  });

  // Create a texture: only one because it is common to all the objects.
  texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  var image = new Image();
  image.src = assetDir + "Mole.png";
  image.onload = function () {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.generateMipmap(gl.TEXTURE_2D);
  };
}

function loadEnvironment() {
  var skyboxVertPos = new Float32Array(
    [
      -10, -10, 1.0,
      10, -10, 1.0,
      -10, 10, 1.0,
      -10, 10, 1.0,
      10, -10, 1.0,
      10, 10, 1.0,
    ]);

  skyboxVao = gl.createVertexArray();
  gl.bindVertexArray(skyboxVao);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, skyboxVertPos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(skyboxVertPosAttr);
  gl.vertexAttribPointer(skyboxVertPosAttr, 3, gl.FLOAT, false, 0, 0);

  skyboxTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + 3);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

  var envTexDir = assetDir + "env/"+envFolder+"/";

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: envTexDir + 'posx.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: envTexDir + 'negx.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: envTexDir + 'posy.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: envTexDir + 'negy.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: envTexDir + 'posz.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: envTexDir + 'negz.png',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1023;
    const height = 1023;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function () {
      // Now that the image has loaded upload it to the texture.
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });


  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

}

function lightDefinition() {
  //LIGHT DEFINITION
  var dirLightAlpha = -utils.degToRad(30);
  var dirLightBeta = -utils.degToRad(60);
  directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta), Math.sin(dirLightAlpha), Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)];
  directionalLightColor = [0.6, 0.6, 0.6];
}

function sceneGraphDefinition() {
  //Here it is defined the scene graph with all the objects of the scene.
  //the function returns the root of the graph. 
  var cabinetSpace = new Node();
  cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 0, 0, 0, scaleFactor);
  //cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 90, 0, 0, 2.5);

  var moleSpace = new Node();
  moleSpace.localMatrix = utils.MakeTranslateMatrix(0, 1.1, 0.2);

  var cabinetNode = new Node();
  //cabinetNode.localMatrix = utils.MakeRotateXMatrix(90);
  cabinetNode.drawInfo = {
    materialColor: [0.6, 0.6, 0.0],
    programInfo: program,
    bufferLength: meshes[0].indices.length,
    vertexArray: vao_arr[0],
  };

  var hammerNode = new Node();
  hammerNode.localMatrix = utils.MakeWorld(hammerStartingPosition[0], hammerStartingPosition[1], hammerStartingPosition[2], 0, 0, 0, 0.6);
  hammerNode.drawInfo = {
    materialColor: [0.2, 0.5, 0.8],
    programInfo: program,
    bufferLength: meshes[1].indices.length,
    vertexArray: vao_arr[1],
  };

  var mole1Node = new Node();
  mole1Node.localMatrix = utils.MakeTranslateMatrix(molesStartingPositions[0][0], 
                                                    molesStartingPositions[0][1], 
                                                    molesStartingPositions[0][2]);
  mole1Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };
  var hole1Pos = [0.0, 0.0, 0.0, 1.0];
  hole1Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole1Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole1Pos);

  var mole2Node = new Node();
  mole2Node.localMatrix = utils.MakeTranslateMatrix(molesStartingPositions[1][0], 
                                                    molesStartingPositions[1][1], 
                                                    molesStartingPositions[1][2]);
  mole2Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };
  var hole2Pos = [0.0, 0.0, 0.0, 1.0];
  hole2Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole2Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole2Pos);

  var mole3Node = new Node();
  mole3Node.localMatrix = utils.MakeTranslateMatrix(molesStartingPositions[2][0], 
                                                    molesStartingPositions[2][1], 
                                                    molesStartingPositions[2][2]);
  mole3Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };
  var hole3Pos = [0.0, 0.0, 0.0, 1.0];
  hole3Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole3Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole3Pos);

  var mole4Node = new Node();
  mole4Node.localMatrix = utils.MakeTranslateMatrix(molesStartingPositions[3][0], 
                                                    molesStartingPositions[3][1], 
                                                    molesStartingPositions[3][2]);
  mole4Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };
  var hole4Pos = [0.0, 0.0, 0.0, 1.0];
  hole4Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole4Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole4Pos);

  var mole5Node = new Node();
  mole5Node.localMatrix = utils.MakeTranslateMatrix(molesStartingPositions[4][0], 
                                                    molesStartingPositions[4][1], 
                                                    molesStartingPositions[4][2]);
  mole5Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };
  var hole5Pos = [0.0, 0.0, 0.0, 1.0];
  hole5Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole5Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole5Pos);

  //-0.31763, -0.1372, -0,5502
  cabinetNode.setParent(cabinetSpace);
  hammerNode.setParent(cabinetSpace);
  moleSpace.setParent(cabinetSpace);
  mole1Node.setParent(moleSpace);
  mole2Node.setParent(moleSpace);
  mole3Node.setParent(moleSpace);
  mole4Node.setParent(moleSpace);
  mole5Node.setParent(moleSpace);

  objects = [
    cabinetNode,
    hammerNode,
    mole1Node,
    mole2Node,
    mole3Node,
    mole4Node,
    mole5Node,
  ];

  let y_trasl = 0.2
  holesWorldPositions = [
    [hole1Pos[0], hole1Pos[1] - y_trasl, hole1Pos[2]],//1
    [hole2Pos[0], hole2Pos[1] - y_trasl, hole2Pos[2]],//2
    [hole3Pos[0], hole3Pos[1] - y_trasl, hole3Pos[2]],//3
    [hole4Pos[0], hole4Pos[1] - y_trasl, hole4Pos[2]],//4
    [hole5Pos[0], hole5Pos[1] - y_trasl, hole5Pos[2]],//5
  ]
  sceneRoot = cabinetSpace;
}

function setMatrices() {
  // Compute the projection matrix
  var aspect = gl.canvas.width / gl.canvas.height;
  projectionMatrix = utils.MakePerspective(60.0, aspect, 1.0, 2000.0);

  // Compute the camera matrix using look at.
  var cameraMatrix = utils.LookAt(cameraPosition, target, up);
  viewMatrix = utils.invertMatrix(cameraMatrix);

  //viewMatrix = utils.MakeView(cameraPosition[0], cameraPosition[1], cameraPosition[2], 0.0, 0.0);
}

function drawSkybox() {
  gl.useProgram(skyboxProgram);

  gl.activeTexture(gl.TEXTURE0 + 3);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
  gl.uniform1i(skyboxTexHandle, 3);

  var viewProjMat = utils.multiplyMatrices(projectionMatrix, viewMatrix);
  inverseViewProjMatrix = utils.invertMatrix(viewProjMat);
  gl.uniformMatrix4fv(inverseViewProjMatrixHandle, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));

  gl.bindVertexArray(skyboxVao);
  gl.depthFunc(gl.LEQUAL);
  gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);
}

function drawScene() {
  animate();

  gl.clearColor(0.85, 0.85, 0.85, 1.0); //TODO: what is it used for?
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var cameraMatrix = utils.LookAt(cameraPosition, target, up);
  viewMatrix = utils.invertMatrix(cameraMatrix);

  drawSkybox();

  var viewProjectionMatrix = utils.multiplyMatrices(projectionMatrix, viewMatrix);
  // Update all world matrices in the scene graph
  sceneRoot.updateWorldMatrix();
  // Compute all the matrices for rendering
  objects.forEach(function (object) {

    gl.useProgram(object.drawInfo.programInfo);

    var projectionMatrix = utils.multiplyMatrices(viewProjectionMatrix, object.worldMatrix);
    var normalMatrix = utils.invertMatrix(utils.transposeMatrix(object.worldMatrix));

    gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
    gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

    //gl.uniform3fv(materialDiffColorHandle, object.drawInfo.materialColor);
    gl.uniform3fv(lightColorHandle, directionalLightColor);
    gl.uniform3fv(lightDirectionHandle, directionalLight);
    gl.uniform3fv(ambientLightHandle, ambientLight);

    // Pass to the shader the texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textLocation, 0);

    gl.bindVertexArray(object.drawInfo.vertexArray);
    gl.drawElements(gl.TRIANGLES, object.drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0);
  });

  requestAnimationFrame(drawScene);
}

function animate() {
  //Here the transformation of each matrix
  animateCamera();
  animateMoles();
  animateHammer();
}

function main() {
  lightDefinition();
  setViewportAndCanvas();
  getAttributesAndUniforms();

  loadEnvironment();
  loadObj();

  setMatrices();
  sceneGraphDefinition();

  window.requestAnimationFrame(drawScene);
}

async function init() {
  var path = window.location.pathname;
  var page = path.split("/").pop();
  baseDir = window.location.href.replace(page, '');
  shaderDir = baseDir + "shaders/";
  assetDir = baseDir + "asset/";

  var canvas = document.getElementById("c");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    document.write("GL context not opened");
    return;
  }
  utils.resizeCanvasToDisplaySize(gl.canvas);

  // load the shaders from file
  await utils.loadFiles([shaderDir + 'vs.glsl', shaderDir + 'fs.glsl'], function (shaderText) {
    var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
    var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);

    program = utils.createProgram(gl, vertexShader, fragmentShader);
  });

  //skybox
  await utils.loadFiles([shaderDir + 'skybox_vs.glsl', shaderDir + 'skybox_fs.glsl'], function (shaderText) {
    var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
    var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);

    skyboxProgram = utils.createProgram(gl, vertexShader, fragmentShader);
  });

  //load the meshes from file
  const src_objects = ['cabinet.obj', 'hammer.obj', 'mole.obj'];
  meshes = [];
  for (const src of src_objects) {
    var objStr = await utils.get_objstr(assetDir + src);
    meshes.push(new OBJ.Mesh(objStr));
  }
  /**
   * Event Listener
   * TODO: Up to now muose to move the camera
   */
  canvas.addEventListener("mouseup", onMouseUp, false);
  canvas.addEventListener("mousedown", onMouseDown, false);
  canvas.addEventListener("mousemove", onMouseMove, false);
  canvas.addEventListener("wheel", onMouseZoom, false);

  /**
   * GAME INITIALIZATOIN 
   * */
  game = new Game();
  main();
}

// ------------------------------------------------------------------------------------------------------------------------------
/**
 * EVENT LISTENERS
 */
var lastX;
function onMouseMove(event) {
  if (!game.isPlaying()) {
    cameraOnMouseMove(event);
    return;
  }

  //This is a way of calculating the coordinates of the click in the canvas taking into account its possible displacement in the page
  var top = 0.0, left = 0.0;
  var canvas = gl.canvas;
  while (canvas && canvas.tagName !== 'BODY') {
    top += canvas.offsetTop;
    left += canvas.offsetLeft;
    canvas = canvas.offsetParent;
  }
  //console.log("left " + left + " top " + top);
  var x = event.clientX - left;
  var y = event.clientY - top;

  //Here we calculate the normalised device coordinates from the pixel coordinates of the canvas
  //console.log("ClientX " + x + " ClientY " + y);
  var normX = (2 * x) / gl.canvas.width - 1;
  var normY = 1 - (2 * y) / gl.canvas.height;
  //console.log("NormX " + normX + " NormY " + normY);

  //We need to go through the transformation pipeline in the inverse order so we invert the matrices
  var projInv = utils.invertMatrix(projectionMatrix);
  var viewInv = utils.invertMatrix(viewMatrix);
  var worldInv = utils.invertMatrix(objects[1].worldMatrix);
  //Find the point (un)projected on the near plane, from clip space coords to eye coords
  //z = -1 makes it so the point is on the near plane
  //w = 1 is for the homogeneous coordinates in clip space
  var pointEyeCoords = utils.multiplyMatrixVector(projInv, [normX, normY, -1, 1]);
  var pointWorldCoords = utils.multiplyMatrixVector(viewInv, pointEyeCoords);

  //console.log("Point eye coords " + pointEyeCoords);
  //console.log("Point world coords " + pointWorldCoords);
  //console.log('Reference: ' + hammerStartingPosition);

  var mat = utils.identityMatrix();
  var hammer = objects[1];
  if (lastX) {
    mat = utils.MakeWorld(pointWorldCoords[0], hammerStartingPosition[1], hammerStartingPosition[2], 0, 0, 0, 0.6);
  } else {
    let dx = (pointWorldCoords[0] - lastX);
    if (dx != 0)
      mat = utils.multiplyMatrices(utils.MakeTranslateMatrix(dx, 0.0, 0.0), hammer.localMatrix);
  }
  lastX = pointWorldCoords[0];
  hammer.localMatrix = mat;
  //console.log("MOUSE POSITION: " + event.pageX + ", " + event.pageY);
}

function onMouseUp(event) {
  if (!game.isPlaying()) {
    cameraOnMouseUp(event);
    return;
  }
  /** 
   * GET THE COORDINATES OF THE CLICK
   * (TAKE INTO ACCOUNT POSSIBLE DISPLACEMENT OF THE PAGE)
   */
  var top = 0.0, left = 0.0;
  canvas = gl.canvas;
  while (canvas && canvas.tagName !== 'BODY') {
    top += canvas.offsetTop;
    left += canvas.offsetLeft;
    canvas = canvas.offsetParent;
  }
  var x = event.clientX - left;
  var y = event.clientY - top;

  /**
   * NORMALIZE THE COORDINATES
   */
  var normX = (2 * x) / gl.canvas.width - 1;
  var normY = 1 - (2 * y) / gl.canvas.height;

  var projInv = utils.invertMatrix(projectionMatrix);
  var viewInv = utils.invertMatrix(viewMatrix);

  /**
   * POINT ON THE NEAR PLANE
   */
  var pointEyeCoords = utils.multiplyMatrixVector(projInv, [normX, normY, -1, 1]);

  /**
    * DIRECTION IN EYE SPACE
    * w = 0 is because this is not a point anymore but is considered as a direction
    */
  var rayEyeCoords = [pointEyeCoords[0], pointEyeCoords[1], pointEyeCoords[2], 0];

  /**
   * DIRECTION IN WORLD SPACE
   */
  var rayDir = utils.multiplyMatrixVector(viewInv, rayEyeCoords);
  //console.log("Ray direction "+rayDir);
  var normalisedRayDir = normaliseVector(rayDir);
  //console.log("normalised ray dir "+normalisedRayDir);
  //The ray starts from the camera in world coordinates
  var rayStartPoint = [cameraGamePosition[0], cameraGamePosition[1], cameraGamePosition[2]];

  var curMolesStatus = game.getAllStatus();
  for (let i = 0; i < holesWorldPositions.length; i++) {
    /**
     * MODEL EACH HOLE OF THE CABINET AS A SPHERE.
     * CHECK THE INTERSACTION WITH THE RAY
     */
    //console.log(holesWorldPositions[i]);
    let sphereRadius = 0.4;
    let sphereCentre = [holesWorldPositions[i][0] * scaleFactor, holesWorldPositions[i][1] * scaleFactor, holesWorldPositions[i][2] * scaleFactor]

    hit = raySphereIntersection(rayStartPoint, normalisedRayDir, sphereCentre, sphereRadius);
    if (hit) {
      console.log("CABINET HOLE#" + i + " SELECTED");
      /**
       *  HAMMER ANIMATION HERE  
      */
      lastHammerStatus = true;
      let dx = holesWorldPositions[i][0] - lastX;
      let hammer = objects[1];
      mat = utils.multiplyMatrices(utils.MakeTranslateMatrix(dx, 0.0, 0.0), hammer.localMatrix);
      hammer.localMatrix = mat;

      //whack the mole and get from the game the score and the lives
      let { score, lives } = game.whackMole(i);
      updateGUI(score, lives);
      if (!game.isPlaying()) //then the game is ended.
        onGameEnd();
    }
  }
}
function onMouseDown(event){
  if (!game.isPlaying()) {
    cameraOnMouseDown(event);
    return;
  }
}
function onMouseZoom(event){
  if (!game.isPlaying()) {
    cameraOnMouseZoom(event);
    return;
  }
}

function onStartButtonClick() {
  lastCameraUpdateTime = (new Date).getTime();
  movingCamera = true;
  document.getElementById("start_game").disabled = true;
}


/**
 * CAMERA EVENT LISTENER
 */
 var mouseState = false;
 var lastMouseX = -100, lastMouseY = -100;

function cameraOnMouseDown(event) {
  lastMouseX = event.pageX;
  lastMouseY = event.pageY;
  mouseState = true;
}

function cameraOnMouseUp(event) {
  lastMouseX = -100;
  lastMouseY = -100;
  mouseState = false;
}

function cameraOnMouseZoom(event) {
  const delta = Math.sign(event.deltaY);
  cameraPosition[2] = cameraPosition[2] + delta;
}

function cameraOnMouseMove(event) {
  if (mouseState) {
    var dx = event.pageX - lastMouseX;
    var dy = lastMouseY - event.pageY;
    lastMouseX = event.pageX;
    lastMouseY = event.pageY;

    if ((dx != 0) || (dy != 0)) {
      cameraPosition[0] = cameraPosition[0] - 0.2 * dx;
      cameraPosition[1] = cameraPosition[1] - 0.2 * dy;
    }
  }
}

// ------------------------------------------------------------------------------------------------------------------------------
/**
 *  ANIMATIONS
 */

/**ANIMATION CONTROL VARIABLES */
//CAMERA
var lastCameraUpdateTime;
var movingCamera = false;

function animateCamera() {
  if (movingCamera) {
    var currentTime = (new Date).getTime();
    var endAnimation = true;
    if (lastCameraUpdateTime) {
      var delta = (10 * (currentTime - lastCameraUpdateTime)) / 1000.0;
      //update the x coordinate
      if (Math.abs(cameraGamePosition[0] - cameraPosition[0]) < delta) {
        cameraPosition[0] = cameraGamePosition[0];
      }
      else {
        endAnimation = false;
        let cx = Math.sign(cameraGamePosition[0] - cameraPosition[0]) * delta;
        cameraPosition[0] += cx;
      }
      //update the y coordinate
      if (Math.abs(cameraGamePosition[1] - cameraPosition[1]) < delta) {
        cameraPosition[1] = cameraGamePosition[1];
      }
      else {
        endAnimation = false;
        let cy = Math.sign(cameraGamePosition[1] - cameraPosition[1]) * delta;
        cameraPosition[1] += cy;
      }
      //update the z coordinate
      if (Math.abs(cameraGamePosition[2] - cameraPosition[2]) < delta) {
        cameraPosition[2] = cameraGamePosition[2];
      }
      else {
        endAnimation = false;
        let cz = Math.sign(cameraGamePosition[2] - cameraPosition[2]) * delta;
        cameraPosition[2] += cz;
      }
    }
    if (!endAnimation)
      lastCameraUpdateTime = currentTime;
    else {
      movingCamera = false;
      game.start();
    }
  }
}

//MOLES
var lastMoleStatus;

function animateMoles() {
  if (!game.isPlaying()) {
    /** If the fgame is not started put all the mole inside the cabinet */
    if (!lastMoleStatus) {
      for (let i = 2; i < objects.length; i++) {
        curLocalPosition = objects[i].localMatrix;
        objects[i].localMatrix = utils.multiplyMatrices(curLocalPosition, utils.MakeTranslateMatrix(0.0, 0.0 - deltaYMole, 0.0));
      }
      lastMoleStatus = game.getAllStatus();
    }
  } else {
    //TODO: Here animation is required, up to now only translation
    var curMoleStatus = game.getAllStatus();
    for (let i = 0; i < curMoleStatus.length; i++) {
      if (curMoleStatus[i] != lastMoleStatus[i]) {

        /*
        let c;
        if (curMoleStatus[i] > 0) c = 1.0;
        else c = -1.0;
        curLocalPosition = objects[i + 2].localMatrix;
        objects[i + 2].localMatrix = utils.multiplyMatrices(curLocalPosition, utils.MakeTranslateMatrix(0.0, 0.0 + deltaYMole * c, 0.0));
        */
        lastMoleStatus[i] = curMoleStatus[i];
        molesAnimationStatus[i] = true;
      }
      singleMoleAnimation(i);
    }
    //lastMoleStatus = curMoleStatus;
  }
}

var moleAnimDuration = 80; //ms
var molesAnimTime = [0, 0, 0, 0, 0]
var lastMolesUpdateTime = [null, null, null, null, null];
var molesAnimationStatus = [false, false, false, false, false]; //not the status of the mole, but true if the mole is performing an animation

function singleMoleAnimation(idx) {
  if (!molesAnimationStatus[idx]) return;
  let mole = objects[idx + 2];
  var currentTime = (new Date).getTime();
  var deltaT;
  if (lastMolesUpdateTime[idx]) {
    deltaT = (currentTime - lastMolesUpdateTime[idx]);
  } else {
    deltaT = 1 / 50;
  }
  lastMolesUpdateTime[idx] = currentTime;
  molesAnimTime[idx] += deltaT;
  let c;
  if(lastMoleStatus[idx]>0) c = 1.0;
  else c = -1.0

  dy = deltaT/moleAnimDuration * deltaYMole;
  mole.localMatrix = utils.multiplyMatrices(mole.localMatrix, utils.MakeTranslateMatrix(0.0, 0.0 + dy * c, 0.0));
  
  if (molesAnimTime[idx] >= moleAnimDuration) {
    lastMolesUpdateTime[idx] = null
    molesAnimTime[idx] = 0;
    molesAnimationStatus[idx] = false;
    let dy = 0;
    if (lastMoleStatus[idx] == 0)
      dy = deltaYMole;
    mole.localMatrix = utils.MakeTranslateMatrix(molesStartingPositions[idx][0], molesStartingPositions[idx][1] - dy , molesStartingPositions[idx][2]);
  }
  console.log(molesAnimTime);
  console.log(lastMolesUpdateTime);
  console.log(molesAnimationStatus);
  console.log(lastMoleStatus);
}

// HAMMER
var hammerAnimTime = 0;
var hammerAnimDuration = 150; //ms
var positionBeforeAnim = null
var lastHammerStatus = false
var lastHammerUpdateTime = null;

function animateHammer() {
  if (!lastHammerStatus) return;

  let hammer = objects[1];
  if (!positionBeforeAnim)
    positionBeforeAnim = hammer.localMatrix

  var currentTime = (new Date).getTime();
  var deltaT;
  if (lastHammerUpdateTime) {
    deltaT = (currentTime - lastHammerUpdateTime);
  } else {
    deltaT = 1 / 50;
  }
  lastHammerUpdateTime = currentTime;

  /** START POSITION */
  let r_s = Math.sin(hammerAnimTime / hammerAnimDuration * Math.PI) * (-60);
  /** END POSITION */
  let r_e = Math.sin((hammerAnimTime + deltaT) / hammerAnimDuration * Math.PI) * (-60);
  let delta_rot = r_e - r_s;
  console.log(r_s, r_e, delta_rot);
  /** UPDATE THE CUMULATIVE ANIMATION TIME */
  hammerAnimTime += deltaT;

  //the center of the rotation is the handle of the hammer
  var tr_mat = utils.MakeTranslateMatrix(0, -1.50, 0);
  var rot_mat = utils.MakeRotateXYZMatrix(0, delta_rot, 0);
  var tr_mat_inv = utils.MakeTranslateMatrix(0, 1.50, 0);

  var mat = utils.multiplyMatrices(utils.multiplyMatrices(tr_mat, rot_mat), tr_mat_inv)

  hammer.localMatrix = utils.multiplyMatrices(hammer.localMatrix, mat);

  if (hammerAnimTime >= hammerAnimDuration) {
    lastHammerUpdateTime = null
    hammerAnimTime = 0;
    lastHammerStatus = false;
    hammer.localMatrix = positionBeforeAnim;
    positionBeforeAnim = null;
  }
}

// ------------------------------------------------------------------------------------------------------------------------------
/**
 * OTHER FUNCTIONS
 */
function normaliseVector(vec) {
  var magnitude = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
  var normVec = [vec[0] / magnitude, vec[1] / magnitude, vec[2] / magnitude];
  return normVec;
}

function raySphereIntersection(rayStartPoint, rayNormalisedDir, sphereCentre, sphereRadius) {
  //This algorithm is taken from the book Real Time Rendering fourth edition

  //Distance between sphere origin and origin of ray
  var l = [sphereCentre[0] - rayStartPoint[0], sphereCentre[1] - rayStartPoint[1], sphereCentre[2] - rayStartPoint[2]];
  var l_squared = l[0] * l[0] + l[1] * l[1] + l[2] * l[2];
  //If this is true, the ray origin is inside the sphere so it collides with the sphere
  if (l_squared < (sphereRadius * sphereRadius)) {
    //console.log("ray origin inside sphere");
    return true;
  }
  //Projection of l onto the ray direction 
  var s = l[0] * rayNormalisedDir[0] + l[1] * rayNormalisedDir[1] + l[2] * rayNormalisedDir[2];
  //The spere is behind the ray origin so no intersection
  if (s < 0) {
    //console.log("sphere behind ray origin");
    return false;
  }
  //Squared distance from sphere centre and projection s with Pythagorean theorem
  var m_squared = l_squared - (s * s);
  //If this is true the ray will miss the sphere
  if (m_squared > (sphereRadius * sphereRadius)) {
    //console.log("m squared > r squared");
    return false;
  }
  //Now we can say that the ray will hit the sphere 
  //console.log("hit");
  return true;

}

function updateGUI(score, lives) {
  var score_text = document.getElementById("score_text");
  var l1 = document.getElementById("l1");
  var l2 = document.getElementById("l2");
  var l3 = document.getElementById("l3");
  /** UPDATE THE SCORE */
  score_text.innerHTML = score;

  /** VISUALIZE THE CORRECT AMOUNT OF RED CROSSES */
  if (lives == 2)
    l1.classList.add("red-cross");
  if (lives == 1)
    l2.classList.add("red-cross");
  if (lives == 0)
    l3.classList.add("red-cross");
}

function onGameEnd() {
  document.getElementById('end_game').style.display = 'block';
}

function changeEnvironment(){
  var e = document.getElementById("env-menu");
  envFolder = e.value;
  loadEnvironment();
}