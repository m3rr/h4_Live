# h4_debug_error / H4_DebugErrorGenerator (The Crash Test Dummy)

## What it is
A developer-centric structural testing node explicitly designed to raise raw exceptions (`ValueError`, `RuntimeError`, `TypeError`) into the ComfyUI execution stack on command.

## Expanded Description
Testing error handling in complex UI environments is traditionally very difficult because you have to wait for something legitimate to break. The `H4_DebugErrorGenerator` forces a failure state so you can observe how the system responds.

Within the `h4_Live` ecosystem, we use aggressive, highly-detailed "Death Modals" (error popups) that attempt to capture the system state, sanitize private file paths, and provide a Github search link. This node allows developers or users to generate synthetic errors to verify that these custom UI interceptors and `h4_BigBrother.js` notification listeners are functioning properly.

## Parameters
- **error_type**: Dropdown selecting the severity (`none`, `minor`, `warning`, `critical`).
- **trigger**: A boolean toggle. The node will only throw the error when this is True.

## Use Case Scenarios
**Scenario 1: Verifying Privacy Sanitization**
You are recording a video tutorial or sharing your screen, and you want to ensure that if ComfyUI crashes, your internal Windows username (e.g., `C:\Users\JohnDoe_Secret\`) is not broadcast to the world in the stack trace. You set this node to `warning` and trigger it. A simulated path with sensitive data is raised. You verify that the resulting popup successfully redacted the name to `[REDACTED_USERNAME]`.

**Scenario 2: Testing Workflows for Fail-Safes**
You are building an autonomous API wrapper around ComfyUI. You place this node mid-workflow and intentionally set it to throw a `critical` exception to see how your master script handles a mid-render process death.

## Examples
- **To crash the system:**
  1. Add the node to your canvas.
  2. Set `error_type` to `critical`.
  3. Set `trigger` to `True`.
  4. Queue the prompt. The node will execution-halt ComfyUI and throw a massive traceback simulation.
  5. *Remember to set trigger back to False when you're done, or you'll be trapped in a crash loop forever.*
