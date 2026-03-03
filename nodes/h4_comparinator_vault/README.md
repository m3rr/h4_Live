# h4_comparinator_vault / H4_ComparinatorVault (The Vault)

## What it is
The persistent storage component for the A/B testing suite. It safely locks away historical generation configurations and image hashes so that your references survive program restarts and graph modifications.

## Expanded Description
The `H4_Comparinator` relies on an exhaustive history of your last 50 generations to provide its comparison functionality. However, storing this entirely in volatile browser memory or raw ComfyUI node cache means that if you refresh the page or restart your server, your hard-earned testing baseline is instantly deleted.

The Vault functions as a silent backend service architecturally decoupled from the frontend UI rendering. It hashes image arrays and connects them to a persistent metadata lookup table, ensuring that when you select an Image from 30 generations ago, the Parameter Drawer can still accurately retrieve the Seed, Prompts, and SAMPLER settings, even if the node configuration has structurally drifted since then.

## Use Case Scenarios
**Scenario 1: Multi-Session Prompt Optimization**
You are trying to derive the perfect prompt to generate a photorealistic car. You work on it for 3 hours on a Friday, locking your best result as a Reference Image in the Comparinator. You close your browser and shut down ComfyUI. On Saturday, you boot the server back up. The Vault inherently reloads the hash structure, restoring the History Strip and your locked Reference Image, allowing you to pick up testing instantly where you left off.
