struct Particle {
  pos: vec2f,
  speed: f32,
  startX: f32
};

@group(0) @binding(0) var<uniform> frame: f32;
@group(0) @binding(1) var<uniform> res:   vec2f;
@group(0) @binding(3) var<uniform> amplitude: f32;
@group(0) @binding(4) var<uniform> timeScale: f32;
@group(0) @binding(5) var<storage, read_write> state: array<Particle>;

fn cellindex( cell:vec3u ) -> u32 {
  let size = 8u;
  return cell.x + (cell.y * size) + (cell.z * size * size);
}

@compute
@workgroup_size(8,8)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  // let timeScale = 10.;
  // let amplitude = 0.1;
  let period = 60.;
  
  let ySpd = 0.005;
  let i = cellindex( cell );
  let p = state[ i ];
  var offset: f32 = 0;
  if(p.startX < -0.1){
    offset = -.8;
  }else if(p.startX > 0.1){
    offset = -1.4;
  }
  // let amp2 = amplitude*(4.*abs((frame/period + offset) - floor((frame/period + offset) + 0.5)) - 1.);
  state[i].pos.y += p.speed;
  state[i].pos.x = p.startX + sin((p.pos.y+offset)*timeScale)*amplitude;
  if(state[i].pos.y>1){
    state[i].pos.y=-1.;
  }
}