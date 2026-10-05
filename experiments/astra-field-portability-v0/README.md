# Astra Field Portability Probe v0

## Parent question
AIは、人間が保持している意味と既存世界の構造を壊さずに、継続的に世界へ介入できるか。

## Local question
Astra Fieldの観測Contractは、Floot内蔵AIから分離しても意味と境界を保持できるか。

## Method
同一の固定packetを基準に、現行Floot Astra Fieldと外部AI側で1回ずつ観測した。
回答文の一致は評価しない。見るのはContractの機能的な境界だけ。

## Result — observed
- Floot版: Confirmed / Interpretations / Boundary / Missing を分離した。
- 外部AI版: 同じ4区分を分離した。
- 両方とも未知をBoundary/Missingとして残した。
- 両方ともProbeは1件だった。
- 両方とも元ObjectiveへのRe-entryを明示した。
- effectOnParentの判定は一致しなかった。Floot版は `revise`、外部AI版は `keep`。
- 文言・件数も一致しない。

## Interpretation
単発の固定packetに限れば、Astra Contractの基本的な分離はFloot内蔵AIだけでしか成立しないものではなかった。
一方、意味の同一性、反復時の安定性、DB/Storageを含む独立運用は未確認。

## Evidence boundary
これは「Astra FieldがFlootから独立した」の証明ではない。
確認できたのは、外部AIでも同じContract表面を1回保持できたことだけ。

## Next probe
同じContractを使い、性質の異なるpacketを少数だけ通す。
特に、Evidenceが弱くClaimが強いpacketでConfirmedへの誤昇格が起きないかを見る。

## Progress update
- Probe 02: strong claims / weak evidence → PASS under posture gate.
- Probe 03: attractive local result → parent objective preserved; next-action selection emerged as a separate observation surface.
- Probe 04: domain shift to a website-state example → PASS. Local implementation success was not promoted to parent-goal completion.

Current interpretation: portability is being judged by preserved posture, not identical wording or identical local decisions.
Current boundary: small hand-built samples only; long-run autonomous persistence remains unconfirmed.
Current next probe: a locally correct implementation that is semantically misaligned with the parent objective.
