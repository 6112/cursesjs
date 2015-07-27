var WEBGL_BUFFER_SIZE = 400;

// return the smallest power of two that is higher than or equal to x.
var power_of_two = function(x) {
  if (x < 0)
    return 0;
  --x;
  x |= x >> 1;
  x |= x >> 2;
  x |= x >> 4;
  x |= x >> 8;
  x |= x >> 16;
  return x + 1;
};

// vertex shader source code
var vert_source = [
'attribute highp vec2 aPosition;',
'attribute highp vec2 aTextureCoord;',
'attribute highp float aBgColor;',
'attribute highp float aFgColor;',
'',
'varying highp vec4 vTextureCoord;',
'varying highp vec3 vBgColor;',
'varying highp vec3 vFgColor;',
'',
'uniform highp mat4 uTexPMatrix;',

'uniform highp mat4 uPMatrix;',
'',
'void main(void) {',
  'gl_Position = uPMatrix * vec4(aPosition, 0, 1);',
  'vTextureCoord = uTexPMatrix * vec4(aTextureCoord, 0, 1);',
  'vBgColor = vec3(floor(aBgColor / 65536.0) / 256.0,',
                  'floor(mod(aBgColor / 256.0, 256.0)) / 256.0,',
                  'mod(aBgColor, 256.0) / 256.0);',
  'vFgColor = vec3(floor(aFgColor / 65536.0) / 256.0,',
                  'floor(mod(aFgColor / 256.0, 256.0)) / 256.0,',
                  'mod(aFgColor, 256.0) / 256.0);',
'}'
].join('\n');

// fragment shader source code
var frag_source = [
'varying highp vec4 vTextureCoord;',
'varying highp vec3 vBgColor;',
'varying highp vec3 vFgColor;',
'',
'uniform sampler2D uSampler;',
'uniform highp mat4 uPMatrix;',
'',
'void main(void) {',
  'highp vec4 pixel = texture2D(uSampler, vec2(vTextureCoord));',
  'if (pixel.a > 0.0) {',
    'gl_FragColor = vec4(vFgColor, 1);',
  '}',
  'else {',
    'gl_FragColor = vec4(vBgColor, 1);',
  '}',
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
      // throw an "Invalid vertex shader." or "Invalid fragment shader."
      // message.
      throw new Error("Invalid " + (shaders[i].type === gl.VERTEX_SHADER ?
                       "vertex" :
                       "fragment") + " shader.");
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return program;
};

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
  scr.pos_loc = gl.getAttribLocation(program, 'aPosition');
  scr.tex_pos_loc = gl.getAttribLocation(program, 'aTextureCoord');
  scr.bg_loc = gl.getAttribLocation(program, 'aBgColor');
  scr.fg_loc = gl.getAttribLocation(program, 'aFgColor');
  return gl;
};

// update the projection matrix used for the screen's coordinates system.
// in the screen coordinate system, (0,0)  is the top of the character 0,
// (1, 0) is the top of the character 1, (2, 0) is the top of the character 2,
// etc.
var update_projection = function(scr) {
  var projection = new Float32Array([
    2 / scr.width, 0, 0, 0,
    0, -2 / scr.height, 0, 0,
    0, 0, 1, 0,
    -1, 1, 0, 1
  ]);
  var projection_loc = scr.gl.getUniformLocation(scr.program, 'uPMatrix');
  scr.gl.uniformMatrix4fv(projection_loc, false, projection);
};

// update the projection matrix used for the texture's coordinates system.
// in the texture coordinate system, (0,0)  is the top of the character 0,
// (1, 0) is the top of the character 1, (2, 0) is the top of the character 2,
// etc.
var update_tex_projection = function(scr) {
  var tex_projection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    -1, 1, 0, 1
  ]);
  tex_projection[5] = 1 / scr.pot_img.attr('height') * scr.font.char_height;
  tex_projection[0] = 1 / scr.pot_img.attr('width') * scr.font.char_width;
  var tprojection_loc = scr.gl.getUniformLocation(scr.program, 'uTexPMatrix');
  scr.gl.uniformMatrix4fv(tprojection_loc, false, tex_projection);
};

