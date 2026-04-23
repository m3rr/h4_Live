# h4_axis / H4_AxisDriver (The Grid Assistant)

## What it is
A simple helper node for the Grid Maker (`H4_Gridinator`). It lets you build lists of settings (like a list of CFG values or a list of samplers) and save them as a "Preset" so you don't have to type them in every time you want to make a grid.

## Expanded Description
If you make a lot of comparison grids, you probably find yourself typing the same things over and over (like `7, 8, 9` for CFG or `euler, euler_a, dpmpp_2m` for samplers). 

The **Axis Driver** act like a "Memory Bank" for your grids. 
- You type your lists into its text boxes.
- You wire it to the Gridinator.
- It "drives" the grid for you, telling it exactly which settings to test.

It's handy for creating a "Standard Test" workflow that you can reuse every time you download a new model to see how it handles your favorite settings.

## Options
- **Axis X / Y Text**: Type your values here, separated by commas.
- **Axis Mode**: Tell the node what these numbers represent (e.g., Steps, CFG, or Denoise).

## Use Case Scenarios
**Scenario 1: Testing a new Model**
If you just got a new model and want to see how it looks at different Steps, you can just plug in your "Standard Steps" Axis Driver. It'll automatically tell the Gridinator to test `20, 30, and 40` steps so you can see the results instantly.

**Scenario 2: Sampler Shootout**
If you want to find the best sampler for a new LoRA, use the Axis Driver to list out your top 5 samplers. It formats everything correctly so the Gridinator doesn't get confused by typos.

## Quick Start
1. Add `H4_AxisDriver`.
2. Type in your test values (like `10, 20, 30`).
3. Connect the output to the `H4_Gridinator`.
4. Hit Queue.

---

## Dev Corner (Jargon & Logic)
- **JSON Serialization**: It converts your comma-separated lists into a structured JSON blob that the Gridinator can parse safely.
- **Type Casting**: It identifies if you typed numbers or strings and ensures the data is passed to the backend in the correct format.
