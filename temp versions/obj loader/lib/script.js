var vs = `#version 300 es

in vec3 inPosition;
in vec3 inNormal;
out vec3 fsNormal;

uniform mat4 matrix; 
uniform mat4 nMatrix;     //matrix to transform normals

void main() {
  fsNormal = mat3(nMatrix) * inNormal; 
  gl_Position = matrix * vec4(inPosition, 1.0);
}`;

var fs = `#version 300 es

precision mediump float;

in vec3 fsNormal;
out vec4 outColor;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

void main() {

  vec3 nNormal = normalize(fsNormal);
  vec3 lambertColor = mDiffColor * lightColor * dot(-lightDirection,nNormal);
  outColor = vec4(clamp(lambertColor, 0.0, 1.0),1.0);
}`;

var gl;
var mesh = new Array();
var assets = new Array();
var vao = new Array();


function main() {

  var program = null;

  var cubeNormalMatrix;
  var WorldMatrix = new Array();    //One world matrix for each cube...

  //define directional light
  var dirLightAlpha = -utils.degToRad(60);
  var dirLightBeta  = -utils.degToRad(120);

  var directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
              Math.sin(dirLightAlpha),
              Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
              ];
  var directionalLightColor = [0.1, 1.0, 1.0];

  //Define material color
  var cubeMaterialColor = [0.5, 0.5, 0.5];
  var lastUpdateTime = (new Date).getTime();

  var cubeRx = 0.0;
  var cubeRy = 0.0;
  var cubeRz = 0.0;

  // Definition of the array containing the worldMatrixes of every object
  for (i = 0; i < assets.length; i++) {
    WorldMatrix[i] = utils.MakeWorld(-2 * i + 4, 0.0, -1.5, 0.0, 0.0, 0.0, 0.5);
  }
  console.log(WorldMatrix);

  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.85, 0.85, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, vs);
  var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, fs);
  var program = utils.createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  var positionAttributeLocation = gl.getAttribLocation(program, "inPosition");  
  var normalAttributeLocation = gl.getAttribLocation(program, "inNormal");  
  var matrixLocation = gl.getUniformLocation(program, "matrix");
  var materialDiffColorHandle = gl.getUniformLocation(program, 'mDiffColor');
  var lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  var lightColorHandle = gl.getUniformLocation(program, 'lightColor');
  var normalMatrixPositionHandle = gl.getUniformLocation(program, 'nMatrix');
  
  var perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width/gl.canvas.height, 0.1, 100.0);
  var viewMatrix = utils.MakeView(3.0, 3.0, 2.5, -45.0, -40.0);
    
  // Creates a VAO for each object and it's respective buffers 
  for (i = 0; i < assets.length; i++) {
    vertices = mesh[i].vertices;
    uv = mesh[i].textures;
    indices = mesh[i].indices;
    normals = mesh[i].vertexNormals;
    nIdx = indices.length;
    // console.log(indices.length);
    // console.log(mesh[i])

    vao[i] = gl.createVertexArray();
    gl.bindVertexArray(vao[i]);
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(normalAttributeLocation);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    var ind = new Uint16Array(indices);
    // console.log(ind)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ind, gl.STATIC_DRAW);
  }
      
  drawScene();

  function animate(){
    var currentTime = (new Date).getTime();
    if(lastUpdateTime){
      var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
      cubeRx += deltaC;
      cubeRy -= deltaC;
      cubeRz += deltaC;
    }

    WorldMatrix[3] = utils.MakeWorld( 0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);
    cubeNormalMatrix = utils.invertMatrix(utils.transposeMatrix(WorldMatrix[3]));
    lastUpdateTime = currentTime;               
  }

  function drawScene() {
    // animate();

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for(i = 0; i < assets.length; i++){
      var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, WorldMatrix[i]);
      var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);
      gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
      
      // if (i < 3) gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(cubeWorldMatrix[i]));
      // else gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(cubeNormalMatrix));

      gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(WorldMatrix[i]));

      gl.uniform3fv(materialDiffColorHandle, cubeMaterialColor);
      gl.uniform3fv(lightColorHandle,  directionalLightColor);
      gl.uniform3fv(lightDirectionHandle,  directionalLight);

      gl.bindVertexArray(vao[i]);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0 );
    }
    
    window.requestAnimationFrame(drawScene);
  }

}

async function init(){
  var path = window.location.pathname;
  var page = path.split("/").pop();
  baseDir = window.location.href.replace(page, '');
  assetDir = baseDir+"asset/";

  var canvas = document.getElementById("c");
  gl = canvas.getContext("webgl2");
  if (!gl) {
      document.write("GL context not opened");
      return;
  }

  /* LOAD THE MESHES */
  assets.push(assetDir + 'cabinet.obj');
  assets.push(assetDir + 'hammer.obj');
  for (i = 0; i < 5; i++) {
    assets.push(assetDir + 'mole.obj');
  }

  for (i = 0; i < assets.length; i++) {
    var objStr = await utils.get_objstr(assets[i]);
    mesh[i] = new OBJ.Mesh(objStr);
  } 
  
  main();
}

window.onload = init;