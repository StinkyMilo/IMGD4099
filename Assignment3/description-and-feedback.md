## Intent

I explored the option of orientation in two different ways in this assignment. First, I made the reaction occur more slowly the higher up it's located by multiplying the reaction by a lower factor the higher on the screen the pixel was located. This didn't actually change very much, so I also changed the convolution to weight the upper pixels slightly higher than the lower ones, which caused a bit of a flow upwards and an expansion downwards. Adjusting the kill rate slightly, I formed some cool jellyfish creatures!


## Feedback


I received feedback from Sam. What I found most interesting is that they also dubbed the patterns the diffusion created as jellyfish. The recognizable pattern of objects is something I'm quite happy with! They also said they thought it was cool, which is a win in my book. Interestingly, the mouse was working strangely for them, likely due to the half-screen offset problem we discussed. But I tried it on two separate computers and it worked the same on both; I'm very interested to see if we ever figure out why indexing the pixels is so weird!