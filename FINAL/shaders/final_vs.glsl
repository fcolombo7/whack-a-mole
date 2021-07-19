#version 300 es

precision mediump int;
precision highp float;

in vec3 in_position;
in vec3 in_normal;
in vec2 in_uv;

out vec2 fs_uv;
out vec3 fs_position;
out vec3 fs_normal;

uniform mat4 u_vwpMatrix; 
uniform mat4 u_nMatrix;     //matrix to transform normals
uniform mat4 u_pMatrix;     //matrix to transform positions

void main() {
  fs_uv = in_uv;
  fs_normal = mat3(u_nMatrix) * in_normal; 
  fs_position = (u_pMatrix*vec4(in_position, 1.0)).xyz;

  gl_Position = u_vwpMatrix * vec4(in_position, 1.0);
}