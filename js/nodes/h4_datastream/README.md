# h4_datastream / H4_DataStream (The Batch Loader)

## What it is
A simple tool for processing a whole folder of images at once. Instead of loading one image and hitting "Queue" over and over, you just point this node at a folder and it'll automatically run through every file inside, one by one.

## Expanded Description
If you have 100 images that you want to upscale or face-swap, doing it manually is a drag. 

The **DataStream** node automates the boring part. 
- You give it a **Folder Path**. 
- You turn on **Auto-Queue**.
- You hit "Queue Prompt" once.
The node will load the first image, let your workflow finish, and then "tell" ComfyUI to start the next run for the second image. It keeps going until the folder is empty. It's basically a "Set it and forget it" button for big jobs.

## Options
- **directory_path**: Where your images are hidden. You can use full paths like `C:\Images\MyBatch`.
- **auto_queue_remaining**: If this is ON, it will start the next run automatically as soon as the current one is done.
- **index**: Start at `0` for the first image, or pick a higher number if you want to skip ahead.

## Use Case Scenarios
**Scenario 1: Fixing a whole video**
If you have a video that you split into frames, you can use this to run your "Fix" workflow on every single frame while you go get a coffee. 

**Scenario 2: Cleaning up a dataset**
If you have 200 reference photos that all need to be cropped or sharpened, just put them in a folder and let DataStream feed them into your workflow one-by-one.

## Quick Start
1. Add `H4_DataStream`.
2. Type in your folder path.
3. Turn on **Auto-Queue**.
4. Hit "Queue Prompt" (just once!) and watch it work through the list.

---

## Dev Corner (Jargon & Logic)
- **API Triggering**: It uses the internal ComfyUI prompt-queue API to push a new execution request from the backend. 
- **Index Persistence**: It stores your current "place" in the folder index so it doesn't get confused if you stop and restart.
- **List Filtering**: It automatically looks for `.png`, `.jpg`, and `.webp` files and ignores anything else (like hidden system files).
