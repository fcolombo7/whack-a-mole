#version 300 es

precision mediump float;

in vec2 fsUV;
in vec3 fsNormal;

out vec4 outColor;

uniform sampler2D u_texture;

uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 
uniform vec3 ambientLight;

void main() {
  vec4 texelColor = texture(u_texture, fsUV);

  vec3 nNormal = normalize(fsNormal);
  vec3 lambertTextureColor = texelColor.rgb * (ambientLight + lightColor * dot(-lightDirection, nNormal));
  
  outColor = vec4(clamp(lambertTextureColor, 0.0, 1.0), 1.0);
}