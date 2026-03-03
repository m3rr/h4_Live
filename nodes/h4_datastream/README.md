# h4_datastream / H4_DataStream (Batch Loader)

## What it is
A folder-based batch loader that automatically queues the next execution, allowing you to churn through an entire directory of inputs sequentially without clicking "Queue Prompt" 50 times in a row.

## Expanded Description
When applying a complex workflow (like a face swap pipeline, upscale process, or color grade) to a large volume of images, ComfyUI natively struggles without external queuing scripts. The `H4_DataStream` node handles directory ingestion at a native level. 

It tracks its internal index within the execution state memory. Once it finishes passing an image payload into the graph, if `auto_queue_remaining` is enabled and files remain in the target directory, it programmatically pushes another execute event to the ComfyUI API. It turns static workflows into autonomous rendering farms.

## Inputs and Settings
- **directory_path**: The absolute or relative path to your folder full of source material.
- **index**: The starting point. 0 is the first file.
- **auto_queue_remaining**: If True, the node will chain-execute ComfyUI until the folder is completely processed.

## Use Case Scenarios
**Scenario 1: The Video Frame Processor**
You have exported an MP4 video into 600 individual `.png` frames in a `temp_frames/` directory. You want to run an Img2Img style transfer on all of them. You point `H4_DataStream` to the folder, enable `auto_queue_remaining`, hit "Queue Prompt" once, and go to sleep. The node sequentially loads Frame 001, processes it, tells Comfy to run again for Frame 002, and continues until Frame 600 is complete.

**Scenario 2: The Dataset Scrubber**
You have downloaded 50 images from Pinterest that you want to use for a dataset, but they need to be cropped to 1024x1024 and background-removed. You setup the workflow, attach DataStream as the origin node, and let it churn through the directory hands-free.

## Examples
- **Basic Usage**:
  1. Create a folder named `batch_input` inside your ComfyUI root directory.
  2. Put 10 images in the folder.
  3. In `H4_DataStream`, set the path to `./batch_input`.
  4. Ensure `index` is `0` and `auto_queue_remaining` is `True`.
  5. Connect the `IMAGE` output to your workflow.
  6. Click "Queue Prompt" (just once). The UI will process image 0, automatically queue itself again, process image 1, and so on until it reaches image 9.
