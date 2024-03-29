import {Pane} from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.1/dist/tweakpane.min.js';

if(!navigator.gpu){
    throw new Error("No WebGPU :( What a travesty.");
}
const adapter = await navigator.gpu.requestAdapter();
if(!adapter){
    throw new Error("No GPU Adapter.");
}
const device = await adapter.requestDevice();
const canv = document.getElementById("gpucanv");
function resizeCanvas() {
    canv.width = window.innerWidth;
    canv.height = window.innerHeight;
};
resizeCanvas();
const ctx = canv.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({
    device: device,
    format: canvasFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
});

const vertices = new Float32Array([
    -1, -1,
    1, -1,
    1, 1,

    -1, -1,
    1, 1,
    -1, 1
]);

const vertexBuffer = device.createBuffer({
    label: "Cell vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});

device.queue.writeBuffer(vertexBuffer,0,vertices);

const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
        format: "float32x2",
        offset: 0,
        shaderLocation: 0
    }]
};

const cellShaderModule = device.createShaderModule({
label: "Cell shader",
code: `
    @group(0) @binding(0) var<uniform> res: vec2f;
    @group(0) @binding(1) var<storage> cellState: array<vec4f>;
    @group(0) @binding(3) var<uniform> sensorValues: vec4f;
    @group(0) @binding(4) var backBuffer: texture_2d<f32>;
    @group(0) @binding(5) var backSampler: sampler;

    @vertex
    fn vs(@location(0) pos: vec2f) -> @builtin(position) vec4f{
        return vec4f(pos, 0., 1.);
    }
    
    @fragment
    fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f{
        // let npos = pos.xy/res;
        // return vec4f(mousePos/res,0.,1.);
        let fb = textureSample(backBuffer,backSampler, pos.xy/res);
        let posAdjusted = vec2f(pos.x - res.x/2, pos.y - res.y/2)/res;
        let pos2 = vec2f(posAdjusted.x*res.x/res.y,posAdjusted.y);
        //280 is a bit of a magic number here. In an ideal case it would be the same as the normalizing factor passed
        //into tweakpane, but I got a bit lazy and didn't want to add another binding, and the size of the dot isn't too important.
        if(sensorValues.w > 0 && distance(sensorValues.xy,pos2) < 0.01 * sensorValues.z/280.){
            return vec4f(1.,0.,0.,1.);
        }
        let idx = u32((pos.y%res.y)*res.x + (res.x*-0.5) + pos.x%res.x);
        let X = cellState[idx].x;
        let Y = cellState[idx].y;
        return vec4f(0,0,Y,1.)*0.025 + vec4f(0,0,fb.b,fb.a)*0.975 + vec4f(0.,Y,0.,1.);
    }
`
});

const WORKGROUP_SIZE = 8;
const WEIGHT_THRESHOLD = 10.1;

const simulationShaderModule =device.createShaderModule({
label: "Game of life shader",
code:`
    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellStateIn: array<vec4f>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<vec4f>;
    @group(0) @binding(3) var<uniform> sensorValues: vec4f;
    @group(0) @binding(6) var<uniform> useAge: u32;
    
    fn cellIndex(cellX: u32, cellY: u32) -> u32{
        return (cellY) * u32(grid.x) + (cellX);
    }

    const Dx = 1.;
    const Dy = .5;
    const f = 0.0367;
    const k = 0.06;
    const ageThreshold = 0.1;
    const ageIncrement = 0.000015;
    const ageMax = 1.-k;
    const rawWeightThreshold=${WEIGHT_THRESHOLD};

    @compute
    @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn cs(@builtin(global_invocation_id) cell: vec3u){
        // return;
        //TODO: make equivalent for Wbb
        let cellPos = vec2f(f32(cell.x),f32(cell.y))/grid;
        let mpos = (sensorValues.xy*0.5 + vec2f(0.5,0.5) - cellPos)*0.05;
        var convolution: array<f32, 9> = array(0.05, 0.2, 0.05, 0.2, -1., 0.2, 0.05, 0.2, 0.05);
        let conv2 = array((-mpos.x - mpos.y)/2, -mpos.y, (mpos.x-mpos.y)/2, -mpos.x, 0, mpos.x, (-mpos.x+mpos.y)/2, mpos.y, (mpos.x+mpos.y)/2);
        
        for(var i: u32 = 0; i < 9; i++){
            convolution[i]+=conv2[i];
        }
        let currentIndex = cellIndex(cell.x,cell.y);
        var gradient: vec2f = vec2f(0.,0.);
        for(var i: u32 = 0; i < 9; i++){
            let adjustedIndex = cellIndex(cell.x+(i%3)-1,cell.y+(i/3)-1);
            let lastVal = cellStateIn[adjustedIndex].xy;
            gradient+=convolution[i]*lastVal;
        }
        let in = cellStateIn[currentIndex];
        let X = in.x;
        let Y = in.y;
        var age: f32 = in.z;
        if(Y > ageThreshold){
            age=min(age+ageIncrement,ageMax);
        }else{
            age=0.;
        }
        var k2: f32;
        var XOut: f32;
        var YOut: f32;
        //TODO: Remove false && to re-implement jump functionality

        //I have no clue why this works. This should not be how to make it circular rather than oval shaped. But it seems to.
        // let cellPos2 = (vec2f(cellPos.x,cellPos.y)) * vec2f(grid.x/grid.y,1.) - vec2f(0.5,0.);
        let cellAdjusted = vec2f(f32(cell.x) - grid.x/2, f32(cell.y) - grid.y/2)/grid;
        //This by no means should work. I shouldn't be multiplying by grid.x / grid.y; it should be the reciprocal.
        //Nonetheless, this works. No clue why.
        let cellPos2 = vec2f(f32(cellAdjusted.x)*grid.x/grid.y,f32(cellAdjusted.y));
        if(sensorValues.z < rawWeightThreshold && distance(cellPos2,vec2f(0.,0.)) > 0.08){
            let burnoutRate = 0.003;
            XOut = min(1,X+burnoutRate);
            YOut = max(0,Y-burnoutRate);
            // YOut = 1.;
            // XOut = 0.;
            age = 0.;
        }else{
            var k2: f32;
            if(useAge==1){
                k2=k+age;
            }else{
                k2 = k;
            }
            XOut = X+(Dx*gradient.x - X*Y*Y+f*(1-X));
            YOut = Y+(Dy*gradient.y + X*Y*Y-(k2+f)*Y);
        }
        cellStateOut[currentIndex]=vec4f(XOut,YOut,age,0.);
    }
`
});

