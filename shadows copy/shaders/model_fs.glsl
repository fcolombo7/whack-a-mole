#version 300 es

precision highp float;
// Passed in from the vertex shader.
in vec2 fs_texcoord;
in vec4 fs_projectedTexcoord;
in vec3 fs_normal;

uniform vec3 u_ambientLight;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform float u_bias;
uniform vec3 u_lightDirection;

out vec4 outColor;

void main() {
  vec3 normal = normalize(fs_normal);
 
  float light = dot(normal, -u_lightDirection);
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
      texColor.rgb * (u_ambientLight + light * shadowLight),
      texColor.a);
}