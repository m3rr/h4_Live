# h4_notes / H4_NoteInjector (The Labeler)

## What it is
A simple node to help you add titles and text bars to your images. It's great for making memes, labeling your tests with seeds, or just giving your work a "cinematic" look with black bars at the top or bottom.

## Expanded Description
Normally, if you want to put text on an image, you have to use a separate app or a "text to image" node that can be a bit clunky. 

The **Note Injector** just sticks a color bar on your image and types your text on it. You can have a big **Title** and a smaller **Subtitle** underneath it. It's safe and fast because it doesn't use the AI to "draw" the text; it just paints it on after the generation is done.

## Options
- **bar_height**: How thick you want the black (or colored) bar to be.
- **position**: Toggle between Top or Bottom.
- **font_size**: Change how big the titles and subtitles look.
- **color**: Pick your text and bar colors.

## Use Case Scenarios
**Scenario 1: Making AI Memes**
Type your funny text in the Title box, set it to Top, and you've got a meme ready to go.

**Scenario 2: Remembering your settings**
If you're doing a lot of tests, you can wire your "Seed" and "CFG" strings into the Subtitle. That way, the info is "burned" into the image itself and you'll never lose it.

## Quick Start
1. Add `H4_NoteInjector` before your Save node.
2. Type whatever you want in the Title and Subtitle boxes.
3. Use the sliders to move and resize the text.

---

## Dev Corner (Jargon & Logic)
- **Rasterization**: Uses the PILLOW (PIL) library to draw the text directly onto the pixel array.
- **Font Search**: Automatically looks for common fonts on your system (like Arial) and falls back to a basic one if it can't find them.
