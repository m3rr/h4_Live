# h4_mission_control / H4_MissionControl (The Loop Manager)

## What it is
A core tool for building automated workflows. It helps you keep track of "Loops" (doing something over and over) by remembering which iteration you're on. It's great for things like progressive refinement, where each run is slightly different from the last.

## Included Nodes
- **H4_MissionControl**: The main dashboard. It counts your runs (0, 1, 2...).
- **H4_LinearScheduler**: A tool for "ramping" values. For example, if you want your "Denoise" to start at 1.0 and drop to 0.2 over 10 runs.
- **H4_SeedGenerator**: A simple node for making your seeds change in a specific way (like adding 1 each time).

## Expanded Description
By default, ComfyUI doesn't really know that one run is related to the next. If you want to refine an image over 10 steps, you have to do a lot of manual work. 

**Mission Control** gives the workflow a "memory".
- It stores the **Loop Count** (how many times you've hit "Queue").
- It can reset that count back to zero from a button in the UI. 
- It communicates with other "H4" nodes so they all know exactly where they are in the sequence.

## Options
- **mode**: 
  - **Passive**: It just displays the current count. 
  - **Active**: It adds +1 to the count every time you hit "Queue Prompt".
- **wireless_reset**: Turn this ON if you want the "Reset" button in the menu to work for this node.

## Use Case Scenarios
**Scenario 1: Refining an image**
You want to run a prompt 5 times, but you want it to get more "precise" each time. You use the **Linear Scheduler** to lower the denoise from 1.0 down to 0.3 as the loop count goes up.

**Scenario 2: Creating a character rotation**
If you're making a 360-degree turnaround of a character, you can use the loop count to drive the "Viewpoint" in your prompt so it turns a little bit more every time you hit queue.

## Quick Start
1. Add `H4_MissionControl` and set it to **Active**.
2. Hit "Queue Prompt" a few times and watch the number go up on the node.
3. Use the `loop_count` output to drive other settings in your graph.

---

## Dev Corner (Jargon & Logic)
- **Global Persistence**: It stores the count in a Python dictionary that survives page refreshes.
- **Interpolation**: The Scheduler uses simple math (`start + (end - start) * t`) to calculate the values between your start and end points.
