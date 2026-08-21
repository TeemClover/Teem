# Route Guard — /xircle/care/party/

Job: handoff จาก Xircle/RoutineX ไปสมุดแมวขาวจริง โดยรักษา action/context/invite.

Entry: RoutineX, circle, explore หรือ invite
Exit: `https://teambook.me/new/` หรือ `https://teambook.me/join/`

Must preserve: user-facing = `สมุดแมวขาว` / `White Cat Care`; public handoff จาก myClover ต้องออกไป `https://teambook.me/*` โดยตรง ห้ามพาผู้ใช้ผ่าน `myclover.com/xty/*`. Internal repo path `/xty/` อาจคงอยู่เพื่อ compatibility ได้ แต่ไม่ใช่ public destination ของ route นี้. ไม่แชร์ health data อัตโนมัติและไม่แทน X-VISOR.

Dependency: `XState.getXtyHandoff()`; invite ต้องใช้ join hero. QA create + join + handoff และตรวจ host `teambook.me` ก่อน merge.
