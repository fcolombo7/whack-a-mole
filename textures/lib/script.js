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
/** camera parameters */
var cameraPosition = [20.0, -20.0, 20.0];
//var target = [0.0, 0.0, 0.0];
//var up = [0.0, 0.0, 1.0];
var angle = 0.01;
var elevation = 0.01;
var lookRadius = 20.0;

/**directional light */
var directionalLight;
var directionalLightColor;

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


function setViewportAndCanvas(){
  //SET Global states (viewport size, viewport background color, Depth test)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.85, 0.85, 0.85, 1.0); //TODO: background color as variable. 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  //ClearBits();
}

function getAttributesAndUniforms(){
  //objs
  uvAttributeLocation = gl.getAttribLocation(program, "inUV");
  positionAttributeLocation = gl.getAttribLocation(program, "inPosition");
  normalAttributeLocation = gl.getAttribLocation(program, "inNormal");
  matrixLocation = gl.getUniformLocation(program, "matrix");
  lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  lightColorHandle = gl.getUniformLocation(program, 'lightColor');
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

function lightDefinition(){
   //LIGHT DEFINITION
   var dirLightAlpha = -utils.degToRad(30);
   var dirLightBeta = -utils.degToRad(60);
   directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta), Math.sin(dirLightAlpha), Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)];
   directionalLightColor = [0.8, 1.0, 1.0];
}

function sceneGraphDefinition() {
  //Here it is defined the scene graph with all the objects of the scene.
  //the function returns the root of the graph. 

  var cabinetSpace = new Node();
  cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 0, 0, 0, 2.5);
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
  hammerNode.localMatrix = utils.MakeTranslateMatrix(-2, -1, 1);
  hammerNode.drawInfo = {
    materialColor: [0.2, 0.5, 0.8],
    programInfo: program,
    bufferLength: meshes[1].indices.length,
    vertexArray: vao_arr[1],
  };

  var mole1Node = new Node();
  mole1Node.localMatrix = utils.MakeTranslateMatrix(-0.63523, 0, 0);
  mole1Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole2Node = new Node();
  mole2Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole3Node = new Node();
  mole3Node.localMatrix = utils.MakeTranslateMatrix(0.6353, 0, 0);
  mole3Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole4Node = new Node();
  mole4Node.localMatrix = utils.MakeTranslateMatrix(-0.31763, -0.1, 0.4429);
  mole4Node.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  var mole5Node = new Node();
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

function setMatrices(){
  // Compute the projection matrix
  var aspect = gl.canvas.width / gl.canvas.height;
  projectionMatrix = utils.MakePerspective(60.0, aspect, 1.0, 2000.0);

  // Compute the camera matrix using look at.
  //var cameraMatrix = utils.LookAt(cameraPosition, target, up);
  //viewMatrix = utils.invertMatrix(cameraMatrix);

  viewMatrix = utils.MakeView(cameraPosition[0], cameraPosition[1], cameraPosition[2], 0.0, 0.0);
}

function animate() {
  //Here the transformation of each matrix
}

function drawSkybox(){
  gl.useProgram(skyboxProgram);
  
  gl.activeTexture(gl.TEXTURE0+3);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
  gl.uniform1i(skyboxTexHandle, 3);
  
  var viewProjMat = utils.multiplyMatrices(projectionMatrix, viewMatrix);
  inverseViewProjMatrix = utils.invertMatrix(viewProjMat);
  gl.uniformMatrix4fv(inverseViewProjMatrixHandle, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));
  
  gl.bindVertexArray(skyboxVao);
  gl.depthFunc(gl.LEQUAL);
  gl.drawArrays(gl.TRIANGLES, 0, 1*6);
}

function drawScene() {
  gl.clearColor(0.85, 0.85, 0.85, 1.0); //TODO: what is it used for?
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  let cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	let cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	let cy = lookRadius * Math.sin(utils.degToRad(-elevation));
	viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

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

    // Pass to the shader the texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textLocation, 0);

    gl.bindVertexArray(object.drawInfo.vertexArray);
    gl.drawElements(gl.TRIANGLES, object.drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0);
  });

  requestAnimationFrame(drawScene);
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
   canvas.addEventListener("mousedown", doMouseDown, false);
   canvas.addEventListener("mouseup", doMouseUp, false);
   canvas.addEventListener("mousemove", doMouseMove, false);

  main();
}

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
}
function doMouseMove(event) {
	if(mouseState) {
		var dx = event.pageX - lastMouseX;
		var dy = lastMouseY - event.pageY;
		lastMouseX = event.pageX;
		lastMouseY = event.pageY;
		
		if((dx != 0) || (dy != 0)) {
			angle = angle + 0.5 * dx;
			elevation = elevation + 0.5 * dy;
		}
	}
}

window.onload = init();