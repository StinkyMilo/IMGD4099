### Aesthetic:
My first idea was to have rotating radial lights with thickness varying with volume. The second idea was inspired by the "patterns" section of the reading. I wanted to experiment with Truchet tiles, so I decided to change the pattern roughly on-beat with the song. I also had them bob up and down with the music to add a bit more motion. I combined these two at the end to give the piece a bit of cohesion, and I liked the way the radial lines sort of masked the pattern! I composed the song last summer.

### Tech:
I made the lights by calculating the angle based on the time, then deciding brightness of a pixel based on proximity to a line at that angle. I decided the number of lines by dividing up a circle into a number of pieces that varied by the sine of the time value. For the patterns, I created an array of sixteen angles, and I varied the starting index. I also decided to start with a zoomed-in tile system and then zoom out, reaching a limit. To combine the sections, I used a smoothstep with the output of the two functions.

### Feedback:
I received feedback from Arthur. The feedback put particular positive emphasis on the tiles, which I agree is the cooler of the two main parts. It also said the mask was a cool thing, which I agree with, but I didn't expect the criticism of there being too much going on, though I certainly understand it. I suppose I'm not used to making art with a lot going on at a time, so I suppose that serves as a lesson that more does not always equal better when it comes to visual art.
