#version 300 es

in vec3 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

uniform vec3 u_lightWorldPosition;
uniform vec3 u_viewWorldPosition;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;  //matrix to transform positions
uniform mat4 u_nMatrix; //matrix to transfor normal
uniform mat4 u_textureMatrix;

out vec2 fs_texcoord;
out vec4 fs_projectedTexcoord;
out vec3 fs_normal;

out vec3 fs_surfaceToLight;
out vec3 fs_surfaceToView;

out vec3 fs_pos;

void main() {
  // Multiply the position by the matrix.
  vec4 worldPosition = u_world * vec4(a_position, 1.0);

  gl_Position = u_projection * u_view * worldPosition;

  // Pass the texture coord to the fragment shader.
  fs_texcoord = a_texcoord;

  fs_projectedTexcoord = u_textureMatrix * worldPosition;

  // orient the normals and pass to the fragment shader
  fs_normal = mat3(u_nMatrix) * a_normal; //mia modifica

  // compute the world position of the surface
  vec3 surfaceWorldPosition = (u_world * vec4(a_position, 1.0)).xyz;

  // compute the vector of the surface to the light
  // and pass it to the fragment shader
  fs_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;

  // compute the vector of the surface to the view/camera
  // and pass it to the fragment shader
  fs_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
  
  fs_pos = (u_projection * u_view * worldPosition).xyz;
}