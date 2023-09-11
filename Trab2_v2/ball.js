"use strict";

async function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    // and gl.bufferData
    const sphereBufferInfo   = primitives.createSphereWithVertexColorsBufferInfo(gl, 10,12,6);
    
    // setup GLSL program
    var programInfo = webglUtils.createProgramInfo(gl, ["cube_vs", "cube_fs"]);

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    // Uniforms for each object.
    var cubeUniforms = {
        u_colorMult: [0.5, 1, 0.5, 1],
        u_matrix: m4.identity(),
    };

    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation, scale) {
        var matrix = m4.identity();
        matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
        matrix = m4.xRotate(matrix, xRotation);
        matrix = m4.yRotate(matrix, yRotation);
        matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);
        return m4.multiply(viewProjectionMatrix, matrix);
    }

    var ballPosition = [0, 0, 0];
    var ballVelocity = [0, 0, 0];
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
        m4.perspective(fov, aspect, 0.1, 2000);

    

    canvas.addEventListener("click", shootBall);

    function shootBall(event) {
        // Calculate the direction from the camera to the target
        var rayDirection = m4.normalize(m4.subtractVectors(target, cameraPosition));
        
        // Set the initial position and velocity of the ball
        ballPosition = cameraPosition.slice(); // Copy camera position
        ballVelocity = [rayDirection[0] * 2, rayDirection[1] * 2, rayDirection[2] * 2]; // Adjust velocity as needed
    }

    requestAnimationFrame(drawScene);

    // Draw the scene.
    function drawScene(time) {
        time *= 0.00005;

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        ballPosition[0] += ballVelocity[0] * time;
        ballPosition[1] += ballVelocity[1] * time;
        ballPosition[2] += ballVelocity[2] * time;
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        
        var viewProjectionMatrix = m4.multiply(
            projectionMatrix,
            view
        )

        console.log("CAMERA =" +cameraPosition+"\n"
        +"TARGET ="+target+"\n"
        +"BALL POSITION ="+ballPosition+"\n")

        var cubeXRotation   = -time * 20;
        var cubeYRotation   = time;
        var ballScale = [1, 1, 1];

        // ------ Draw the sphere --------

        gl.useProgram(programInfo.program);

        // Setup all the needed attributes.
        webglUtils.setBuffersAndAttributes(gl, programInfo, sphereBufferInfo);
        
        cubeUniforms.u_matrix = computeMatrix(
            viewProjectionMatrix,
            ballPosition,
            cubeXRotation,
            cubeYRotation,
            ballScale
        );

        // Set the uniforms we just computed
        webglUtils.setUniforms(programInfo, cubeUniforms);

        gl.drawArrays(gl.TRIANGLES, 0, sphereBufferInfo.numElements);
        
        requestAnimationFrame(drawScene);
    }
}

main();
