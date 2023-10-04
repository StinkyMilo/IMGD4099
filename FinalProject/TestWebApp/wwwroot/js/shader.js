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
    format: canvasFormat
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
    @group(0) @binding(1) var<storage> cellState: array<vec2f>;
    
    @vertex
    fn vs(@location(0) pos: vec2f) -> @builtin(position) vec4f{
        return vec4f(pos, 0., 1.);
    }
    
    @fragment
    fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f{
        // let npos = pos.xy/res;
        // return vec4f(npos,0.,1.);
        let idx = u32((pos.y%res.y)*res.x + pos.x%res.x);
        let X = cellState[idx].x;
        let Y = cellState[idx].y;
        return vec4f(X,Y,0.,1.);
    }
`
});

const WORKGROUP_SIZE = 8;

const simulationShaderModule =device.createShaderModule({
label: "Game of life shader",
code:`
    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellStateIn: array<vec2f>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<vec2f>;
    
    fn cellIndex(cellX: u32, cellY: u32) -> u32{
        return (cellY % u32(grid.y)) * u32(grid.x) + (cellX % u32(grid.x));
    }

    const Dx = 1.;
    const Dy = .5;
    const f = 0.055;
    const k = 0.062;
    
    @compute
    @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn cs(@builtin(global_invocation_id) cell: vec3u){
        // return;
        var convolution: array<f32, 9> = array(0.05, 0.2, 0.05, 0.2, -1., 0.2, 0.05, 0.2, 0.05);
        let currentIndex = cellIndex(cell.x,cell.y);
        var gradient: vec2f = vec2f(0.,0.);
        for(var i: u32 = 0; i < 9; i++){
            let adjustedIndex = cellIndex(cell.x+(i%3)-1,cell.y+(i/3)-1);
            let lastVal = cellStateIn[adjustedIndex];
            gradient+=convolution[i]*lastVal;
        }
        let in = cellStateIn[currentIndex];
        let X = in.x;
        let Y = in.y;
        let XOut = X+(Dx*gradient.x - X*Y*Y+f*(1-X));
        let YOut = Y+(Dy*gradient.y + X*Y*Y-(k+f)*Y);
        cellStateOut[currentIndex]=vec2f(XOut,YOut);
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

const cellStateArray = new Float32Array(window.innerWidth*window.innerHeight*2);
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

for(var i = 0; i < cellStateArray.length; i+=2){
    var x = (i/2)%window.innerHeight;
    var y = ((i/2)-x)/window.innerHeight;
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
}

device.queue.writeBuffer(cellStateStorage[0],0,cellStateArray);


device.queue.writeBuffer(cellStateStorage[1],0,cellStateArray);

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

function updateGrid(){
    const encoder = device.createCommandEncoder();
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(simulationPipeline);
    computePass.setBindGroup(0, bindGroups[step%2]);
    computePass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
    computePass.end();
    step++;
    const pass = encoder.beginRenderPass({
        colorAttachments:[{
            view: ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: {r: 0, g: 0.4, b: 0.4, a: 1},
            storeOp: "store"
        }]
    });


    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0,vertexBuffer);
    pass.setBindGroup(0, bindGroups[step%2]);
    pass.draw(vertices.length/2, 5);

    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

setInterval(updateGrid,UPDATE_INTERVAL);