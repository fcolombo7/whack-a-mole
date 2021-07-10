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
var cameraGamePosition = [0.0, 7.0, 4.0];
var cameraPosition = [0.0, 10.0, 20.0];
var target = [0.0, 0.8 * scaleFactor, 0.0]; //the target is not the origin but the point of the cabinet where the moles jump. 
var up = [0.0, 1.0, 0.0];

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
  this.name = "";
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


/** FUNCTIONS */

window.addEventListener("keydown", function (event) {
  if (event.defaultPrevented) {
    return; // Do nothing if event already handled
  }
  var x = 0, z = 0;

  sceneRoot.children.forEach(Element => {
    if (Element.name == "hammer") {
      switch (event.code) {
        case "KeyS":
          if (Element.localMatrix[11] < 1.5 && Element.localMatrix[3] < -0.3) {
            x = 0.31763;
            z = z + 0.4429;
          }
          if (Element.localMatrix[11] < 1.5 && Element.localMatrix[3] > 0.3) {
            x = - 0.31763;
            z = z + 0.4429;
          }
          break;
        case "KeyW":
          if (Element.localMatrix[11] > 1.5 && Element.localMatrix[3] < -0.3) {
            x = - 0.31763;
            z = z - 0.4429;
          }
          if (Element.localMatrix[11] > 1.5 && Element.localMatrix[3] > 0.3) {
            x = 0.31763;
            z = z - 0.4429;
          }
          break;
        case "KeyA":
          if (Element.localMatrix[11] < 1.5 && Element.localMatrix[3] > -0.3) {
            x = x - 0.6353;
          }
          if (Element.localMatrix[11] > 1.5 && Element.localMatrix[3] > -0.3) {
            x = x - 0.31763 * 2;
          }
          break;
        case "KeyD":
          if (Element.localMatrix[11] < 1.5 && Element.localMatrix[3] < 0.3) {
            x = x + 0.6353;
          }
          if (Element.localMatrix[11] > 1.5 && Element.localMatrix[3] < 0.3) {
            x = x + 0.31763 * 2;
          }
          break;
        case "Space":
          animateHammer(Element);
          break;
      }
      Element.localMatrix = utils.multiplyMatrices(Element.localMatrix, utils.MakeTranslateMatrix(x, 0, z));
      Element.updateWorldMatrix();
    }
  });
  // Consume the event so it doesn't get handled twice
  event.preventDefault();
}, true);


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
      -1, -1, 1.0,
      1, -1, 1.0,
      -1, 1, 1.0,
      -1, 1, 1.0,
      1, -1, 1.0,
      1, 1, 1.0,
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

  var envTexDir = assetDir + "env/";

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
    const width = 1024;
    const height = 1024;
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
  cabinetSpace.name = "cabinetSpace";
  var moleSpace = new Node();
  moleSpace.localMatrix = utils.MakeTranslateMatrix(0, 1.1, 0.2);
  moleSpace.name = "moleSpace";

  var cabinetNode = new Node();
  cabinetNode.name = "cabinet";
  cabinetNode.drawInfo = {
    materialColor: [0.6, 0.6, 0.0],
    programInfo: program,
    bufferLength: meshes[0].indices.length,
    vertexArray: vao_arr[0],
  };

  var hammerNode = new Node();
  hammerNode.name = "hammer";
  hammerNode.localMatrix = utils.MakeTranslateMatrix(-0.63523, 1.3, 1.3);
  hammerNode.drawInfo = {
    materialColor: [0.2, 0.5, 0.8],
    programInfo: program,
    bufferLength: meshes[1].indices.length,
    vertexArray: vao_arr[1],
  };

  var mole1Node = new Node();
  mole1Node.name = "mole1";
  mole1Node.localMatrix = utils.MakeTranslateMatrix(-0.63523, 0, 0);
  mole1Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole2Node = new Node();
  mole2Node.name = "mole2";
  mole2Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole3Node = new Node();
  mole3Node.name = "mole3";
  mole3Node.localMatrix = utils.MakeTranslateMatrix(0.6353, 0, 0);
  mole3Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole4Node = new Node();
  mole4Node.name = "mole4";
  mole4Node.localMatrix = utils.MakeTranslateMatrix(-0.31763, -0.1, 0.4429);
  mole4Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole5Node = new Node();
  mole5Node.name = "mole5";
  mole5Node.localMatrix = utils.MakeTranslateMatrix(+0.31763, -0.1, 0.4429);
  mole5Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

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


