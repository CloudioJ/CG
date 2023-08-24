// WebGL2 - load obj - w/mtl, normal maps
// from https://webgl2fundamentals.org/webgl/webgl-load-obj-w-mtl-w-normal-maps.html

"use strict";

// This is not a full .obj parser.
// see http://paulbourke.net/dataformats/obj/

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];
  const objColors = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [objPositions, objTexcoords, objNormals, objColors];

  // same order as `f` indices
  let webglVertexData = [
    [], // positions
    [], // texcoords
    [], // normals
    [] // colors
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ["default"];
  let material = "default";
  let object = "default";

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      const color = [];
      webglVertexData = [position, texcoord, normal, color];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
          color
        }
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split("/");
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
      // if this is the position index (index 0) and we parsed
      // vertex colors then copy the vertex colors to the webgl vertex color data
      if (i === 0 && objColors.length > 1) {
        geometry.data.color.push(...objColors[index]);
      }
    });
  }

  const keywords = {
    v(parts) {
      // if there are more than 3 values here they are vertex colors
      if (parts.length > 3) {
        objPositions.push(parts.slice(0, 3).map(parseFloat));
        objColors.push(parts.slice(3).map(parseFloat));
      } else {
        objPositions.push(parts.map(parseFloat));
      }
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop, // smoothing group
    mtllib(parts) {
      // the spec says there can be multiple file here
      // but I found one with a space in the filename
      materialLibs.push(parts.join(" "));
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    }
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split("\n");
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn("unhandled keyword:", keyword); // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
      Object.entries(geometry.data).filter(([, array]) => array.length > 0)
    );
  }

  return {
    geometries,
    materialLibs
  };
}

function parseMapArgs(unparsedArgs) {
  // TODO: handle options
  return unparsedArgs;
}

