# Adinkra PDF artwork import — publication gate

The user-provided 10-page reference PDF contains 62 numbered illustration entries, including **two distinct Sankofa variants**. The matching 62 PNG files have been extracted locally as `01.png`–`62.png` and reviewed as a contact sheet.

## Import contract
- `catalog.json` maps each numbered entry to `/adinkra-library/NN.png`.
- Copy the corresponding PNGs into this folder **only after image reuse permission or an appropriate license is established**.
- Keep the source credit and verify every extracted image against its numbered row in the PDF; preserve both Sankofa variants.
- Do not activate a symbol in the public game while `enabledForPublicGame` is false or while its artwork is missing.
- Once approved, enable entries and load them from the manifest instead of hardcoding seven images. Keep the existing seven Gate One assets as fallback during rollout.
- Test 62 image HTTP responses, 62 distinct numbered entries, both Sankofa variants, actual symbol display in the tank, and iPhone layout before merging.

## Important
The PDF itself credits adinkrasymbols.org, but possession of the PDF does **not** establish redistribution permission for the illustrations. This branch intentionally contains **metadata only** until artwork rights are resolved.
