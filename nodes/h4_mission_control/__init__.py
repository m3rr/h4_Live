from .nodes import H4_MissionControl, H4_LinearScheduler, H4_SeedGenerator

NODE_CLASS_MAPPINGS = {
    "H4_MissionControl": H4_MissionControl,
    "H4_LinearScheduler": H4_LinearScheduler,
    "H4_SeedGenerator": H4_SeedGenerator,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_MissionControl": "h4 - Mission Control (Dashboard)",
    "H4_LinearScheduler": "h4 - Linear Scheduler (Signal Gen)",
    "H4_SeedGenerator": "h4 - Seed Generator (Signal Gen)",
}