// load a texture from a <canvas> element, and return it
var load_texture = function(gl, canvas, previous_texture) {
  var texture = previous_texture || gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (true || ! previous_texture) {
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
var select_texture = function(gl, program, canvas, previous_texture, dirty) {
  var texture = previous_texture;
  if (dirty)
    texture = load_texture(gl, canvas, previous_texture);
  if (dirty)
    apply_texture(gl, program, texture);
  return texture;
};

// helper function for viewport_push_rect() and texture_push_rect()
var push_rect = function(array, i, y, x, offsets) {
  var k = 0;
  for (; k < 6; k++) {
    array[i + k * 2] = x + offsets[k * 2];
    array[i + k * 2 + 1] = y + offsets[k * 2 + 1];
  }
};

var viewport_offsets = [
  1, 1,
  0, 1,
  1, 0,

  1, 0,
  0, 1,
  0, 0
];
// push a rectangle's vertices to the vertex buffer
var viewport_push_rect = function(scr, offscreen, y, x) {
  push_rect(offscreen.vertices, offscreen.vertice_count, y, x, viewport_offsets);
};

var tex_offsets = [
  1, 1,
  0, 1,
  1, 0,

  1, 0,
  0, 1,
  0, 0
];
// push a rectangle's texture positions to texture position buffer
var tex_push_rect = function(scr, offscreen, y, x) {
  push_rect(offscreen.tex_vertices, offscreen.vertice_count, y, x, tex_offsets);
};

// helper function for push_bg() and push_fg()
var push_color = function(array, i, color) {
  var k = 0;
  for (; k < 6; k++) {
    array[i + k] = color;
  }
};

// push a rectangle's background color to the background buffer
var push_bg = function(scr, offscreen, color) {
  push_color(offscreen.bg, offscreen.vertice_count / 2, color);
};

// push a rectangle's foreground color to the foreground buffer
var push_fg = function(scr, offscreen, color) {
  push_color(offscreen.fg, offscreen.vertice_count / 2, color);
};

// enqueue an image draw for later. if the vertex buffer is full, execute the
// draw with flush_draw().
var draw_image = function(scr, offscreen, y, x, sy, sx, fg, bg) {
  // push a rectangle & its colors onto the buffer
  viewport_push_rect(scr, offscreen, y, x);
  tex_push_rect(scr, offscreen, sy, sx);
  push_bg(scr, offscreen, bg);
  push_fg(scr, offscreen, fg);
  offscreen.vertice_count += 12;
  // flush the buffers (draw on-screen) if the buffers are full
  if (offscreen.vertice_count >= 6 * 2 * WEBGL_BUFFER_SIZE) {
    flush_draw(scr, offscreen);
  }
};

// flush the vertex buffer and draw the enqueued characters on-screen.
var flush_draw = function(scr, offscreen) {
  // skip if nothing to draw
  if (offscreen.vertice_count === 0)
    return;
  // load texture if necessary
  var canvas = offscreen[0];
  offscreen.texture = select_texture(scr.gl, scr.program, canvas,
                                     offscreen.texture, offscreen.dirty);
  offscreen.dirty = false;
  var gl = scr.gl;
  // set vertex position
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, offscreen.vertices, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(scr.pos_loc);
  gl.vertexAttribPointer(scr.pos_loc, 2, gl.FLOAT, false, 0, 0);
  // set texture position
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, offscreen.tex_vertices, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(scr.tex_pos_loc);
  gl.vertexAttribPointer(scr.tex_pos_loc, 2, gl.FLOAT, false, 0, 0);
  // set background color
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, offscreen.bg, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(scr.bg_loc);
  gl.vertexAttribPointer(scr.bg_loc, 1, gl.FLOAT, false, 0, 0);
  // set foreground color
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, offscreen.fg, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(scr.fg_loc);
  gl.vertexAttribPointer(scr.fg_loc, 1, gl.FLOAT, false, 0, 0);
  // do draw
  scr.gl.drawArrays(scr.gl.TRIANGLES, 0, Math.floor(offscreen.vertice_count / 2));
  offscreen.vertice_count = 0;
};
