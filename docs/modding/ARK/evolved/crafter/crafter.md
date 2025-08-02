---
title: Excalibur Crafter
icon: 
defaultOpen: false
showfolderpage: true
sort: 1
---
**MOD ID: 2977491936**

A streamlined crafting bench that lets you craft any engram you've learned—no need to hunt down specific workbenches. Just make sure the engrams are unlocked on your character. Perfect for centralized crafting in custom setups or modded servers.

**GameUserSetting:**  
```ini
[ExcaliburCrafter]
FoundationRequired=true
CraftingSpeed=12.0
SlotCount=600
PreventStructurePickup=true
```  
**Engram Entry Override:**  
```
OverrideNamedEngramEntries=(EngramClassName="EngramEntry_ExcaliburCrafter_C",EngramHidden=true)
```

**Spawn Code:**  
```
admincheat GiveItem "Blueprint'/Game/Mods/ExcaliburCrafter/BP/PrimalItemStructure_ExcaliburCrafter.PrimalItemStructure_ExcaliburCrafter'" 1 1 0
```
