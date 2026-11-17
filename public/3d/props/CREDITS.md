# 3D props: credits

All models, the HDRI and the wall texture are from [Poly Haven](https://polyhaven.com), released under **CC0** (public domain, no attribution required; credited here anyway).

| File | Source asset |
|---|---|
| desk_lamp_arm_01.glb | https://polyhaven.com/a/desk_lamp_arm_01 |
| office_notepads.glb | https://polyhaven.com/a/office_notepads |
| binder_notebook.glb | https://polyhaven.com/a/binder_notebook |
| book_encyclopedia_set_01.glb | https://polyhaven.com/a/book_encyclopedia_set_01 |
| potted_plant_02.glb | https://polyhaven.com/a/potted_plant_02 |
| calathea_orbifolia_01.glb | https://polyhaven.com/a/calathea_orbifolia_01 (not placed yet: 2.5 m wide) |
| ceramic_vase_01.glb | https://polyhaven.com/a/ceramic_vase_01 |
| wooden_table_02.glb | https://polyhaven.com/a/wooden_table_02 |
| magnifying_glass_01.glb | https://polyhaven.com/a/magnifying_glass_01 |
| ../hdri/artist_workshop_1k.hdr | https://polyhaven.com/a/artist_workshop |
| ../textures/beige_wall_001/ | https://polyhaven.com/a/beige_wall_001 |

Optimised from the 1k glTF downloads with `node scripts/set/fetch-polyhaven.mjs` (gltf-transform: meshopt geometry, WebP textures at most 1024 px).

Not used: `decorative_book_set_01` (published without glTF) and `classic_laptop` (too retro for the brand; the Desk's laptop is built in code in `src/world3d/set/DeskSet.tsx`).

Built in code (no third-party assets): the sketchbook and its red-chalk wireframes, the fountain pen, the inkpot, the laptop, the window, and the Mumbai view with the Bandra-Worli Sea Link (`src/world3d/set/paintings.ts`).
