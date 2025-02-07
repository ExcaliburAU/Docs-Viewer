# This plugin is WIP

## Overview

The **Objective Marker System** provides a set of features to display, manage, and interact with in-game objective markers. This document details each feature, available options, and how they can be configured.

---

## Feature Summary

| Feature                          | Status | Configurable Properties (Class)                                                   |
| -------------------------------- | :----: | --------------------------------------------------------------------------------- |
| **Icon Stacking Prevention**     |   ✅    | `bStackPreventionEnabled` (`UWidgetOverlay`)                                      |
| **Off-Screen Markers**           |   ✅    | `bOffScreenEnabled` (`UWidgetOverlay`)                                            |
| **Size by Distance**             |   ✅    | `bScaleByDistance` (`UWidgetOverlay`) <br>`SizeCurve` (`UWidgetOverlay`)          |
| **Show Distance**                |   ✅    | `bShowDistance` (`UWidgetOverlay`) <br>`DistanceUnits` (`UWidgetOverlay`)         |
| **Fade Out When Close**          |   ✅    | `FadeStartDistance` (`UWidgetOverlay`)                                            |
| **Arrows When at Edge**          |   ✅    | `ArrowStyle` (`UWidgetIcon`)                                                      |
| **Occlusion**                    |   ✅    | `bEnableOcclusion` (`UActorComponent`) <br>`OcclusionChannel` (`UActorComponent`) |
| **Screen Space Padding**         |   ✅    | `ScreenPadding` (`UWidgetOverlay`)                                                |
| **3D Depth (Up/Down Indicator)** |   ⬜    | `bEnableDepthIndicator` (`UWidgetIcon`) <br>`DepthThreshold` (`UWidgetIcon`)      |
| **Custom Icon**                  |   ✅    | `CustomIconMaterial` (`UActorComponent`)                                          |
| **Visibility Groups/Tags**       |   ⬜    | `VisibilityTags` (`UActorComponent`)                                              |

---

## Feature Details

### **Icon Stacking Prevention**

Prevents multiple markers from overlapping in screen space by slightly offsetting their positions.

### **Off-Screen Markers**

Keeps markers anchored at the screen edges when the objective moves out of view.

#### Properties (UWidgetOverlay):

- `bOffScreenEnabled` _(bool)_ – Enables or disables off-screen anchoring.

---

### **Size by Distance**

Scales the marker size based on distance from the player.

#### Properties (UWidgetOverlay):

- `bScaleByDistance` _(bool)_ – Toggles size scaling.
- `SizeCurve` _(UCurveFloat_) – Defines the scaling curve.

---

### **Show Distance**

Displays a numerical value indicating the objective's distance.

#### Properties (UWidgetOverlay):

- `bShowDistance` _(bool)_ – Enables/disables distance display.
- `DistanceUnits` _(enum)_ – Specifies units (meters, feet, etc.).

---

### **Fade Out When Close**

Reduces marker opacity when the player gets near.

#### Properties (UWidgetOverlay):

- `FadeStartDistance` _(float, min: 0)_ – Distance at which fading begins.

---

### **Arrows When at Edge**

Displays arrows at the screen edge pointing toward off-screen objectives.

#### Properties (UWidgetIcon):

- `ArrowStyle` _(struct)_ – Defines arrow appearance and animation.

---

### **Occlusion**

Hides or fades markers if blocked by obstacles.

#### Properties (UActorComponent):

- `bEnableOcclusion` _(bool)_ – Enables/disables occlusion.
- `OcclusionChannel` _(ECollisionChannel)_ – Defines which collision channel to check for occlusion.

---

### **Screen Space Padding**

Ensures markers don’t get too close to screen edges.

#### Properties (UWidgetOverlay):

- `ScreenPadding` _(float)_ – Defines padding amount.

---

### **3D Depth (Up/Down Indicator)**

Indicates whether an objective is above or below the player.

#### Properties (UWidgetIcon):

- `bEnableDepthIndicator` _(bool)_ – Enables/disables depth indicators.
- `DepthThreshold` _(float)_ – Distance threshold for depth indicators.

---

### **Custom Icon**

Allows different icons per objective type.

#### Properties (UActorComponent):

- `CustomIconMaterial` _(UMaterialInstance_) – Sets a custom material or icon.

---

### **Visibility Groups/Tags**

Groups objectives into categories for dynamic visibility filtering.

#### Properties (UActorComponent):

- `VisibilityTags` _(TArray_) – Defines tags for filtering.
