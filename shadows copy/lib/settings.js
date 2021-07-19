var settings = {
    /** directories */
    baseDir:null,
    shaderDir:null,
    assetDir:null,
    /** variables  */
    scaleFactor: 2.5,
    envIdx: "02",

    /** camera parameters */
    cameraGamePosition: [0.0, 7.0, 4.0], 
    cameraPosition: [0.0, 10.0, 20.0],
    target: [0.0, 0.8 * 2.5, 0.0], //2.5 is te scale factor 
    //the target is not the origin but the point of the cabinet where the moles jump. 
    up: [0.0, 1.0, 0.0],

    /** object positions */
    moleSpacePosition: [0, 1.1, 0.2],
    hammerStartingPosition: [-1.5, 1.4, 1.3],
    molesStartingPositions: [
        [-0.63523, 0, 0],
        [0, 0, 0],
        [0.6353, 0, 0],
        [-0.31763, -0.1, 0.4429],
        [0.31763, -0.1, 0.4429]
    ],

    /** lights */
    dirLightTheta: 30,
    dirLightPhi: 60,
    directionalLightColor: [0.8, 0.8, 0.8],
    posLight: [-1.0, 7.0, 10.0],
    fieldOfView: 120,
    ambientLight: [0.4, 0.4, 0.4],

    /** background */
    backgroundColor: [0.8, 0.8, 0.8, 1.0],

    useEnvironment:false,
}

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

var settingObj = function (max, positiveOnly, value){
  this.id = null;
  this.max=max;
  this.positiveOnly=positiveOnly;
  this.value=value;
  this.locked = false;
}

settingObj.prototype.init = function(id){
  this.id = id;
  document.getElementById(id+'_value').innerHTML=this.value.toFixed(2);
  document.getElementById(id+'_slider').value = document.getElementById(id+'_slider').max * this.value/this.max; 
}

settingObj.prototype.onSliderInput = function(slider_norm_value){
  this.value = slider_norm_value * this.max;
  document.getElementById(this.id+'_value').innerHTML=this.value.toFixed(2); 
}

settingObj.prototype.lock= function(){
  this.locked = true;
  document.getElementById(this.id+'_value').innerHTML=" -";
  document.getElementById(this.id+'_slider').disabled=true;
}

const gui_settings = {
  'cameraX': new settingObj(50, false, settings.cameraPosition[0]),
  'cameraY': new settingObj(50, false, settings.cameraPosition[1]),
  'cameraZ': new settingObj(50, false, settings.cameraPosition[2]),
  'posX': new settingObj(50, false, settings.posLight[0]),
  'posY': new settingObj(50, false, settings.posLight[1]),
  'posZ': new settingObj(50, false, settings.posLight[2]),
  'lightTheta': new settingObj(180, true, settings.dirLightTheta),
  'lightPhi': new settingObj(180, false, settings.dirLightPhi),
  'fieldOfView': new settingObj(180, true, settings.fieldOfView),
  'ambientLight': new settingObj(1, true, settings.ambientLight[0]),
}

function setDefaultSettings(){
  for(const [key, value] of Object.entries(gui_settings)){
    value.init(key);
  }
}