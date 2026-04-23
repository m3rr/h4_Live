# h4_visual_tokenizer / H4_VisualTokenizer (The Prompt Reader)

## What it is
A debugging tool that shows you exactly how the AI "reads" your text. It breaks your sentences into the little chunks (tokens) that the model actually understands and shows you if you've typed too much or if your "weighting" (parentheses) is working.

## Expanded Description
Prompting often feels like a guessing game. You write a long story and wonder if the AI is even paying attention to the last few words. 

The **Visual Tokenizer** lets you peek inside.
- It shows you the **Tokens**: AI doesn't see "spectacular", it might see "spec-tacu-lar". 
- It shows you the **Weights**: If you use `(word:1.5)`, it shows you that the AI is emphasizing that part.
- It shows you the **Cutoff**: Standard AI (CLIP) usually only reads the first 75 tokens perfectly. This node shows you exactly where the "overflow" starts so you don't waste time typing detail that the AI will never see.

## Options
- **clip**: You have to connect your CLIP model so it knows which "dictionary" to use.
- **prompt**: Plug your text string in here.

## Use Case Scenarios
**Scenario 1: Seeing why a prompt is ignored**
If you have a 250-token prompt and you notice the stuff at the end isn't working, this node will show you that the AI stopped "listening" after the first page of text.

**Scenario 2: Checking Trigger Words**
If you're using a LoRA with a weird trigger word like `grng-v4`, you can see if the AI breaks it into 5 separate meaningless chunks or if it recognizes it as a single concept.

## Quick Start
1. Add `H4_VisualTokenizer`.
2. Connect your `CLIP` and your `STRING` prompt.
3. Look at the grid of boxes on the node—the red ones at the end are usually "ignored" or "overflow" tokens.

---

## Dev Corner (Jargon & Logic)
- **Token IDs**: It pulls the raw vocabulary IDs directly from the CLIP transformer.
- **WebSocket HUD**: It sends the token information to the browser so it can draw the grid on the node in real-time.
- **Math Mapping**: It converts the ComfyUI bracket syntax into a numerical multiplier for each token.
