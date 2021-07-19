#version 300 es

precision mediump float;

in vec2 fsUV;
in vec3 fsNormal;
in vec3 fsPosition;

out vec4 outColor;

uniform sampler2D u_texture;

uniform vec3 pointLightPosition;      
uniform vec3 pointLightColor;        
uniform float pointLightTarget;
uniform float pointLightDecay;               
uniform vec3 ambientLight;

void main() {
  vec4 texelColor = texture(u_texture, fsUV);
  
  vec3 lightColor = pointLightColor * pow(pointLightTarget / length(pointLightPosition - fsPosition), pointLightDecay);
  vec3 nNormal = normalize(fsNormal);
  vec3 lightDirNorm = normalize(pointLightPosition - fsPosition);
  vec3 lambertColour = texelColor.rgb * (ambientLight + lightColor * dot(lightDirNorm, nNormal));

  //vec3 lambertTextureColor = texelColor.rgb * (ambientLight + lightColor * dot(-lightDirection, nNormal));
  
  outColor = vec4(clamp(lambertColour, 0.0, 1.0), 1.0);
}