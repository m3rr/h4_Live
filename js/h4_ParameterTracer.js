import { app } from "../../scripts/app.js";

// ------------------------------------------------------------------------------
// H4 Parameter Tracer
// Smart Graph Crawler that hunts down KSamplers, Prompts, and Checkpoints.
// ------------------------------------------------------------------------------

export const ParameterTracer = {

    async trace(node, inputName) {
        console.log(`[H4 Tracer] 🕵️ Starting hunt for: ${inputName} on Node ${node.id}`);

        const graph = app.graph;
        const visited = new Set();
        const results = {
            ckpt: "Unknown",
            vae: "Unknown",
            loras: [],
            sampler: {},
            prompt_pos: "",
            prompt_neg: "",
            seed: "0",
            resolution: "Unknown"
        };

        // Find the link connected to the input
        const input = node.inputs?.find(i => i.name === inputName);
        if (!input || !input.link) {
            console.log(`[H4 Tracer] 🛑 Input ${inputName} is disconnected.`);
            return results;
        }

        const link = graph.links[input.link];
        if (!link) return results;

        const originNode = graph.getNodeById(link.origin_id);

        // Start recursive crawl
        await this._crawl(originNode, visited, results, graph);

        return results;
    },

    async _crawl(node, visited, results, graph) {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);

        const type = node.comfyClass || node.type;
        // console.log(`[H4 Tracer] Visiting: ${type} (${node.id})`);

        // --- DETECT INTERESTING NODES ---

        // 1. KSampler (The Holy Grail)
        if (type.includes("KSampler")) {
            this._extractWidget(node, "seed", results, "seed");
            this._extractWidget(node, "steps", results, "sampler");
            this._extractWidget(node, "cfg", results, "sampler");
            this._extractWidget(node, "sampler_name", results, "sampler");
            this._extractWidget(node, "scheduler", results, "sampler");
            this._extractWidget(node, "denoise", results, "sampler");

            // Continue upstream for checkponts/prompts connected to the sampler
            // KSampler inputs: model, positive, negative, latent_image
            this._followInput(node, "model", visited, results, graph);
            this._followInput(node, "positive", visited, results, graph);
            this._followInput(node, "negative", visited, results, graph);
            this._followInput(node, "latent_image", visited, results, graph);
            return;
        }

        // 2. Checkpoint Loader
        if (type.includes("CheckpointLoader") || type.includes("Load Checkpoint")) {
            this._extractWidget(node, "ckpt_name", results, "ckpt");
            return;
        }

        // 3. Prompts (CLIPTextEncode)
        if (type.includes("CLIPTextEncode") || type.includes("Prompt")) {
            // Distinguish positive/negative? 
            // We usually know this based on which KSampler pin requested it, 
            // but for now let's just grab the text.
            const text = this._getWidgetValue(node, "text");
            if (text) {
                // Heuristic: If we are here via a path that *started* at 'positive', assign to pos
                // But the crawl is generic. We'll append to a generic list or try to guess.
                // For now, let's just store unique prompts found.
                // BETTER: The KSampler crawl step knows if it's following 'positive' or 'negative'.
                // Refactor crawl to accept "context"?
            }
            return;
        }

        // 4. LoRA Loader
        if (type.includes("LoRA")) {
            const loraName = this._getWidgetValue(node, "lora_name");
            const strength = this._getWidgetValue(node, "strength_model");
            if (loraName) results.loras.push({ name: loraName, val: strength });
            this._followInput(node, "model", visited, results, graph);
            return;
        }

        // 5. VAE Output (Decode)
        if (type.includes("VAEDecode")) {
            this._followInput(node, "samples", visited, results, graph); // Go find the latent
            return;
        }

        // 6. Reroutes / Pipes / Context
        // Just follow all inputs for generic nodes?
        // For simple passthroughs, follow the first active input link?
        if (node.inputs) {
            for (const inp of node.inputs) {
                if (inp.link) {
                    const link = graph.links[inp.link];
                    if (link) {
                        const nextNode = graph.getNodeById(link.origin_id);
                        await this._crawl(nextNode, visited, results, graph);
                    }
                }
            }
        }
    },

    _followInput(node, slotName, visited, results, graph) {
        const input = node.inputs?.find(i => i.name === slotName);
        if (input && input.link) {
            const link = graph.links[input.link];
            if (link) {
                const upstreamNode = graph.getNodeById(link.origin_id);
                // Simple Context Hack: If slotName is 'positive', we could tell the crawler "hunting for positive"
                // For this MVP, let's just pass the node and handle logic there.

                // Specific Prompt Handling
                if (slotName === "positive") {
                    this._extractPrompt(upstreamNode, visited, results, "prompt_pos", graph);
                } else if (slotName === "negative") {
                    this._extractPrompt(upstreamNode, visited, results, "prompt_neg", graph);
                } else {
                    this._crawl(upstreamNode, visited, results, graph);
                }
            }
        }
    },

    async _extractPrompt(node, visited, results, targetField, graph) {
        if (!node || visited.has(node.id + "_" + targetField)) return;
        visited.add(node.id + "_" + targetField); // Unique visit per context

        const type = node.comfyClass || node.type;

        if (type.includes("CLIPTextEncode") || type.includes("Prompt")) {
            const val = this._getWidgetValue(node, "text");
            if (val) results[targetField] = val;
            // Also follow upstream for chained prompts?
            return;
        }

        // Pass through (Reroute, etc)
        if (node.inputs) {
            for (const inp of node.inputs) {
                if (inp.link) {
                    const link = graph.links[inp.link];
                    if (link) {
                        const next = graph.getNodeById(link.origin_id);
                        this._extractPrompt(next, visited, results, targetField, graph);
                    }
                }
            }
        }
    },

    _getWidgetValue(node, widgetName) {
        if (!node.widgets) return null;
        const w = node.widgets.find(w => w.name === widgetName);
        return w ? w.value : null;
    },

    _extractWidget(node, widgetName, results, section) {
        const val = this._getWidgetValue(node, widgetName);
        if (val !== null) {
            if (section === "top") results[widgetName] = val;
            else if (section === "sampler") results.sampler[widgetName] = val;
            else if (section === "ckpt") results.ckpt = val;
            else if (section === "seed") results.seed = val;
        }
    }
};