function Anim4(t) {
  // var s = utils.MakeScaleMatrix(1 / 12);
  // var tr1 = utils.MakeTranslateMatrix(0.0, 0.5 * 5 / 6, 1);
  // var tr2 = utils.MakeTranslateMatrix(Math.floor(72 * t) % 12, -Math.floor(12 * t) % 6, 0.0);
  // var out = utils.multiplyMatrices(utils.multiplyMatrices(
  //   tr1, s), tr2);
  return out = utils.MakeTranslateMatrix(Math.floor(72 * t) % 12, -Math.floor(12 * t) % 6, 0.0);
}
function Anim1(t) {
  var tr = utils.MakeTranslateMatrix(t / 4, 0.5, 1);
  var s = utils.MakeScaleMatrix(1 / 4);

  var out = utils.multiplyMatrices(tr, s);
  return out;
}

var g_time = 0;

function drawScene() {
  animate();
  // animateHammer();

  Element = objects[1];
  var currentTime = (new Date).getTime();
  var deltaT;
  if (lastUpdateTime) {
    deltaT = (currentTime - lastUpdateTime) / 1000.0;
  } else {
    deltaT = 1 / 50;
  }
  lastUpdateTime = currentTime;
  g_time += deltaT;

  t = (g_time - 5 * Math.floor(g_time / 5)) / 5;
  var tMat = Anim1(t);
  // tMat = utils.multiplyMatrices(tMat, Element.localMatrix);

  //NEED TO MAKE IT MOVE UP AND DOWN
  // TODO: create the correct animation
  // Element.localMatrix = utils.multiplyMatrices(Element.localMatrix, utils.MakeRotateXMatrix(g_time));
  // Element.localMatrix = utils.multiplyMatrices(Element.localMatrix, utils.MakeRotateXMatrix(-90));
  // Element.updateWorldMatrix();

  gl.clearColor(0.85, 0.85, 0.85, 1.0); //TODO: what is it used for?
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var cameraMatrix = utils.LookAt(cameraPosition, target, up);
  viewMatrix = utils.invertMatrix(cameraMatrix);

  //drawSkybox();

  var viewProjectionMatrix = utils.multiplyMatrices(projectionMatrix, viewMatrix);
  // Update all world matrices in the scene graph
  sceneRoot.updateWorldMatrix();
  // Compute all the matrices for rendering
  objects.forEach(function (object) {

    gl.useProgram(object.drawInfo.programInfo);

    var projectionMatrix = utils.multiplyMatrices(viewProjectionMatrix, object.worldMatrix);
    var normalMatrix = utils.invertMatrix(utils.transposeMatrix(object.worldMatrix));

    if (object == objects[1]) {
      gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(tMat));
      gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));
    }else{
    gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
    gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));
  }

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
}

function main() {
  lightDefinition();
  setViewportAndCanvas();
  getAttributesAndUniforms();

  //loadEnvironment();
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
  canvas.addEventListener("mousedown", doMouseDown, false);
  canvas.addEventListener("mouseup", doMouseUp, false);
  canvas.addEventListener("mousemove", doMouseMove, false);
  canvas.addEventListener("wheel", doMouseZoom, false);

  /**
   * GAME INITIALIZATOIN 
   * */
  game = new Game();
  main();
}

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;