function parseMTL(text) {
  const materials = {};
  let material;

  const keywords = {
    newmtl(parts, unparsedArgs) {
      material = {};
      materials[unparsedArgs] = material;
    },
    /* eslint brace-style:0 */
    Ns(parts) {
      material.shininess = parseFloat(parts[0]);
    },
    Ka(parts) {
      material.ambient = parts.map(parseFloat);
    },
    Kd(parts) {
      material.diffuse = parts.map(parseFloat);
    },
    Ks(parts) {
      material.specular = parts.map(parseFloat);
    },
    Ke(parts) {
      material.emissive = parts.map(parseFloat);
    },
    map_Kd(parts, unparsedArgs) {
      material.diffuseMap = parseMapArgs(unparsedArgs);
    },
    map_Ns(parts, unparsedArgs) {
      material.specularMap = parseMapArgs(unparsedArgs);
    },
    map_Bump(parts, unparsedArgs) {
      material.normalMap = parseMapArgs(unparsedArgs);
    },
    Ni(parts) {
      material.opticalDensity = parseFloat(parts[0]);
    },
    d(parts) {
      material.opacity = parseFloat(parts[0]);
    },
    illum(parts) {
      material.illum = parseInt(parts[0]);
    }
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split("\n");
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn("unhandled keyword:", keyword); // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return materials;
}

function makeIndexIterator(indices) {
  let ndx = 0;
  const fn = () => indices[ndx++];
  fn.reset = () => {
    ndx = 0;
  };
  fn.numElements = indices.length;
  return fn;
}

function makeUnindexedIterator(positions) {
  let ndx = 0;
  const fn = () => ndx++;
  fn.reset = () => {
    ndx = 0;
  };
  fn.numElements = positions.length / 3;
  return fn;
}

const subtractVector2 = (a, b) => a.map((v, ndx) => v - b[ndx]);

function generateTangents(position, texcoord, indices) {
  const getNextIndex = indices
    ? makeIndexIterator(indices)
    : makeUnindexedIterator(position);
  const numFaceVerts = getNextIndex.numElements;
  const numFaces = numFaceVerts / 3;

  const tangents = [];
  for (let i = 0; i < numFaces; ++i) {
    const n1 = getNextIndex();
    const n2 = getNextIndex();
    const n3 = getNextIndex();

    const p1 = position.slice(n1 * 3, n1 * 3 + 3);
    const p2 = position.slice(n2 * 3, n2 * 3 + 3);
    const p3 = position.slice(n3 * 3, n3 * 3 + 3);

    const uv1 = texcoord.slice(n1 * 2, n1 * 2 + 2);
    const uv2 = texcoord.slice(n2 * 2, n2 * 2 + 2);
    const uv3 = texcoord.slice(n3 * 2, n3 * 2 + 2);

    const dp12 = m4.subtractVectors(p2, p1);
    const dp13 = m4.subtractVectors(p3, p1);

    const duv12 = subtractVector2(uv2, uv1);
    const duv13 = subtractVector2(uv3, uv1);

    const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
    const tangent = Number.isFinite(f)
      ? m4.normalize(
          m4.scaleVector(
            m4.subtractVectors(
              m4.scaleVector(dp12, duv13[1]),
              m4.scaleVector(dp13, duv12[1])
            ),
            f
          )
        )
      : [1, 0, 0];

    tangents.push(...tangent, ...tangent, ...tangent);
  }

  return tangents;
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Tell the twgl to match position with a_position etc..
  twgl.setAttributePrefix("a_");

  const vs = `#version 300 es
  in vec4 a_position;
  in vec3 a_normal;
  in vec3 a_tangent;
  in vec2 a_texcoord;
  in vec4 a_color;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform vec3 u_viewWorldPosition;

  out vec3 v_normal;
  out vec3 v_tangent;
  out vec3 v_surfaceToView;
  out vec2 v_texcoord;
  out vec4 v_color;

  void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_projection * u_view * worldPosition;
    v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;

    mat3 normalMat = mat3(u_world);
    v_normal = normalize(normalMat * a_normal);
    v_tangent = normalize(normalMat * a_tangent);

    v_texcoord = a_texcoord;
    v_color = a_color;
  }
  `;

  const fs = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_surfaceToView;
in vec2 v_texcoord;
in vec4 v_color;

uniform vec3 diffuse;
uniform sampler2D diffuseMap;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform sampler2D specularMap;
uniform float shininess;
uniform sampler2D normalMap;
uniform float opacity;
uniform vec3 u_lightDirection;
uniform vec3 u_ambientLight;

out vec4 outColor;

void main () {
    vec3 normal = normalize(v_normal) * (float(gl_FrontFacing) * 2.0 - 1.0);
    vec3 tangent = normalize(v_tangent) * (float(gl_FrontFacing) * 2.0 - 1.0);
    vec3 bitangent = normalize(cross(normal, tangent));

    mat3 tbn = mat3(tangent, bitangent, normal);
    normal = texture(normalMap, v_texcoord).rgb * 2.0 - 1.0;
    normal = normalize(tbn * normal);

    vec3 lightDirection = normalize(u_lightDirection);
    vec3 surfaceToViewDirection = normalize(v_surfaceToView);
    vec3 halfVector = normalize(lightDirection + surfaceToViewDirection);

    float diffuseLight = max(dot(normal - 1.0, lightDirection), 1.0);
    float specularLight = pow(max(dot(normal, halfVector) - 0.5, 0.1), shininess);

    vec4 diffuseMapColor = texture(diffuseMap, v_texcoord);
    vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
    vec3 effectiveSpecular = specular * texture(specularMap, v_texcoord).rgb;

    vec3 lighting = ambient * u_ambientLight +
                    effectiveDiffuse * diffuseLight +
                    effectiveSpecular * specularLight;

    outColor = vec4(emissive + lighting, opacity * diffuseMapColor.a * v_color.a);
}
`;
  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  //Load first object
  const objHref = "scene/house2/model.obj";
  const response = await fetch(objHref);
  const text = await response.text();
  const obj = parseOBJ(text);
  const baseHref = new URL(objHref, window.location.href);
  const matTexts = await Promise.all(
    obj.materialLibs.map(async (filename) => {
      const matHref = new URL(filename, baseHref).href;
      const response = await fetch(matHref);
      return await response.text();
    })
  );
  const materials = parseMTL(matTexts.join("\n"));

  const textures = {
    defaultWhite: twgl.createTexture(gl, { src: [255, 255, 255, 255] }),
    defaultNormal: twgl.createTexture(gl, { src: [127, 127, 255, 0] })
  };

  // load texture for materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = twgl.createTexture(gl, { src: textureHref, flipY: true });
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }


  //Load second object
  const secondObjHref = "scene/objects/Moai_160k_ZR.obj";
  const secondObjResponse = await fetch(secondObjHref);
  const secondObjText = await secondObjResponse.text();
  const secondObj = parseOBJ(secondObjText);
  const secondBaseHref = new URL(secondObjHref, window.location.href);
  const secondMatTexts = await Promise.all(
    secondObj.materialLibs.map(async (filename) => {
      const matHref = new URL(filename, secondBaseHref).href;
      const response = await fetch(matHref);
      return await response.text();
    })
  );

  const secondMaterials = parseMTL(secondMatTexts.join("\n"));

  for (const material of Object.values(secondMaterials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, secondBaseHref).href;
          texture = twgl.createTexture(gl, { src: textureHref, flipY: true });
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }


  //Load third object
  const thirdObjHref = "scene/characters/model_mesh.obj";
  const thirdObjResponse = await fetch(thirdObjHref);
  const thirdObjText = await thirdObjResponse.text();
  const thirdObj = parseOBJ(thirdObjText);
  const thirdBaseHref = new URL(thirdObjHref, window.location.href);
  const thirdMatTexts = await Promise.all(
    thirdObj.materialLibs.map(async (filename) => {
      const matHref = new URL(filename, thirdBaseHref).href;
      const response = await fetch(matHref);
      return await response.text();
    })
  );

  const thirdMaterials = parseMTL(thirdMatTexts.join("\n"));

  for (const material of Object.values(thirdMaterials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, thirdBaseHref).href;
          texture = twgl.createTexture(gl, { src: textureHref, flipY: true });
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  // hack the materials so we can see the specular map
  Object.values(materials).forEach((m) => {
    m.shininess = 125;
    m.specular = [3, 2, 1];
  });

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 100,
    opacity: 1
  };

  const parts = obj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        // it's 3. The our helper library assumes 4 so we need
        // to tell it there are only 3.
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      // there are no vertex colors so just use constant white
      data.color = { value: [1, 1, 1, 1] };
    }

    // generate tangents if we have the data to do so.
    if (data.texcoord && data.normal) {
      data.tangent = generateTangents(data.position, data.texcoord);
    } else {
      // There are no tangents
      data.tangent = { value: [1, 0, 0] };
    }

    if (!data.texcoord) {
      data.texcoord = { value: [0, 0] };
    }

    if (!data.normal) {
      // we probably want to generate normals if there are none
      data.normal = { value: [0, 0, 1] };
    }

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material]
      },
      bufferInfo,
      vao
    };
  });

  const secondParts = secondObj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }
    
    if (!data.texcoord) {
      data.texcoord = { value: [0, 0] };
    }
  
    if (!data.normal) {
      data.normal = { value: [0, 0, 1] };
    }
  
    // Ensure the texture mappings are correct
    // const materialObj = secondMaterials[material];
    const texturedMaterial = {
      ...defaultMaterial,
      ...secondMaterials[material],
    };
  
    // Create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: texturedMaterial,
      bufferInfo,
      vao
    };
  });

  const thirdParts = thirdObj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }

    if (!data.texcoord) {
      data.texcoord = { value: [0, 0] };
    }

    if (!data.normal) {
      data.normal = { value: [0, 0, 1] };

    }

    // Ensure the texture mappings are correct
    const texturedMaterial = {
      ...defaultMaterial,
      ...thirdMaterials[material],
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: texturedMaterial,
      bufferInfo,
      vao
    };
  });


  function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return { min, max };
  }

  function getGeometriesExtents(geometries) {
    return geometries.reduce(
      ({ min, max }, { data }) => {
        const minMax = getExtents(data.position);
        return {
          min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
          max: max.map((max, ndx) => Math.max(minMax.max[ndx], max))
        };
      },
      {
        min: Array(3).fill(Number.POSITIVE_INFINITY),
        max: Array(3).fill(Number.NEGATIVE_INFINITY)
      }
    );
  }

  const extents = getGeometriesExtents(obj.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);
  const objOffset = m4.scaleVector(
    m4.addVectors(extents.min, m4.scaleVector(range, 0.5)),
    -1
  );
  const cameraTarget = [0, 0, 0];
  const radius = m4.length(range) * 0.5 / Math.tan((30 * Math.PI) / 180);
  const cameraPosition = m4.addVectors(cameraTarget, [1, 1, radius]);

  const zNear = radius / 1000;
  const zFar = radius * 100;

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // Additional camera-related variables
  let cameraHorizontalAngle = 0;

  let animationDuration = 10000; 

  let animationDurationInput = document.getElementById(
    "animationDurationInput"
  );
  
  animationDurationInput.addEventListener("input", () => {
    animationDuration = parseFloat(animationDurationInput.value); // Convert to milliseconds
  });

  const numPoints = 5; // Number of points in the bezier curve
  const controlPoints = [
    [2.0360216277221825,-1.5699954832406477],
    [1.938800768020174, -0.2046659899111344],
    [1.113800768020174, 1.246659899111344],
  ];

  function interpolatePoints(p1, p2, numPoints) {
    const interpolatedPoints = [];

    for (let i = 1; i < numPoints; i++) {
        const t = i / numPoints;
        const x = p1[0] + t * (p2[0] - p1[0]);
        const y = p1[1] + t * (p2[1] - p1[1]);
        interpolatedPoints.push([x, y]);
    }

    return interpolatedPoints;
  }

  const numPointsToAdd = 2; // You can adjust the number of points to add
  const newControlPoints = [];

  for (let i = 0; i < controlPoints.length - 1; i++) {
      const p1 = controlPoints[i];
      const p2 = controlPoints[i + 1];

      newControlPoints.push(p1, ...interpolatePoints(p1, p2, numPointsToAdd));
  }

  newControlPoints.push(controlPoints[controlPoints.length - 1]);

  console.log(newControlPoints);

  // Function to compute the value of the bezier curve at a given time (t)
  function bezierValue(controlPoints, t) {
    const n = controlPoints.length - 1;
    let value = [0, 0];
    for (let i = 0; i <= n; i++) {
      const coefficient =
        (factorial(n) / (factorial(i) * factorial(n - i))) *
        Math.pow(t, i) *
        Math.pow(1 - t, n - i);
      value[0] += controlPoints[i][0]/3 * coefficient;
      value[1] += controlPoints[i][1]/3 * coefficient;
    }
    return value;
  }

  function factorial(n) {
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
  }
  
  let currentControlPointIndex = 0;

  function updateCameraPosition(time) {
    const t = (time % animationDuration) / animationDuration;
    const interval = 1 / (numPoints - 1);
    const segmentIndex = Math.floor(t / interval);
    const tInterval = (t % interval) / interval;
    const p0 = newControlPoints[segmentIndex];
    const p1 = newControlPoints[segmentIndex + 1];
  
    cameraHorizontalAngle = degToRad(0.25) 
    // Calculate camera position along the bezier curve
    const cameraX = bezierValue([p0, p1], tInterval)[0];
    const cameraY = 0; // Keep the camera at the same height
    const cameraZ = bezierValue([p0, p1], tInterval)[1];
  
    // Move the camera further from the center
    const cameraDistance = 15; // Adjust this value to control the camera distance
    cameraPosition[0] = cameraX * cameraDistance * Math.sin(cameraHorizontalAngle);
    cameraPosition[1] = cameraY;
    cameraPosition[2] = cameraZ * cameraDistance * Math.cos(cameraHorizontalAngle);
  
    // Calculate the next control point's index
    const nextControlPointIndex = (currentControlPointIndex + 1) % newControlPoints.length;
    currentControlPointIndex = nextControlPointIndex;
    // Update the camera's target towards the next control point
    cameraTarget[0] = newControlPoints[nextControlPointIndex][0] * cameraDistance;
    cameraTarget[1] = cameraY;
    cameraTarget[2] = newControlPoints[nextControlPointIndex][1] * cameraDistance;
  
    if (segmentIndex !== currentControlPointIndex) {
      currentControlPointIndex = segmentIndex;
    }
  }

  function updateCameraTarget() {
    // Calculate the average position of control points
    const sum = controlPoints.reduce(
      (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
      [0, 0]
    );
    const center = [sum[0] / controlPoints.length, sum[1] / controlPoints.length];
  
    // Update the camera's target further from the center
    const targetDistance = 2; // Adjust this value to control the target distance
    cameraTarget[0] = center[0] * targetDistance;
    cameraTarget[2] = center[1] * targetDistance;
  }

  let isAnimating = false;

  function startCameraAnimation() {
    let startTime = null;
    isAnimating = true;
    function animate(timestamp) {

      if (!isAnimating) return;

      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      cameraSlider.value = (elapsedTime / animationDuration) * 360;
      if (elapsedTime >= animationDuration) {
        return;
      }

      updateCameraPosition(elapsedTime);

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  const animateButton = document.getElementById("animateButton");
  animateButton.addEventListener("click", () => {
    startCameraAnimation();
  });

  const pauseButton = document.getElementById("pauseButton");
  pauseButton.addEventListener("click", () => {
    isAnimating = false;
  });

  const cameraSlider = document.getElementById("cameraSlider");
  cameraSlider.addEventListener("input", () => {
    const normalizedValue = cameraSlider.value / 360;
    const targetTime = normalizedValue * animationDuration;
    updateCameraPosition(targetTime);
  });
    
  let jumpStartTime = performance.now();
  const jumpDuration = 0.8; // Adjust the jump duration as needed
  const jumpAmplitude = 0.2; // Adjust the jump amplitude as needed

  updateCameraPosition(0);

  function render(time) {
    time *= 0.001; // convert to seconds
    updateCameraTarget();
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = degToRad(80);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);
    const lookAtMatrix = m4.lookAt(cameraPosition, cameraTarget, up);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([2, 1, 5]),
      u_view: lookAtMatrix,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition
    };

    gl.useProgram(meshProgramInfo.program);

    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    let u_world = m4.yRotation(Math.PI * 0.5);
    u_world = m4.translate(u_world, ...objOffset);
    

    // Space
    for (const { bufferInfo, vao, material } of parts) {

      const scaledHouse = m4.scale(u_world, 1,1,1);
      const translatedHouse = m4.translate(scaledHouse, 7, 9, 6);
      gl.bindVertexArray(vao);

      twgl.setUniforms(
        meshProgramInfo,
        {
          u_world: translatedHouse,
        },
        material
      );

      twgl.drawBufferInfo(gl, bufferInfo);      
    }

    // Moai head 
    for (const { bufferInfo, vao, material } of secondParts) {
      const moaiX = 27.5;
      const moaiY = 44.4;
      const moaiZ = 59;

      let walkAnim = time;
  
      if (moaiZ - time >= -10) {
        walkAnim += time;
      } else {
        walkAnim = moaiZ + 80;
      }

      const scaledMoai = m4.scale(u_world, .2, .2, .2);
      const translatedMoai = m4.translate(scaledMoai, moaiX, moaiY, moaiZ - walkAnim);
      const rotatedMoai = m4.yRotation(Math.PI+1.2);
      m4.multiply(rotatedMoai, translatedMoai, rotatedMoai)
      gl.bindVertexArray(vao);
      twgl.setUniforms(
        meshProgramInfo,
        {
          u_world: rotatedMoai,
        },
        material
      );
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    // Person
    for (const { bufferInfo, vao, material } of thirdParts) {
      const elapsedTime = (performance.now() - jumpStartTime) / 1000;

      const jumpOffsetY = jumpAmplitude * Math.sin((Math.PI * 2 / jumpDuration) * elapsedTime);

      if (elapsedTime > jumpDuration) {
        jumpStartTime = performance.now();
      }

      const scaledWorld = m4.scale(u_world, 4, 4, 4);
      const translatedUWorld = m4.translate(scaledWorld, 1.7, 3.5 + jumpOffsetY, 0.92);
      const rotatedPerson = m4.zRotation(Math.PI * 2 + 0.2);
      m4.multiply(rotatedPerson, translatedUWorld, rotatedPerson)
      const rotatedPersonY = m4.yRotation(Math.PI * 2);
      m4.multiply(rotatedPersonY, rotatedPerson, rotatedPersonY)
      gl.bindVertexArray(vao);
      twgl.setUniforms(
        meshProgramInfo,
        {
          u_world: rotatedPersonY,
        },
        material
      );
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    // Door
    // for (const { bufferInfo, vao, material } of fourthParts) {

    //   const scaledDoor = m4.scale(u_world, 1, 1, 1);
    //   const translatedDoor = m4.translate(scaledDoor, 0, 0, 0);
    //   // const rotatedDoor = m4.yRotation(Math.PI+1.2);
    //   // m4.multiply(rotatedDoor, translatedDoor, rotatedDoor)
    //   gl.bindVertexArray(vao);
    //   twgl.setUniforms(
    //     meshProgramInfo,
    //     {
    //       u_world: translatedDoor,
    //     },
    //     material
    //   );
    //   twgl.drawBufferInfo(gl, bufferInfo);
    // }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();