// vertex shader source code
var vert_source = [
'attribute highp vec2 aPosition;',
'attribute highp vec2 aTextureCoord;',
'',
'varying highp vec4 vTextureCoord;',
'',
'uniform highp mat4 uTexMVMatrix;',
'uniform highp mat4 uTexPMatrix;',  
'uniform highp mat4 uMVMatrix;',
'uniform highp mat4 uPMatrix;',
'',
'void main(void) {',
  'gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 0, 1);',
  'vTextureCoord = uTexPMatrix * uTexMVMatrix * vec4(aTextureCoord, 0, 1);',
'}'
].join('\n');

// fragment shader source code
var frag_source = [
'varying highp vec4 vTextureCoord;',
'',
'uniform sampler2D uSampler;',
'uniform highp mat4 uTexMVMatrix;',  
'uniform highp mat4 uPMatrix;', 
'',
'void main(void) {',
  'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord));',
'}'
].join('\n');

// create a shader from its source code, and return it.
var make_shader = function(gl, source, type) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
};

// create a shader program, loading the given shaders.
var make_program = function(gl, shaders) {
  var program = gl.createProgram();
  var i = 0, shader;
  for (; i < shaders.length; i++) {
    shader = make_shader(gl, shaders[i].source, shaders[i].type);
    if (! shader) {
      console.log(shaders[i].source);
      throw new Error("Invalid shader.");
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return program;
};

var square = new Float32Array([
  1, 1,
  0, 1,
  1, 0,
  0, 0
]);

// get and return the webgl context for the canvas, and return it.
// return null if webgl is not supported.
var init_gl = function(scr) {
  var opts = { preserveDrawingBuffer: true };
  var gl = scr.canvas[0].getContext('webgl', opts) ||
      scr.canvas[0].getContext('experimental-webgl', opts);
  if (! gl)
    return null;
  scr.gl = gl;
  var program = scr.program = make_program(gl, [
    { source: vert_source, type: gl.VERTEX_SHADER },
    { source: frag_source, type: gl.FRAGMENT_SHADER }
  ]);
  gl.useProgram(program);
  // set the location
  var buffer = gl.createBuffer();
  scr.buffer = buffer;
  scr.pos_loc = gl.getAttribLocation(scr.program, 'aPosition');
  scr.tex_pos_loc = gl.getAttribLocation(program, 'aTextureCoord');
  scr.mv_loc = gl.getUniformLocation(scr.program, 'uMVMatrix');
  scr.tmv_loc = gl.getUniformLocation(scr.program, 'uTexMVMatrix');
  return gl;
};

// model/view matrix
var model_view = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]);

// set the position inside the model/view matrix
var model_view_pos = function(scr, y, x) {
  model_view[13] = y;
  model_view[12] = x;
  scr.gl.uniformMatrix4fv(scr.mv_loc, false, model_view);
};

// model/view matrix for inside the texture
var tex_model_view = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]);

// set the position inside the texture's model/view matrix
var tex_model_view_pos = function(scr, y, x) {
  tex_model_view[13] = 0;
  tex_model_view[12] = x;
  scr.gl.uniformMatrix4fv(scr.tmv_loc, false, tex_model_view);
};

// projection matrix
var projection = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  -1, 1, 0, 1
]);

// update the projection matrix to match the new font
var update_projection = function(scr) {
  projection[5] = - 2 / scr.height;
  projection[0] = 2 / scr.width;
  var projection_loc = scr.gl.getUniformLocation(scr.program, 'uPMatrix');
  scr.gl.uniformMatrix4fv(projection_loc, false, projection);
};

var tex_projection = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  -1, 1, 0, 1
]);

var update_tex_projection = function(scr) {
  // TODO: handle other widths
  tex_projection[5] = -1;
  tex_projection[0] = 1 / 2048 * scr.font.char_width;
  var tprojection_loc = scr.gl.getUniformLocation(scr.program, 'uTexPMatrix');
  scr.gl.uniformMatrix4fv(tprojection_loc, false, tex_projection);
};

// load a texture from a <canvas> element, and return it
var load_texture = function(gl, canvas, previous_texture) {
  var texture = previous_texture || gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (! previous_texture) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  }
  else {
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
};

// select the given texture as the active texture for the GL context.
var apply_texture = function(gl, program, texture) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  var sampler_loc = gl.getUniformLocation(program, 'uSampler');
  gl.uniform1i(sampler_loc, 0);
};

// load and apply the texture to the given GL context.
// return the texture.
var select_texture = function(gl, program, canvas, previous_texture) {
  var texture = load_texture(gl, canvas, previous_texture);
  apply_texture(gl, program, texture);
  return texture;
};

var i = 0;

var sq = new Float32Array(5 * 960);

var vp_pos = function(scr, y, x) {
  var k = i * 12;
  sq[k + 0] = x + 1;
  sq[k + 1] = y + 1;
  sq[k + 2] = x;
  sq[k + 3] = y + 1;
  sq[k + 4] = x + 1;
  sq[k + 5] = y;
  sq[k + 6] = x + 1;
  sq[k + 7] = y;
  sq[k + 8] = x;
  sq[k + 9] = y + 1;
  sq[k + 10] = x;
  sq[k + 11] = y;
};

var tex_sq = new Float32Array(5 * 960);

var tex_pos = function(scr, y, x) {
  var k = i * 12;
  tex_sq[k + 0] = x + 1;
  tex_sq[k + 1] = y;
  tex_sq[k + 2] = x;
  tex_sq[k + 3] = y;
  tex_sq[k + 4] = x + 1;
  tex_sq[k + 5] = y + 1;
  tex_sq[k + 6] = x + 1;
  tex_sq[k + 7] = y + 1;
  tex_sq[k + 8] = x;
  tex_sq[k + 9] = y;
  tex_sq[k + 10] = x;
  tex_sq[k + 11] = y + 1;
};

var draw_image = function(scr, canvas, y, x, sy, sx, is_fresh) {
  if (! scr.texture || (is_fresh)) {
    if (! scr.texture) {
      model_view_pos(scr, 0, 0);
      tex_model_view_pos(scr, 0, 0);
    }
    scr.texture = select_texture(scr.gl, scr.program, canvas, scr.texture);
  }
  vp_pos(scr, y, x);
  tex_pos(scr, sy, sx);
  i++;
  if (i % 400 === 0) {
    var gl = scr.gl;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, sq, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(scr.pos_loc);
    gl.vertexAttribPointer(scr.pos_loc, 2, gl.FLOAT, false, 0, 0);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, scr.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, tex_sq, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(scr.tex_pos_loc);
    gl.vertexAttribPointer(scr.tex_pos_loc, 2, gl.FLOAT, false, 0, 0);
    scr.gl.drawArrays(scr.gl.TRIANGLES, 0, 6 * i);
    i = 0;
  }
};
