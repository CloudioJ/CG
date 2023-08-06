import * as THREE from "three"
import { GLTFLoader }  from "GLTFLoader"
import { OrbitControls } from "OrbitControls"

const loader = new GLTFLoader();
loader.load('/scene/mountain/scene.gltf', function(gltf){
    console.log(gltf)
    const root = gltf.scene;
    root.scale.set(10, 10, 10);
    scene.add(gltf.scene);
    
});

const canvas = document.querySelector('.webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color("rgb(0, 200, 255)")

// Constants
const splinePoints = [
    { x: -2, y: 0, z: -5 },
    { x: -1, y: 1, z: -3 },
    { x: 1, y: 1, z: -3 },
    { x: 2, y: 0, z: -5 },
    { x: 1, y: -1, z: -7 },
    { x: -1, y: -1, z: -7 },
    { x: -2, y: 0, z: -5 },
]; // Spline control points

const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 5, 5)
scene.add(light)

// const geometry = new THREE.BoxGeometry(2, 1, 1)
// const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
// const mesh = new THREE.Mesh(geometry, material)
// scene.add(mesh)

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const camera = new THREE.PerspectiveCamera(
    90, 
    sizes.width / sizes.height, 
    0.1, 
    100)
camera.position.set(0, 5, 5)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.gammaOutput = true
renderer.render(scene, camera)
function animate(){
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}
animate()