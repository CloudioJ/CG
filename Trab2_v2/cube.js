"use strict";

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // creates buffers with position, normal, texcoord, and vertex color
  // data for primitives by calling gl.createBuffer, gl.bindBuffer,
  // and gl.bufferData
  const cubeBufferInfo   = primitives.createCubeWithVertexColorsBufferInfo(gl, 20);
  
  // setup GLSL program
  var programInfo = webglUtils.createProgramInfo(gl, ["cube_vs", "cube_fs"]);

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var fieldOfViewRadians = degToRad(60);

  // Uniforms for each object.
  var cubeUniforms = {
    u_colorMult: [1, 0.5, 0.5, 1],
    u_matrix: m4.identity(),
  };

  var cubePositions = [
    [10, -30, 100],
    [-110, 0, -90],
    [160, 50, -400],
    [80, -70, -600],
    [200, -20, -140],
    [-80, -50, -400],
]

function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation, scale) {
  var matrix = m4.identity();
  matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
  matrix = m4.xRotate(matrix, xRotation);
  matrix = m4.yRotate(matrix, yRotation);
  matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);
  return m4.multiply(viewProjectionMatrix, matrix);
}

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene(time) {
    time *= 0.0005;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // const fov = degToRad(0);
    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
        m4.perspective(fov, aspect, 0.1, 2000);

    // var cameraMatrix = m4.lookAt(
    //     cameraPosition,
    //     target,
    //     up,
    // )
    var invertedCamera = m4.inverse(camera);

    // var multipliedCamera = m4.multiply(
    //     invertedCamera,
    // )
    var viewProjectionMatrix = m4.multiply(
        projectionMatrix,
        invertedCamera
    )

    // var viewProjectionMatrix = m4.multiply(projectionMatrix, view);

    var cubeXRotation   = -time;
    var cubeYRotation   = time;
    var cubeScale = [1, 1, 1];
    // ------ Draw the sphere --------

    gl.useProgram(programInfo.program);

    // ------ Draw the cube --------

    // Setup all the needed attributes.
    webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);

    for(const position of cubePositions) {
        cubeUniforms.u_matrix = computeMatrix(
            viewProjectionMatrix,
            position,
            cubeXRotation,
            cubeYRotation,
            cubeScale
        );

        // Set the uniforms we just computed
        webglUtils.setUniforms(programInfo, cubeUniforms);

        gl.drawArrays(gl.TRIANGLES, 0, cubeBufferInfo.numElements);
    }

    // ------ Draw the cone --------

    requestAnimationFrame(drawScene);
  }
}

main();
