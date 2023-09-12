### Aesthetic:
The intent here was to make a shader that turns the user into an eldritch abomination, capturing the feeling of an unknown, distorted face peeking out in the dark. The style is majorly inspired by Alex Kister’s The Mandela Catalogue series. I had a lot of fun capturing strange images of my face with this shader, so just for fun I’ve included a folder of them here! It works best if you use it in a dark room.


### Tech:
The greyscale values are calculated like so: first, the RGB values of the image are averaged. Then, the brightness is put through a smoothstep function between itself and 0, using the user-defined threshold as the value of x. This causes an increased contrast between light and dark areas. Finally, I round the brightness to one of greyres (user-adjustable variable) evenly distributed shades of grey. There is also cellular-noise-based distortion. The image is offset by a proportion of the distance from each point to its closest reference point. If feedback mode is enabled (by toggling space), a past brightness will also be calculated and subtracted from the final brightness value, emphasizing motion and darkening the background. When the mouse is held, the y coordinate is moved by a polynomial function that stretches out the center of the frame.

### Feedback:
Not received yet!