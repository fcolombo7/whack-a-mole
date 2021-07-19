#version 300 es

precision mediump float;

in vec2 fs_uv;
in vec3 fs_position;
in vec3 fs_normal;
in vec4 fs_vertex_relative_to_light;

out vec4 outColor;

uniform sampler2D u_color_texture;
uniform sampler2D u_depth_texture;

uniform float u_useShadow;
uniform float u_tolerance;
/* LIGHT MODEL */
uniform vec3 u_cameraPosition;
uniform vec3 u_pointLightPosition;      
uniform vec3 u_pointLightColor;        
uniform float u_pointLightTarget;
uniform float u_pointLightDecay;
uniform vec3 u_ambientLight;
uniform float u_shininess;


//-------------------------------------------------------------------------
// Determine if this fragment is in a shadow. Returns true or false.
bool in_shadow(void) {

  // The vertex location rendered from the light source is almost in Normalized
  // Device Coordinates (NDC), but the perspective division has not been
  // performed yet. Perform the perspective divide. The (x,y,z) vertex location
  // components are now each in the range [-1.0,+1.0].
  vec3 vertex_relative_to_light = fs_vertex_relative_to_light.xyz / fs_vertex_relative_to_light.w;

  // Convert the the values from Normalized Device Coordinates (range [-1.0,+1.0])
  // to the range [0.0,1.0]. This mapping is done by scaling
  // the values by 0.5, which gives values in the range [-0.5,+0.5] and then
  // shifting the values by +0.5.
  vertex_relative_to_light = vertex_relative_to_light * 0.5 + 0.5;

  // Get the z value of this fragment in relationship to the light source.
  // This value was stored in the shadow map (depth buffer of the frame buffer)
  // which was passed to the shader as a texture map.
  vec4 shadowmap_color = texture(u_depth_texture, vertex_relative_to_light.xy);

  // The texture map contains a single depth value for each pixel. However,
  // the texture2D sampler always returns a color from a texture. For a
  // gl.DEPTH_COMPONENT texture, the color contains the depth value in
  // each of the color components. If the value was d, then the color returned
  // is (d,d,d,1). This is a "color" (depth) value between [0.0,+1.0].
  float shadowmap_distance = shadowmap_color.r;

  // Test the distance between this fragment and the light source as
  // calculated using the shadowmap transformation (vertex_relative_to_light.z) and
  // the smallest distance between the closest fragment to the light source
  // for this location, as stored in the shadowmap. When the closest
  // distance to the light source was saved in the shadowmap, some
  // precision was lost. Therefore we need a small tolerance factor to
  // compensate for the lost precision.
  if ( vertex_relative_to_light.z <= shadowmap_distance + u_tolerance ) {
    // This surface receives full light because it is the closest surface
    // to the light.
    return false;
  } else {
    // This surface is in a shadow because there is a closer surface to
    // the light source.
    return true;
  }
}

void main() {
  vec4 texelColor = texture(u_color_texture, fs_uv);
  if(u_useShadow > 0.0){
    if(in_shadow()){
        outColor = vec4(clamp(texelColor.rgb * u_ambientLight, 0.0, 1.0), 1.0);
        return;
    }
  }
  
  vec3 lightColor = u_pointLightColor * pow(u_pointLightTarget / length(u_pointLightPosition - fs_position), u_pointLightDecay);
  vec3 nNormal = normalize(fs_normal);
  vec3 lightDirNorm = normalize(u_pointLightPosition - fs_position);

  // reflection vector
  vec3 reflection = 2.0 * dot(nNormal, lightDirNorm) * nNormal - lightDirNorm;
  vec3 cameraDirNorm = normalize(u_cameraPosition - fs_position);
  float cosAngle = pow(clamp(dot(reflection, cameraDirNorm), 0.0, 1.0), u_shininess);
  vec3 specular_color = vec3(0.0, 0.0, 0.0);
  float factor = 1.0;
  if (cosAngle > 0.0){
      specular_color = u_pointLightColor * cosAngle;
      factor = 1.0 - cosAngle; 
  }

  vec3 overall_colour = texelColor.rgb * (u_ambientLight + factor * (lightColor * dot(lightDirNorm, nNormal))) + specular_color;
  
  outColor = vec4(clamp(overall_colour, 0.0, 1.0), 1.0);
}