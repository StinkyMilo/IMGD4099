import { default as seagulls } from '../../seagulls.js'
import {Pane} from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.1/dist/tweakpane.min.js';

const WORKGROUP_SIZE = 8

let frame = 0

const sg = await seagulls.init(),
      render_shader  = await seagulls.import( './render.glsl' ),
      compute_shader = await seagulls.import( './compute.glsl' )

const NUM_PARTICLES = 1024, 
      // must be evenly divisble by 4 to use wgsl structs
      NUM_PROPERTIES = 4, 
      state = new Float32Array( NUM_PARTICLES * NUM_PROPERTIES )

var options = [-0.5, 0, 0.5];

for( let i = 0; i < NUM_PARTICLES * NUM_PROPERTIES; i+= NUM_PROPERTIES ) {
  state[ i ] = options[Math.floor(Math.random()*options.length)] + Math.random()*0.15 - 0.15/2;
  state[ i + 1 ] = -1+Math.random()*0.3;
  state[ i + 2 ] = Math.random()/100 + .005; 
  state[i+3] = state[i];
}

const PARAMS = {
    dropoffRate:2.5,
    amplitude: 0.1,
    timeScale: 10
  };
  const pane = new Pane();
  pane.addBinding(PARAMS,'dropoffRate',{
      min:1,
      max:6,
      step:0.1
  });
  pane.addBinding(PARAMS,'amplitude',{
    min:0,
    max:0.5,
    step:0.01
  });
  pane.addBinding(PARAMS,'timeScale',{
    min:1,
    max:20,
    step:0.1
  })

sg.buffers({ state })
  .backbuffer( false )
  .blend( true)
  .uniforms({ frame, res:[sg.width, sg.height ], dropoff: PARAMS.dropoffRate, amplitude: PARAMS.amplitude, timeScale:PARAMS.timeScale })
  .compute( compute_shader, NUM_PARTICLES / (WORKGROUP_SIZE*WORKGROUP_SIZE) )
  .render( render_shader )
  .onframe( ()=>  {
    sg.uniforms.frame = frame++;
    sg.uniforms.dropoff = PARAMS.dropoffRate;
    sg.uniforms.amplitude = PARAMS.amplitude;
    sg.uniforms.timeScale = PARAMS.timeScale;
  }  )
  .run( NUM_PARTICLES )
