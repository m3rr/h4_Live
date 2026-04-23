# h4_docuscribe / H4_DocuScribe (The Note Taker)

## What it is
A tool that helps you keep track of your work by automatically writing "Reports" for your generations. It looks at your workflow and creates a Markdown (`.md`) file describing your prompts, seeds, and models so you don't have to remember them later.

## Expanded Description
"What were the settings for that amazing image I made three days ago?"

We've all been there. You make something great, but you've changed your workflow so much that you can't recreate it. 

**DocuScribe** acts like a personal assistant. 
1. It looks at "Anchor Node" (like your Sampler).
2. It crawls backwards to see what prompts and models you were using.
3. It makes a nice text file with tables and lists showing all the info.
4. It saves it to your `output/` folder.

It's basically an automated "Lab Notebook" for your AI art.

## Options
- **source_in**: Plug your KSampler or Save node in here so the Scribe knows what to look at.
- **report_name**: What to call the file.
- **append_mode**: If this is ON, it'll just keep adding to the same file every time you hit queue, creating a big log of all your tests.

## Use Case Scenarios
**Scenario 1: Sharing with others**
If you want to post your workflow on a site like CivitAI, you can run DocuScribe once. It'll give you a text file with all your settings that you can just copy and paste into your description.

**Scenario 2: Remembering your prompt**
If you have DocuScribe in **Append Mode**, you can go back to your output folder and see every prompt you've ever run, along with the seeds and model names. 

## Quick Start
1. Add `H4_DocuScribe`.
2. Connect your `IMAGE` or `LATENT` output to `source_in`.
3. Pick a name for your report.
4. Check your `ComfyUI/output/` folder after you run a generation.

---

## Dev Corner (Jargon & Logic)
- **Graph Traversal**: Uses a recursive algorithm to find the "Parent" nodes of the input and extract their settings.
- **GFM Formatting**: Writes the output using GitHub Flavored Markdown for better readability in text editors.
