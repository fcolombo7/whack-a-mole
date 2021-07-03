var gl;
var baseDir;
var shaderDir;
var assetDir;
var program;
var meshes;



//example taken from webGLTutorial2
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



function main() {

  //LIGHT DEFINITION
  var dirLightAlpha = -utils.degToRad(-60);
  var dirLightBeta = -utils.degToRad(120);
  var directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
  Math.sin(dirLightAlpha), Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)];
  var directionalLightColor = [0.8, 1.0, 1.0];

  //FIXME: check this line
  //var numIdx = initSphere();

  //SET Global states (viewport size, viewport background color, Depth test)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.85, 0.85, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  var positionAttributeLocation = gl.getAttribLocation(program, "inPosition");
  var normalAttributeLocation = gl.getAttribLocation(program, "inNormal");
  var matrixLocation = gl.getUniformLocation(program, "matrix");
  var materialDiffColorHandle = gl.getUniformLocation(program, 'mDiffColor');
  var lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  var lightColorHandle = gl.getUniformLocation(program, 'lightColor');
  var normalMatrixPositionHandle = gl.getUniformLocation(program, 'nMatrix');
  
  //Define a data structure containing all the VAO (one for each type of obj)
  var vao_arr = [];
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

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
    vao_arr.push(vao);
  });

  //Definition of the scene Graph
  var objects = [];

  var cabinetSpace = new Node();
  cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 90, 0, 0, 2.5);
  var moleSpace = new Node();
  moleSpace.localMatrix = utils.MakeTranslateMatrix(0, 1, 0.2);
  
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

  //FIXME: Up to now only one mole node for testing purposes.1
  var moleNode = new Node();
  //moleNode.localMatrix = utils.MakeTranslateMatrix(0, 1, 0.2);
  moleNode.drawInfo = {
    materialColor: [0.6, 0.6, 0.6],
    programInfo: program,
    bufferLength: meshes[2].indices.length,
    vertexArray: vao_arr[2],
  };

  cabinetNode.setParent(cabinetSpace);
  hammerNode.setParent(cabinetSpace);
  moleSpace.setParent(cabinetSpace);
  moleNode.setParent(moleSpace);
  
  var objects = [
    cabinetNode,
    hammerNode,
    moleNode,
  ];

  //End of the definition of the SceneGraph

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene(time) {
    time *= 0.001;

    gl.clearColor(0.85, 0.85, 0.85, 1.0); //TODO: what is it used for?
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compute the projection matrix
    var aspect = gl.canvas.width / gl.canvas.height;
    var projectionMatrix = utils.MakePerspective(60.0, aspect, 1.0, 2000.0);

    // Compute the camera matrix using look at.
    var cameraPosition = [10.0, -10.0, 7.0];
    var target = [0.0, 0.0, 0.0];
    var up = [0.0, 0.0, 1.0];
    var cameraMatrix = utils.LookAt(cameraPosition, target, up);
    var viewMatrix = utils.invertMatrix(cameraMatrix);

    var viewProjectionMatrix = utils.multiplyMatrices(projectionMatrix, viewMatrix);

    // update the local matrices for each object.
    /*
    earthOrbitNode.localMatrix = utils.multiplyMatrices(utils.MakeRotateYMatrix(0.3), earthOrbitNode.localMatrix);
    moonOrbitNode.localMatrix = utils.multiplyMatrices(utils.MakeRotateYMatrix(0.6), moonOrbitNode.localMatrix);
    sunNode.localMatrix = utils.multiplyMatrices(utils.MakeRotateYMatrix(0.05), sunNode.localMatrix);
    earthNode.localMatrix = utils.multiplyMatrices(utils.MakeRotateYMatrix(0.5), earthNode.localMatrix);
    moonNode.localMatrix = utils.multiplyMatrices(utils.MakeRotateYMatrix(-0.1), moonNode.localMatrix);
    */

    // Update all world matrices in the scene graph
    cabinetSpace.updateWorldMatrix();

    // Compute all the matrices for rendering
    objects.forEach(function (object) {

      gl.useProgram(object.drawInfo.programInfo);

      var projectionMatrix = utils.multiplyMatrices(viewProjectionMatrix, object.worldMatrix);
      var normalMatrix = utils.invertMatrix(utils.transposeMatrix(object.worldMatrix));

      gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
      gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

      gl.uniform3fv(materialDiffColorHandle, object.drawInfo.materialColor);
      gl.uniform3fv(lightColorHandle, directionalLightColor);
      gl.uniform3fv(lightDirectionHandle, directionalLight);

      gl.bindVertexArray(object.drawInfo.vertexArray);
      gl.drawElements(gl.TRIANGLES, object.drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0);
    });

    requestAnimationFrame(drawScene);
  }
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

  //load the meshes from file
  const src_objects = ['cabinet.obj', 'hammer.obj', 'mole.obj'];
  meshes = [];
  for(const src of src_objects){
    var objStr = await utils.get_objstr(assetDir + src);
    meshes.push(new OBJ.Mesh(objStr));
  }

  //TODO: also the texture here?

  gl.useProgram(program); //FIXME: WHY HERE?

  main();
}

window.onload = init();