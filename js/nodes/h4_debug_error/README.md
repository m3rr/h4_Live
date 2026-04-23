# h4_debug_error / H4_DebugErrorGenerator (The Crash Test Dummy)

## What it is
A simple tool for developers (or curious users) to purposely break things. It raises an error on command so you can see how the UI handles a crash. It's mostly used to test that our "Error Popups" are working and not leaking your private info into the logs.

## Expanded Description
Testing what happens when things go wrong is usually hard because you have to wait for something actually bad to happen. 

The **Debug Error Generator** lets you fake it.
- You can trigger a "Minor" warning or a "Critical" crash.
- You can type in a custom message (like "Testing the popup").
- When you flip the **Trigger** switch and hit queue, the workflow will stop exactly at this node and show you the error.

It's useful for making sure that if you *actually* crash later, the system will tell you *why* cleanly instead of just showing you a wall of unreadable code.

## Options
- **error_type**: Pick how "bad" you want the crash to be.
- **custom_message**: The text you want to see in the error report.
- **trigger**: The "Bomb" switch. OFF is safe. ON will crash the next generation.

## Use Case Scenarios
**Scenario 1: Testing for Privacy**
Set the error message to something with your name or a file path in it. Trigger the crash. Look at the popup—it should say `[REDACTED_PATH]` instead of your actual name. This proves our security logic is working.

**Scenario 2: Seeing the "H4 Death Modal"**
We spent a lot of time making our crash windows look nice and helpful. Trigger an error if you want to see how they look or if you need to troubleshoot why they aren't appearing.

## Quick Start
1. Add the node to your canvas.
2. Set `error_type` to `warning`.
3. Set `trigger` to `ON`.
4. Queue your prompt. The system will "crash" at this node. 
5. **Remember to set trigger back to OFF** so you can keep working afterward!

---

## Dev Corner (Jargon & Logic)
- **Stack Raising**: Uses standard Python `raise ValueError()` calls to halt the `execution.py` loop.
- **Frontend Interception**: This node is the primary way we test the `h4_BigBrother.js` websocket listener, which captures and formats these errors for the user.
