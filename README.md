# IMGD4900
 
## Assignment 1

You can find the video [here](https://youtu.be/JNeKcx3hgeg). The code is located in the Assignment1 folder in the repository, under wgslcode.txt

The primary idea I wanted to explore was lines moving radially around the screen like a clock. Incorporating audio afterward was an interesting challenge, because most of the parameters I could vary ended up looking rather bad if they didn't vary continuously. Since audio levels can be very "spiky" changing values a lot from frame to frame, it took me a while to find something that could vary spikily without disrupting the flow of the shader. Eventually, though, I found that varying line thickness was a good way to do it.

I found it interesting to plug in floating point values that didn't really "make sense" the way I had built the code. I first did this by adjusting the increment of my for loop to, rather than dividing the circle into an integer number of lines, dividing it into a continually varying floating point number, which created much more interesting patterns. I also changed the thickness multiplier to -1. This caused everywhere to be bright, but proximity to the lines still caused distortion. It looked very different from the standard line rotation, but it still brought out changes in volume very effectively, so I decided to switch between positive and negative multipliers throughout the song. My choice of song was somewhat arbitrary, but I decided to do a song I composed last summer and give it a bit of a video.

