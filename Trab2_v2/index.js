"use strict";

function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("canvas");
    var gl = canvas.getContext("webgl");
    
    if (!gl) {
        return;
    }

    const img = new Image();
    img.src = "Heightmap.png";

    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = img.width;
    ctx.canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    

    // -------------------------------------- 
    // MAKE THE GROUND

    function getHeight(offset) {
        const v =  imgData.data[offset * 4]; // x4 because RGBA
        return v * 10 / 255; // 0 to 10
    }

        // first generate a grid of triangles, at least 2 or 4 for each cell
        // 
        //    2          4
        // +----+     +----+ 
        // |   /|     |\  /|
        // |  / |     | \/ |
        // | /  |     | /\ |
        // |/   |     |/  \|
        // +----+     +----+ 
        //
    
    const positions = [];
    const texcoords = [];
    const indices = [];

    const cellsAcross = imgData.width - 1;
    const cellsDeep = imgData.height - 1;
    for (let z = 0; z < cellsDeep; ++z) {
    for (let x = 0; x < cellsAcross; ++x) {
        const base0 = z * imgData.width + x;
        const base1 = base0 + imgData.width;

        const h00 = getHeight(base0);       const h01 = getHeight(base0 + 1);
        const h10 = getHeight(base1);
        const h11 = getHeight(base1 + 1);
        const hm = (h00 + h01 + h10 + h11) / 4;

        const x0 = x;
        const x1 = x + 1;
        const z0 = z;
        const z1 = z + 1;

        const ndx = positions.length / 3;
        positions.push(
        x0, h00, z0,
        x1, h01, z0,
        x0, h10, z1,
        x1, h11, z1,
        (x0 + x1) / 2, hm, (z0 + z1) / 2,
        );

        const u0 = x / cellsAcross;
        const v0 = z / cellsDeep;
        const u1 = (x + 1) / cellsAcross;
        const v1 = (z + 1) / cellsDeep;
        texcoords.push(
            u0, v0,
            u1, v0,
            u0, v1,
            u1, v1,
            (u0 + u1) / 2, (v0 + v1) / 2,
        );

        //         
        //      0----1 
        //      |\  /|
        //      | \/4|
        //      | /\ |
        //      |/  \|
        //      2----3 

            indices.push(
            ndx, ndx + 4, ndx + 1,
            ndx, ndx + 2, ndx + 4,
            ndx + 2, ndx + 3, ndx + 4,
            ndx + 1, ndx + 4, ndx + 3,
            );
        }
    }

    const maxAngle = 2 * Math.PI / 180;  // make them facetted
    const arrays = generateNormals({
    position: positions,
    texcoord: texcoords,
    indices,
    }, maxAngle);

    const gProgram = webglUtils.createProgramInfo(gl, ["groundVS", "groundFS"]);

  // make some vertex data
  // calls gl.createBuffer, gl.bindBuffer, gl.bufferData for each array
    const gBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);
    // --------------------------------------
    // creates buffers with position, normal, texcoord, and vertex color
    // data for primitives by calling gl.createBuffer, gl.bindBuffer,
    // and gl.bufferData
    const cubeBufferInfo   = primitives.createCubeWithVertexColorsBufferInfo(gl, 20);
    
    // setup GLSL program
    var programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    var fieldOfViewRadians = degToRad(60);

    // Uniforms for each object.
    var cubeUniforms = {
        u_colorMult: [1, 0.5, 0.5, 1],
        u_matrix: m4.identity(),
    };

    var cubeTranslation   = [0, 0, 0];

    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
        var matrix = m4.translate(viewProjectionMatrix,
            translation[0],
            translation[1],
            translation[2]);
        matrix = m4.xRotate(matrix, xRotation);
        return m4.yRotate(matrix, yRotation);
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
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Compute the projection matrix
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var projectionMatrix =
            m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        // Compute the camera's matrix using look at.
        var cameraPosition = [0, 50, 100];
        var target = [0, 0, 0];
        var up = [0, 1, 0];
        var cameraMatrix = m4.lookAt(cameraPosition, target, up);

        // Make a view matrix from the camera matrix.
        var viewMatrix = m4.inverse(cameraMatrix);

        var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        var cubeXRotation = -time;
        var cubeYRotation = time;

        // ------ Draw the ground --------

        let modelView = m4.yRotate(viewMatrix, 0);
        modelView = m4.translate(modelView, 0, -1, 0)

        gl.useProgram(gProgram.program);
        
        // Setup all the needed attributes.
        
        webglUtils.setBuffersAndAttributes(gl, gProgram, gBufferInfo);
        
        webglUtils.setUniforms(gProgram, {
            projection: projectionMatrix,
            modelView: modelView,
        });
        
        webglUtils.drawBufferInfo(gl, gBufferInfo);
        
        // ------ Draw the cube --------
        
        // Setup all the needed attributes.
        webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);
        
        gl.useProgram(programInfo.program);
        cubeUniforms.u_matrix = computeMatrix(
            viewProjectionMatrix,
            cubeTranslation,
            cubeXRotation,
            cubeYRotation);
            
            // Set the uniforms we just computed
        webglUtils.setUniforms(programInfo, cubeUniforms);
        
        gl.drawArrays(gl.TRIANGLES, 0, cubeBufferInfo.numElements);
        
        requestAnimationFrame(drawScene);
    }
}

main();
