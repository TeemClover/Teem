# Route Guard — /xircle/care/party/

Job: handoff จาก Xircle/RoutineX ไปสมุดแมวขาวจริง โดยรักษา action/context/invite.

Entry: RoutineX, circle, explore หรือ invite
Exit: technical `/xty/new/` หรือ `/xty/join/`

Must preserve: user-facing = `สมุดแมวขาว` / `White Cat Care`; technical `/xty/` คงได้. ไม่แชร์ health data อัตโนมัติและไม่แทน X-VISOR.

Dependency: `XState.getXtyHandoff()`; invite ต้องใช้ join hero. QA create + join + handoff ก่อน merge.
