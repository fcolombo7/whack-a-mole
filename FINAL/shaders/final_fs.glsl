#version 300 es

precision mediump float;

in vec2 fs_uv;
in vec3 fs_position;
in vec3 fs_normal;

out vec4 outColor;

uniform sampler2D u_color_texture;

/* LIGHT MODEL */
uniform vec3 u_cameraPosition;
uniform vec3 u_pointLightPosition;      
uniform vec3 u_pointLightColor;        
uniform float u_pointLightTarget;
uniform float u_pointLightDecay;

uniform vec3 u_directLightDirection;
uniform vec3 u_directLightColor;

uniform vec3 u_ambientLight;

uniform float u_shininess;


void main() {
  vec4 texelColor = texture(u_color_texture, fs_uv);
  vec3 directLightDirNorm = normalize(u_directLightDirection);
  vec3 nNormal = normalize(fs_normal);
  
  //DIFFUSE
  // POINT LIGHT
  vec3 lightColor = u_pointLightColor * pow(u_pointLightTarget / length(u_pointLightPosition - fs_position), u_pointLightDecay);
  vec3 lightDirNorm = normalize(u_pointLightPosition - fs_position);
  vec3 point_diffuse = texelColor.rgb * (lightColor * dot(lightDirNorm, nNormal));
  // DIRECT LIGHT
  vec3 direct_diffuse = texelColor.rgb * u_directLightColor * max(0.0, dot(-directLightDirNorm, nNormal));
  
  vec3 diffuse = point_diffuse + direct_diffuse;
  
  // SPECULAR
  vec3 specular_base_color = vec3(0.9, 0.9, 0.9);
  vec3 cameraDirNorm = normalize(u_cameraPosition - fs_position);
  // POINT
  float point_normalDotLight = max(0.0, dot(nNormal, lightDirNorm));
  vec3 point_halfVec = normalize(lightDirNorm + cameraDirNorm); 
  vec3 point_spec_color = specular_base_color * max(sign(point_normalDotLight), 0.0);
  vec3 pointBlinn =  point_spec_color * pow(max(dot(nNormal, point_halfVec), 0.0), u_shininess);
  
  //DIRECT LIGHT
  float direct_normalDotLight = max(0.0, dot(nNormal, -directLightDirNorm));
  vec3 direct_halfVec = normalize(-directLightDirNorm + cameraDirNorm);
  vec3 direct_spec_color = specular_base_color * max(sign(direct_normalDotLight), 0.0);
  vec3 directBlinn =  direct_spec_color * pow(max(dot(nNormal, direct_halfVec), 0.0), u_shininess);
  
  vec3 specular = pointBlinn + directBlinn;

  //AMBIENT
  vec3 ambient = texelColor.rgb * u_ambientLight; 
  
  vec3 overall_colour = ambient + diffuse + specular;
  outColor = vec4(clamp(overall_colour, 0.0, 1.0), 1.0);
}