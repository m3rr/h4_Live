from .nodes import H4_TrafficRouter, H4_TrafficCop, H4_TrafficMerge, H4_StateMonitor, H4_LoopIncrementer, H4_WirelessResetButton, H4_ImageBuffer

NODE_CLASS_MAPPINGS = {
    "H4_TrafficRouter": H4_TrafficRouter,
    "H4_TrafficCop": H4_TrafficCop,
    "H4_TrafficMerge": H4_TrafficMerge,
    "H4_StateMonitor": H4_StateMonitor,
    "H4_LoopIncrementer": H4_LoopIncrementer,
    "H4_WirelessResetButton": H4_WirelessResetButton,
    "H4_ImageBuffer": H4_ImageBuffer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_TrafficRouter": "h4 - Traffic Router",
    "H4_TrafficCop": "h4 - Traffic Cop (Splitter)",
    "H4_TrafficMerge": "h4 - Traffic Merge (Zipper)",
    "H4_StateMonitor": "h4 - State Monitor",
    "H4_LoopIncrementer": "h4 - Loop Incrementer",
    "H4_WirelessResetButton": "h4 - Wireless Reset Button",
    "H4_ImageBuffer": "h4 - Universal Buffer",
}

# [H4] Standalone Modularity
WEB_DIRECTORY = "./web"