function doMouseDown(event) {
  if (document.getElementById("start_game").disabled) return;
  lastMouseX = event.pageX;
  lastMouseY = event.pageY;
  mouseState = true;
}
function doMouseUp(event) {
  if (document.getElementById("start_game").disabled) return;
  lastMouseX = -100;
  lastMouseY = -100;
  mouseState = false;

  var hammer = objects[1];
  animateHammer(hammer);
}

function doMouseZoom(event) {
  if (document.getElementById("start_game").disabled) return;
  const delta = Math.sign(event.deltaY);
  // console.log("wheel: " + delta);
  cameraPosition[2] = cameraPosition[2] + delta;
  //console.log("CAMERA POSITION: " + cameraPosition);
}

function doMouseMove(event) {
  if (document.getElementById("start_game").disabled) return;
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
  //console.log("CAMERA POSITION: " + cameraPosition);

}

function onStartGameClick() {
  lastUpdateTime = (new Date).getTime();
  movingCamera = true;
  document.getElementById("start_game").disabled = true;
  //cameraPosition = [cameraGamePosition[0], cameraGamePosition[1], cameraGamePosition[2]];
}

/**
 *  ANIMATIONS
 */

/**ANIMATION CONTROL VARIABLES */
var lastUpdateTime;
var movingCamera = false;

function animateCamera() {
  if (movingCamera) {
    var currentTime = (new Date).getTime();
    var end = true;
    if (lastUpdateTime) {
      var delta = (10 * (currentTime - lastUpdateTime)) / 1000.0;
      //update the x coordinate
      if (Math.abs(cameraGamePosition[0] - cameraPosition[0]) < delta) {
        cameraPosition[0] = cameraGamePosition[0];
      }
      else {
        end = false;
        let cx = Math.sign(cameraGamePosition[0] - cameraPosition[0]) * delta;
        cameraPosition[0] += cx;
      }
      //update the y coordinate
      if (Math.abs(cameraGamePosition[1] - cameraPosition[1]) < delta) {
        cameraPosition[1] = cameraGamePosition[1];
      }
      else {
        end = false;
        let cy = Math.sign(cameraGamePosition[1] - cameraPosition[1]) * delta;
        cameraPosition[1] += cy;
      }
      //update the z coordinate
      if (Math.abs(cameraGamePosition[2] - cameraPosition[2]) < delta) {
        cameraPosition[2] = cameraGamePosition[2];
      }
      else {
        end = false;
        let cz = Math.sign(cameraGamePosition[2] - cameraPosition[2]) * delta;
        cameraPosition[2] += cz;
      }
    }
    if (!end)
      lastUpdateTime = currentTime;
    else {
      movingCamera = false;
      game = new Game();
      game.start();
      //document.getElementById("start_game").disabled = false; //TODO: Here only to repeat the test, otherwise the game would start.
    }
  }
}

var lastMoleStatus;

function animateMoles() {
  if (!game.isStarted) {
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
        let c;
        if (curMoleStatus[i] > 0) c = 1.0;
        else c = -1.0;
        curLocalPosition = objects[i + 2].localMatrix;
        objects[i + 2].localMatrix = utils.multiplyMatrices(curLocalPosition, utils.MakeTranslateMatrix(0.0, 0.0 + deltaYMole * c, 0.0));
      }
    }
    lastMoleStatus = curMoleStatus;
  }
}

var Ry = 0.0;
var lastHammertatus = true;


function animateHammer(){
  Element = objects[1];
  var currentTime = (new Date).getTime();
  if (lastUpdateTime) {
    var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
  } else {
    deltaC = 1 / 50;
  }
  lastUpdateTime = currentTime;
  g_time += deltaC;

  //NEED TO MAKE IT MOVE UP AND DOWN
  // TODO: create the correct animation
  Element.localMatrix = utils.multiplyMatrices(Element.localMatrix, utils.MakeRotateXMatrix(g_time));
  // Element.localMatrix = utils.multiplyMatrices(Element.localMatrix, utils.MakeRotateXMatrix(-90));
  Element.updateWorldMatrix();
}