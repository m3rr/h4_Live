# h4_seed_sequencer / H4_SeedSequencer (The Seed Manager)

## What it is
A simple tool for managing your random seeds. It gives you a few different ways to generate numbers for your samplers—Fixed (keep the same), Increment (add 1 each time), or Random (fresh every time). It can also force your seeds to stay short (like 4 digits) so they're easier to remember and share.

## Expanded Description
The problem with normal seeds is they're hard to control. Sometimes you want them to stay the same, but you accidentally hit "randomize". Other times you want to do a sequence (0, 1, 2...) for an animation and it's a pain to type it in manually every time.

The **Seed Sequencer** does the work for you.
- **Fixed**: It just stays on whatever number you picked.
- **Increment**: It adds a "step" (like +1) every time you click queue. Great for frame-by-frame tests.
- **Random**: It picks a new number every time, but you can tell it how many digits to use. 4 digits? 15 digits? It's up to you.

## Options
- **mode**: Pick between Fixed, Increment, or Random.
- **random_digits**: Choose how long the random number should be (4-15 digits).
- **auto_advance**: If this is ON, the node will "move to the next number" automatically every time you run the workflow.

## Use Case Scenarios
**Scenario 1: Making a simple animation**
If you're doing a character rotation and want 30 frames, set it to **Increment** and hit queue 30 times. The seeds will go `1, 2, 3...` perfectly, so you don't have to think about it.

**Scenario 2: Shareable seeds**
Set your **random_digits** to 4. Instead of a seed like `752938475294875`, you get `4921`. It's much easier to tell a friend "Hey, try seed 4921" or write it down in your notes.

## Quick Start
1. Add `H4_SeedSequencer`.
2. Convert your Sampler's `seed` widget to an input and plug this in.
3. Turn on **Auto-Advance** if you want it to change every time you hit Queue.

---

## Dev Corner (Jargon & Logic)
- **State Memory**: It remembers the last seed in a hidden Python dictionary so it doesn't lose its place if you refresh.
- **Constraint Hub**: It prevents leading zeros in random mode by using a mathematical range (`10^n to 10^n-1`).
