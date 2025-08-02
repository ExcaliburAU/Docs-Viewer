## Key Features of Excalibur Stacks

- **Item Compatibility**: Destroyed structures return properly stacked items.
- **Crafting Integration**: Fully compatible with vanilla engrams for the mortar and pestle.
- **Optimized Tools**: Slingshot, fishing rod, and jerky function without issues.
- **Compatibility**: Works exclusively with Excalibur Stacks. Other stacking mods are not supported.
## Important Notes
### Mod Priority
Place **Excalibur Stacks** as high as possible in the mod load order within `GameUserSettings.ini`. This ensures the mod functions correctly.
### Post-Installation Steps
- Use a "Mindwipe Tonic" to relearn crafting recipes (e.g., Sparkpowder, Cementing Paste).
- Rebuild crafting structures like Mortar and Fabricator to enable stacking functionality.
### Known Behaviours
- **Old Resources**: Resources created prior to mod installation will not stack—this is expected behaviour.
- **Mod Removal**: Resources made using the mod will disappear if the mod is removed.
- **Switching Mods**:
  - Switching to a smaller mod reduces stack sizes.
  - Switching to a larger mod only affects newly crafted stacks.
## Configuration Settings
### Modifying `GameUserSettings.ini`
Add the following section to configure Excalibur Stacks:
```ini
[ExcaliburStacks]
ExStryderBoxSlotCount=300
ExStryderBoxDepositRange=250
ExStryderBoxWeightReduction=0.1
ExStryderBoxItemBlackList=
ActivateTransmitterFunction=false
```
### Example: Blacklisting Items
To prevent certain items from being pulled into the Excalibur Stryder Box:

```ini
ExStryderBoxItemBlackList=Wood,Stone
```
```ini
ExStryderBoxItemBlackList=PrimalItemResource_Wood,PrimalItemResource_Stone
```