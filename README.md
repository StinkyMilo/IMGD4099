# IMGD4099
 
## Assignment 1

You can find the video [here](https://youtu.be/MR4XaC_MEC8). The code is located in the Assignment1 folder in the repository, under wgslcode.txt

The intent paragraphs are below:

### Aesthetic:
I had two completely different ideas I combined in this animation. The first idea was to have rotating radial lights with thickness that changed depending on the amplitude of the music. The second idea was inspired by the "patterns" section of the reading. I wanted to experiment with truchet tiles, so I decided to make a way to generate them that changed roughly on-beat with the song. I also had them bob up and down with the music to add a bit more motion. I combined these two at the end to give the piece a bit of cohesion. The song I used was one I composed a long time ago 

### Tech:
On the technical side of things, I made the lights by calculating the angle based on the time, then using a formula to determine distance from a line given an angle and a point. I used the max of the proximity to each of these lines to determine the brightness, and I decided the number of lines by dividing up a circle into a number of pieces that varied by the sine of the time value. For the patterns, I created an array of sixteen angles and determined the angle by choosing an offset within that array and a number of tiles before repeating and varying both over time. To create the grid, I adapted the "tile" function in the patterns section of the book, and to angle them I used matrix multiplication on the coordinate system. I also decided to start with a zoomed-in tile system and then zoom out, reaching a limit, and for that the tanh function worked quite well. To combine the two different sections, I simply used a smoothstep with the output of the two functions, which created a nice effect where the only areas that displayed the pattern were those inside the radial lights

### Feedback:
I've posted to the discord but have yet to receive any feedback! I'll update this with a summary of it as soon as I get any.
