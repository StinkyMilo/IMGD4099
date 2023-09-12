import { default as seagulls } from './seagulls.js'
import { default as Video    } from './video.js'
import { default as Audio    } from './audio.js'
import {Pane} from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.1/dist/tweakpane.min.js';

const shader = `
@group(0) @binding(0) var<uniform> frame: f32;
@group(0) @binding(1) var<uniform> res:   vec2f;
@group(0) @binding(2) var<uniform> audio: vec3f;
@group(0) @binding(3) var<uniform> mouse: vec3f;
@group(0) @binding(4) var<uniform> threshold: f32;
@group(0) @binding(5) var<uniform> greyres: f32;
@group(0) @binding(6) var<uniform> mouseDown: f32;
@group(0) @binding(7) var<uniform> feedbackMode: f32;
@group(0) @binding(8) var backSampler:    sampler;
@group(0) @binding(9) var backBuffer:     texture_2d<f32>;
@group(0) @binding(10) var videoSampler:   sampler;
@group(1) @binding(0) var videoBuffer:    texture_external;

@vertex 
fn vs( @location(0) input : vec2f ) ->  @builtin(position) vec4f {
  return vec4f( input, 0., 1.); 
}

fn doRotate(pos: vec2f, angle: f32) -> vec2f{
  var pos2: vec2f;
  pos2 = pos-.5;
  pos2 = mat2x2f(cos(angle),-sin(angle),sin(angle),cos(angle))*pos2;
  pos2+=.5;
  return pos2;
}

fn random2( p: vec2f ) -> vec2f{
    return fract(sin(vec2(dot(p,vec2f(127.1,311.7)),dot(p,vec2f(269.5,183.3))))*43758.5453);
}

fn getBrightness(colors: vec4f) -> f32{
  var brightness: f32;
  brightness = (colors.r + colors.g + colors.b)/3.;
  brightness = smoothstep(brightness,0.,threshold);
  return (brightness-brightness%(1./greyres))*(greyres/(greyres-1.));
}

@fragment 
fn fs( @builtin(position) spos : vec4f ) -> @location(0) vec4f {
  var pos: vec2f;
  pos=spos.xy/res;
  //Flip video
  pos.x=1.-pos.x;
  
  if(mouseDown>.5){
    // pos=doRotate(pos,-tau/16.);
    //Crap; this concentrates values toward the middle. I want it to do the opposite.
    pos.y = 4.*pow(pos.y-.5,3.)+.5;
  }
  
  let tileCount=4.;
  var posTileSpace: vec2f;
  posTileSpace = pos*tileCount;
  let floorPosTileSpace = floor(posTileSpace);
  let fractPosTileSpace = fract(posTileSpace);
  let tau = 6.2831;
  var mdist: f32;
  mdist=100.;
  let t = frame/30.;
  var mpoint: vec2f;
  
  let t2 = frame/30.-1;
  var mdist2: f32;
  mdist2=100.;
  var mpoint2: vec2f;
  
  for(var i = -1; i <= 1; i++){
    for(var j = -1; j <= 1; j++){
      let neighbor = vec2f(f32(j),f32(i));
      var point: vec2f;
      //In the future; might want to make things jump around more. Right now we're just going by the example.
      point = random2(floorPosTileSpace + neighbor);
      point = 0.5+0.5*sin(t + tau * point);
      let diff = neighbor + point - fractPosTileSpace;
      let dist = length(diff);
      
      var point2: vec2f;
      point2 = random2(floorPosTileSpace + neighbor);
      point2 = 0.5+0.5*sin(t2 + tau*point2);
      let diff2 = neighbor + point2 - fractPosTileSpace;
      let dist2 = length(diff2);
      
      if(dist<mdist){
        mdist=dist;
        mpoint=point;
      }
      
      if(dist2<mdist2){
        mdist2=dist2;
        mpoint2=point2;
      }
    }
  }
  
  //I want to move the coordinate system toward mpoint
  //If we're close to mpoint, move to it
  //If our distance from mpoint is close enough to 1, stay as is.
  // let mdistScreenSpace = mdist/tileCount;
  // let mpointScreenSpace = mpoint/tileCount;
  // posTileSpace=smoothstep(posTileSpace,mpoint,vec2f(mdist));
  // pos=posTileSpace/tileCount;
  // return vec4f(mdistScreenSpace);
  
  var lastPos: vec2f;
  lastPos = pos.xy;
  
  pos+=vec2f(mdist/20.);
  
  lastPos+=vec2f(mdist2/20.);
  
  
  
  var vid: vec4f;
  vid = textureSampleBaseClampToEdge( videoBuffer, videoSampler, pos.xy);
  // let rawVid = textureSampleBaseClampToEdge( videoBuffer, videoSampler, spos.xy);
  //Not actually using the feedback buffer, but recalculating the brightness of the current frame
  //for 30 frames ago and subtracting the corresponding value.
  //This will darken a bright background.
  let feedback  = textureSampleBaseClampToEdge( videoBuffer, videoSampler, lastPos.xy);
  var brightness: f32;

  
  brightness = getBrightness(vid);
  var lastBrightness: f32;
  if(feedbackMode>.5){
    lastBrightness = getBrightness(feedback); 
  }else{
    lastBrightness=0.;
  }
  
  return vec4f(brightness-lastBrightness);
}`

async function main() {
  let frame = 0;
  //Recommended to be in a dark area
  document.body.onclick = Audio.start;
  // const canvas = document.getElementById("fb");
  // const ctx = canvas.getContext("2d");
  await Video.init();

  const sg = await seagulls.init();
  const PARAMS = { threshold:.4, greyres:4 }
  const pane = new Pane();
  var mouseDown=0;
  var feedbackMode = 0;
  
  document.body.onmousedown = function(){
    console.log("mouse down!");
    mouseDown=1;
  }
  
  document.body.onmouseup = function(){
    mouseDown=0;
  }
  
  document.body.onkeypress = function(event){
    if(event.key==" "){
      feedbackMode = 1-feedbackMode;
    }
  }
  
  pane.addBinding( PARAMS, 'threshold', {
    min: 0.0,
    max: 1.0,
  });
  pane.addBinding(PARAMS, 'greyres',{
    min:2,
    max:16,
    step:1
  });

  sg.uniforms({ 
    frame:0, 
    res:[window.innerWidth, window.innerHeight],
    audio:[0,0,0],
    mouse:[0,0,0],
    threshold:0,
    greyres:0,
    mousedown:0,
    feedbackMode:0
  })
  .onframe( ()=> {
    sg.uniforms.frame = frame++;
    sg.uniforms.audio = [ Audio.low, Audio.mid, Audio.high ];
    sg.uniforms.threshold = PARAMS.threshold;
    sg.uniforms.greyres= PARAMS.greyres;
    // setTimeout(()=>ctx.drawImage(Video.element,0,0,canvas.width,canvas.height),1);
    sg.uniforms.mousedown=mouseDown;
    sg.uniforms.feedbackMode=feedbackMode;
  })
  .textures([ Video.element]) 
  .render( shader, { uniforms: ['frame','res', 'audio', 'mouse','threshold','greyres' ,'mousedown','feedbackMode'] })
  .run();


  
}

main()