const bindGroupLayout = device.createBindGroupLayout({
label: "Cell bind group layout",
entries: [{
        binding: 0,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: {}
    },{
        binding: 1,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: {type: "read-only-storage"}
    },{
        binding: 2,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: {type: "storage"}
    },{
        binding: 3,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: {}
    },{
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
    },{
        binding: 5,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
    },{
        binding: 6,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {}
    }]
});

const pipelineLayout = device.createPipelineLayout({
    label: "Cell Pipeline layout",
    bindGroupLayouts: [bindGroupLayout]
});

const cellPipeline = device.createRenderPipeline({
label: "Cell pipeline",
layout: pipelineLayout,
vertex: {
    module: cellShaderModule,
    entryPoint: "vs",
    buffers: [vertexBufferLayout]
},
fragment: {
    module: cellShaderModule,
    entryPoint: "fs",
    targets: [{
        format: canvasFormat
    }]
}
});

const simulationPipeline = device.createComputePipeline({
    label: "Simulation pipeline",
    layout: pipelineLayout,
    compute: {
        module: simulationShaderModule,
        entryPoint: "cs"
    }
});

const uniformArray = new Float32Array([window.innerWidth, window.innerHeight]);

const uniformBuffer = device.createBuffer({
    label: "Grid Uniforms",
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(uniformBuffer,0,uniformArray);

const age = new Uint32Array([0]);
const ageBuffer = device.createBuffer({
    label: "Age Buffer",
    size: age.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(ageBuffer,0,age);

var posBuffer = new Float32Array([0, 0, 0, 0]);
var mousePos = [0, 0, 0, 0];
window.onmousemove=function(event){
    mousePos[0] = event.pageX;
    mousePos[1] = event.pageY;
}
window.onmousedown = function(event){
    mousePos[2] = 0;
}
window.onmouseup = function(event){
    mousePos[2] = WEIGHT_THRESHOLD+1;
}

const mouseBuffer = device.createBuffer({
    label: "Mouse Pos",
    size: posBuffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});

device.queue.writeBuffer(mouseBuffer,0,posBuffer);

const cellStateArray = new Float32Array(window.innerWidth*window.innerHeight*4);
const cellStateStorage = [
    device.createBuffer({
        label: "Cell State A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    }),
    device.createBuffer({
        label: "Cell State B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })         
];

for(var i = 0; i < cellStateArray.length; i+=4){
    var x = (i/4)%window.innerWidth;
    var y = ((i/4)-x)/window.innerWidth;
    // console.log(x,y);
    var distX = window.innerWidth/2 - x;
    var distY = window.innerHeight/2 - y;
    var dist = Math.sqrt(distX*distX + distY*distY);
    if(dist < 100){
        cellStateArray[i]=0;
        cellStateArray[i+1]=1;
    }else{
        cellStateArray[i]=1;
        cellStateArray[i+1]=0;
    }
    cellStateArray[i+2]=0;
    //Unused
    cellStateArray[i+3]=0;
}

device.queue.writeBuffer(cellStateStorage[0],0,cellStateArray);

device.queue.writeBuffer(cellStateStorage[1],0,cellStateArray);

const backTexture = device.createTexture({
    size: [window.innerWidth, window.innerHeight],
    format: canvasFormat,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
});

const backView = backTexture.createView();
const sampler = {
    type: 'sampler',
    sampler: device.createSampler({
        magFilter:'linear',
        minFilter: 'linear'
    })
};

const bindGroups = [
    device.createBindGroup({
        label: "Cell renderer bind group A",
        layout: cellPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {buffer: uniformBuffer}
        },
        {
            binding: 1,
            resource: {buffer: cellStateStorage[0]}
        },{
            binding: 2,
            resource: {buffer: cellStateStorage[1]}
        },{
            binding: 3,
            resource: {buffer: mouseBuffer}
        },{
            binding: 4,
            resource: backView
        },{
            binding: 5,
            resource: sampler.sampler
        },{
            binding: 6,
            resource: {buffer: ageBuffer}
        }]
    }),

    device.createBindGroup({
        label: "Cell renderer bind group B",
        layout: cellPipeline.getBindGroupLayout(0),
        entries :[{
        binding: 0,
            resource: { buffer: uniformBuffer}
        },{
        binding: 1,
            resource: {buffer: cellStateStorage[1]}
        },{
        binding: 2,
            resource: {buffer: cellStateStorage[0]}
        },{
            binding: 3,
            resource: {buffer: mouseBuffer}
        },{
            binding: 4,
            resource: backView
        },{
            binding: 5,
            resource: sampler.sampler
        },{
            binding: 6,
            resource: {buffer: ageBuffer}
        }]
    })
];

const UPDATE_INTERVAL = 20;
let step =0;

const numGroups = WORKGROUP_SIZE;
const workgroupCount = [
    Math.round(window.innerWidth/numGroups),
    Math.round(window.innerHeight/numGroups),
    1
];

const pane = new Pane();

const PARAMS = {
    controls: 'wbb',
    "Use Age": false,
    "Normalizing Factor": 280
}

pane.addBinding(PARAMS, 'controls', {
    options:{
        "Wii Balance Board": 'wbb',
        "Mouse": 'mouse'
    }
});
pane.addBinding(PARAMS, "Use Age");
pane.addBinding(PARAMS, "Normalizing Factor",{
    step: 1,
    min: 50,
    max: 400
});

function updateGrid(){
    const encoder = device.createCommandEncoder();
    const COMPUTE_STEPS = 8;
    const bias = [0, 0];
    var sensorPos;
    if(PARAMS.controls == 'wbb'){
        sensorPos = new Float32Array([
            ((SensorValues.tr + SensorValues.br) - (SensorValues.tl + SensorValues.bl) + bias[0])/PARAMS["Normalizing Factor"], 
            ((SensorValues.bl + SensorValues.br) - (SensorValues.tl + SensorValues.tr) + bias[1])/PARAMS["Normalizing Factor"], 
            SensorValues.bl+SensorValues.br+SensorValues.tr+SensorValues.tl,
            1
        ]);
    }else{
        sensorPos = new Float32Array([
            2*(mousePos[0] - window.innerWidth/2)/window.innerWidth,
            2*(mousePos[1] - window.innerHeight/2)/window.innerHeight,
            mousePos[2],
            0
        ]);
    }
    device.queue.writeBuffer(ageBuffer,0,new Uint32Array([PARAMS["Use Age"]?1:0]));
    // console.log(sensorPos);
    device.queue.writeBuffer(mouseBuffer,0,sensorPos);
    for(var i = 0; i < COMPUTE_STEPS; i++){
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(simulationPipeline);
        computePass.setBindGroup(0, bindGroups[step%2]);
        computePass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
        computePass.end();
        step++;
    }
    var swapChainTexture = ctx.getCurrentTexture();
    const pass = encoder.beginRenderPass({
        colorAttachments:[{
            view: swapChainTexture.createView(),
            loadOp: "clear",
            clearValue: {r: 0, g: 0.4, b: 0.4, a: 1},
            storeOp: "store"
        }]
    });


    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0,vertexBuffer);
    pass.setBindGroup(0, bindGroups[step%2]);
    pass.draw(vertices.length/2, 1);

    pass.end();

    //TODO: Add the encoder.copyTextureToTexture call with swapChainTexture and backTexture
    encoder.copyTextureToTexture(
        {texture: swapChainTexture},
        {texture: backTexture},
        [window.innerWidth, window.innerHeight]
    );

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

setInterval(updateGrid,UPDATE_INTERVAL);

/**
 * Ideas:
 *  Jump to clear the board (or just button on the board)
 *  Some way to add more Y into the system
 *  Mark a sort of focus location
 *  More fragment shader activities
 */