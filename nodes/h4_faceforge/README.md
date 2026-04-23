# h4_faceforge / H4_FaceForge (The Face Swapper)

## What it is
A simple but high-quality tool for swapping faces in your images. It goes beyond basic swappers by adding steps to make the result look more realistic, like cleaning up the features and making sure the skin texture matches the rest of the image.

## Expanded Description
Face swapping can often look a bit "fake"—the skin might look too smooth, or the jawline might have a weird edge where it was pasted in. 

The **FaceForge** suite tries to fix this:
1. **The Swap**: It takes a reference photo and puts that face onto your generated character.
2. **The Cleanup**: It uses tools like CodeFormer to sharpen the eyes and mouth so they don't look blurry.
3. **The Texture**: (Optional) You can use the **FaceDetailer** to add realistic pores and grain back onto the face so it doesn't look like plastic.

## Options
- **ref_image**: The "face" you want to use. You can just plug in a photo.
- **restore_visibility**: How much "cleanup" you want. 0.8 is usually a good starting point.
- **feather**: How soft the edges of the face should be so it blends in better.

## Use Case Scenarios
**Scenario 1: Putting yourself in a scene**
Plug a photo of yourself into the `ref_image` and your cinematic prompt into the sampler. The FaceForge will "graft" your face onto the character, and the cleanup pass will make sure you look high-res enough to match the scene.

**Scenario 2: Making characters consistent**
If you're making a comic or a story, you can use one "Reference" face for your hero every time. That way, they always look like the same person in every single generation.

## Quick Start
1. Add `H4_FaceForge`.
2. Connect your main image and your "Reference" face photo.
3. If the face looks a bit "off," try adjusting the `feather` or increasing the `restore_visibility` slider.

---

## Dev Corner (Jargon & Logic)
- **InsightFace**: Uses the InsightFace library to calculate the 128 or 512-dimensional vector that represents a face.
- **CodeFormer / GFPGAN**: These are used as a secondary pass to "fix" the low-resolution output of the base swapper.
- **Alpha Masking**: It creates a soft-edged mask based on facial landmarks to ensure the swap blends into the hair and neck naturally.
