#version 300 es

in vec3 inPosition;
in vec3 inNormal;
in vec2 inUV;

out vec2 fsUV;
out vec3 fsPosition;
out vec3 fsNormal;

uniform mat4 matrix; 
uniform mat4 nMatrix;     //matrix to transform normals
uniform mat4 pMatrix;     //matrix to transform positions

void main() {
  fsUV = inUV;
  fsNormal = mat3(nMatrix) * inNormal; 
  fsPosition = (pMatrix*vec4(inPosition, 1.0)).xyz;
  gl_Position = matrix * vec4(inPosition, 1.0);
}