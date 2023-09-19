import { default as seagulls } from './seagulls.js'
import { default as Video    } from './video.js'
import { default as Audio    } from './audio.js'
import {Pane} from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.1/dist/tweakpane.min.js';

const computeShader = `
//@group(0) @binding(0) var<uniform> frame: f32;
@group(0) @binding(1) var<uniform> res: vec2f;
@group(0) @binding(2) var<uniform> f: f32;
@group(0) @binding(3) var<uniform> k: f32;
@group(0) @binding(4) var<uniform> Da: f32;
@group(0) @binding(5) var<uniform> Db: f32;
@group(0) @binding(6) var<uniform> mousePos: vec2f;
@group(0) @binding(7) var<uniform> mouseDown: f32;
@group(0) @binding(8) var<uniform> brushSize: f32;
@group(0) @binding(9) var<uniform> brushThickness: f32;
@group(0) @binding(10) var<storage, read_write> stateAIn : array<f32>;
@group(0) @binding(11) var<storage, read_write> stateAOut: array<f32>;
@group(0) @binding(12) var<storage, read_write> stateBIn :array<f32>;
@group(0) @binding(13) var<storage, read_write> stateBOut: array<f32>;

const convolution = array(0.07,0.22,0.07,0.22,-1.,0.18,0.03,0.18,0.03);

fn index(x: u32, y:u32) -> u32{
  return y*u32(res.x)+x;
}

@compute
@workgroup_size(16,16)
fn cs(@builtin(global_invocation_id) cell: vec3u){
  let currentIndex = index(cell.x, cell.y);
  var gradientA: f32 = 0.;
  var gradientB: f32 = 0.;
  let dist = distance(vec2f(f32(cell.x),f32(cell.y)), mousePos.xy);
  if(mouseDown > 0.5 && dist <= brushSize && dist > brushSize - brushThickness){
    stateAOut[currentIndex]=0;
    stateBOut[currentIndex]=1;
    return;
  }
  for(var i: u32 = 0; i < 9; i++){
      let posAdjustX = i%3-1;
      let posAdjustY = i/3-1;
      let adjustedIndex = index(cell.x+posAdjustX,cell.y+posAdjustY);
      let lastA = stateAIn[adjustedIndex];
      let lastB = stateBIn[adjustedIndex];
      gradientA+=convolution[i]*lastA;
      gradientB+=convolution[i]*lastB;
  }
  let A = stateAIn[currentIndex];
  let B = stateBIn[currentIndex];
  //Additional multiplication by factor implements an orientation. Reactions occur faster lower on the screen
  let factor = 1.-exp(-3.*f32(cell.y)/res.y);
  stateAOut[currentIndex]=A+(Da*gradientA - A*B*B+f*(1-A))*factor;
  stateBOut[currentIndex]=B+(Db*gradientB + A*B*B-(k+f)*B)*factor;
}
`

const shader = `
@group(0) @binding(0) var<uniform> frame: f32;
@group(0) @binding(1) var<uniform> res:   vec2f;
@group(0) @binding(10) var<storage> stateA: array<f32>;
@group(0) @binding(12) var<storage> stateB: array<f32>;


@vertex 
fn vs( @location(0) input : vec2f ) ->  @builtin(position) vec4f {
  return vec4f( input, 0., 1.); 
}

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
  let idx: u32 = u32((pos.y%res.y)*res.x + (res.x * -0.5) + pos.x%res.x);
  let A = stateA[idx];
  let B = stateB[idx];
  return vec4f(0,B,B,1.);
  
}`

async function main() {
  let frame = 0;
  const numGroups=16;

  const sg = await seagulls.init();
  const size = window.innerWidth*window.innerHeight;
  const stateAIn = new Float32Array(size);
  const stateAOut = new Float32Array(size);
  const stateBIn = new Float32Array(size);
  const stateBOut = new Float32Array(size);
  for(var i = 0; i < size; i++){
    stateAIn[i] = 1;
    stateBIn[i] = 0;
  }
  // for(var i = 0; i < size; i++){
  //   var x = i%window.innerWidth;
  //   var y = Math.floor(i/window.innerHeight);
  //   var value = ((x > window.innerWidth*0.95 || x < window.innerWidth*0.05) && y > window.innerHeight*0.8 && y < window.innerHeight)?1:0;
  //   stateBIn[i]=value;
  // }
  
  var mousePos = [0,0];
  console.log(mousePos);
  var mouseClicked = 0;
  
  window.onmousemove=function(event){
    mousePos = [event.pageX, event.pageY];
  }
  
  document.body.onmousedown=function(){
    mouseClicked=1;
  }
  document.body.onmouseup=function(){
    mouseClicked=0;
  }
  
  const PARAMS = {
    f: 0.055,
    k: 0.06,
    Da: 1.0,
    Db: 0.5,
    BrushSize: 50,
    BrushThickness:50
  };
  const pane = new Pane();
  pane.addBinding(PARAMS,'f',{
      min:0,
      max:0.2,
      step:0.001
  });
  pane.addBinding(PARAMS,'k',{
      min:0,
      max:0.2,
      step:0.001
  });
  pane.addBinding(PARAMS,'Da',{
      min:0,
      max:1,
      step:0.01
  });
  pane.addBinding(PARAMS, 'Db',{
      min:0,
      max:1,
      step:0.01
  });
  pane.addBinding(PARAMS, 'BrushSize',{
      min:5,
      max:300,
      step:1
  });
  pane.addBinding(PARAMS, 'BrushThickness',{
      min:1,
      max:300,
      step:1
  });
  pane.addBinding

  const workgroupCount = [
    Math.round(window.innerWidth/numGroups),
    Math.round(window.innerHeight/numGroups),
    1
  ];

  sg.uniforms({ frame, res:[window.innerWidth, window.innerHeight], f:PARAMS.f, k: PARAMS.k, Da: PARAMS.Da, Db: PARAMS.Db, mousePos: mousePos, mouseDown: 0, brushSize: PARAMS.BrushSize, brushThickness: PARAMS.BrushThickness})
    .onframe( ()=>{ 
      sg.uniforms.frame = frame++;
      sg.uniforms.f = PARAMS.f;
      sg.uniforms.k = PARAMS.k;
      sg.uniforms.Da = PARAMS.Da;
      sg.uniforms.Db = PARAMS.Db;
      sg.uniforms.mousePos = mousePos;
      sg.uniforms.mouseDown = mouseClicked;
      sg.uniforms.brushSize = PARAMS.BrushSize;
      sg.uniforms.brushThickness = PARAMS.BrushThickness
    })
    .buffers({stateAIn:stateAIn,stateAOut:stateAOut,stateBIn:stateBIn,stateBOut:stateBOut})
    .backbuffer(false)
    .pingpong(1)
    .compute(computeShader,
             workgroupCount,
             {pingpong:['stateAIn','stateBIn']}
            )
    .render( shader )
    .run()
}
main()
