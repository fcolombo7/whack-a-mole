#version 300 es

precision mediump float;
// Passed in from the vertex shader.
in vec3 fs_pos;

in vec2 fs_texcoord;
in vec4 fs_projectedTexcoord;
in vec3 fs_normal;
in vec3 fs_surfaceToLight;
in vec3 fs_surfaceToView;

uniform vec3 u_lightPos;
uniform vec3 u_ambientLight;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform float u_bias;
uniform float u_shininess;
//uniform vec3 u_lightDirection;
uniform float u_innerLimit;          // in dot space
uniform float u_outerLimit;          // in dot space

out vec4 outColor;

vec3 compLightDir(){
  return normalize(fs_pos - u_lightPos); //TODO: li ho invertiti
}

void main() {
  vec3 normal = normalize(fs_normal);

  vec3 lightDir = compLightDir();

  vec3 surfaceToLightDirection = normalize(fs_surfaceToLight);
  vec3 surfaceToViewDirection = normalize(fs_surfaceToView);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

  float dotFromDirection = dot(surfaceToLightDirection,
                               -lightDir);
  
  float limitRange = u_innerLimit - u_outerLimit;
  
  float inLight = clamp((dotFromDirection - u_outerLimit) / limitRange, 0.0, 1.0);

  float light = inLight * dot(normal, surfaceToLightDirection);
  float specular = inLight * pow(dot(normal, halfVector), u_shininess);

  vec3 projectedTexcoord = fs_projectedTexcoord.xyz / fs_projectedTexcoord.w;
  float currentDepth = projectedTexcoord.z + u_bias;

  bool inRange =
      projectedTexcoord.x >= 0.0 &&
      projectedTexcoord.x <= 1.0 &&
      projectedTexcoord.y >= 0.0 &&
      projectedTexcoord.y <= 1.0;

  // the 'r' channel has the depth values
  float projectedDepth = texture(u_projectedTexture, projectedTexcoord.xy).r;
  float shadowLight = (inRange && projectedDepth <= currentDepth) ? 0.0 : 1.0;

  vec4 texColor = texture(u_texture, fs_texcoord);
  outColor = vec4(
      texColor.rgb * (u_ambientLight + light * shadowLight) +
      specular * shadowLight,
      texColor.a);
}