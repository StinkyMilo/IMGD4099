## Intent

The basic idea I had at the beginning was a sort of "stinky object in a cartoon" based particle effect, with green swirls wafting upwards. I knew I wouldn't emulate it exactly because those tend to be made of lines rather than particles, but I figured the basic concepts would make it through. The basic setup was to initialize particles on the bottom of the screen in one of three groups. Then I moved them upwards over time and adjusted their X values based on their Y value and which of the three groups they were in to create a sort of "wafting" effect. I then allowed the particles to fade out according to the Y value. I implemented controls for adjusting the frequency and amplitude of the sin wave that affects the X values. Lastly, I wanted to see if I could make differently-shaped particles, and I managed to figure out how to get the particle-space coordinates so that I could draw arbitrary shapes and colors onto the particles! In this case, though, all I used it for was to make them circular.

## Feedback

I haven't received any feedback yet! I'll upload here when I do!