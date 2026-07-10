---
"@timelinx/core": minor
---

`KeyframeTool`: clicking on a clip that has no effects now auto-creates a default `brightness` effect and adds a keyframe to it, instead of silently doing nothing. The transaction includes both `ADD_EFFECT` and `ADD_KEYFRAME` operations. This removes the friction of having to manually add an effect before placing keyframes.
