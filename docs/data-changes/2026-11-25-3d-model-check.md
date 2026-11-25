# 2026-11-25: scheduled 3D model check

Vehicle counts: refreshed by the il-fleet-counts workflow on 2026-11-25 (all 370 models).

No database changes. The audit (16 items) was handled in scripts/3d-audit/reviewed.json only:

- 15 motorcycle models added on 2026-11-23 had not been looked at. Preview sheet checked: all show the right bike.
  Marked as seen. Two are also kept on purpose:
  - moto-yamaha/mt-07 (5dc9fd1a7d81449e853c12f4f8858972): flagged crude (33k faces, untextured colours), looks right.
  - moto-kawasaki/ninja-650 (a0fcb1b23e6948639a09d804939f7c70): photo scan with a small street patch; the only usable
    Ninja 650 on Sketchfab (the other is a re-upload of the same file).
- chevrolet/trailblazer (5,034 on the road) has had no model since its 1.37M-face model was hidden on 2026-11-23.
  The only other model is a 2007 photo scan of the old US Trailblazer, so it stays without one (missing_ok).
