export * from './game-copy.js?v7legacy';
import * as legacy from './game-copy.js?v7legacy';
import { EVENTS, XIRCLE_MONTHS, calculateEconomy, getBestNextActions } from './game-data-v8.js';

export function getStageContent(state) {
  const base = legacy.getStageContent(state);
  if (state.organizationMode) {
    const economy = calculateEconomy(state);
    const agg = state.organization?.aggregate || {};
    return {
      ...base,
      scene: 'management_org',
      progress: 100,
      eyebrow: `ORGANIZATION MODE · MONTH ${state.month}`,
      title: `องค์กรเดินต่อ · ${Number(economy.tgv || 0).toLocaleString('th-TH')} XV`,
      reason: 'หลัง 12 เดือน ไม่มี Energy และไม่มีงานรายคนให้ grind — ดูภาพใหญ่และผ่านเวลาได้เลย',
      speaker: 'XOS · Organization',
      dialogue: `❤️ ลูกค้า active ${Number(agg.activeCustomers || 0).toLocaleString('th-TH')} · 🌱 X-VISOR ${Number(agg.xvisorCount || state.team?.length || 0).toLocaleString('th-TH')} · 👑 XLEAD ${Number(agg.xleadCount || 0).toLocaleString('th-TH')}`,
      facts: [
        ['🏙️ TGV', `${Number(economy.tgv || 0).toLocaleString('th-TH')} XV`],
        ['💰 รายได้เดือนนี้', `฿${Number(economy.projectedIncome || 0).toLocaleString('th-TH')}`],
        ['⭐ เรื่องขององค์กร', state.sceneReport?.story || state.lastMessage || 'ระบบยังเดินต่อ'],
      ],
      actions: [{ label: '▶ ผ่านไปอีก 1 เดือน', event: EVENTS.END_MONTH, icon: 'month' }],
    };
  }
  if (state.sceneReport?.kind === 'xircle-announcement') {
    return {
      ...base,
      scene: 'open_house_running',
      eyebrow: '🏕️ THE XIRCLE · QUARTERLY EVENT',
      title: 'The Xircle มาแล้ว · แคมป์ 2 วัน 1 คืน',
      reason: 'เตรียมคนให้พร้อม เพราะทุกคนที่เข้าร่วม—including คุณ—จะได้ Momentum แรงขึ้น',
      speaker: 'THE XIRCLE',
      dialogue: `รอบปีนี้: ${XIRCLE_MONTHS.map((month) => `Month ${month}`).join(' · ')}`,
      facts: [['เป้าหมาย', 'ชวนคนที่เหมาะสมให้มากที่สุด'], ['ผล', 'Buff ตามบทบาท + Momentum 2 เดือน']],
      actions: getBestNextActions(state, 3),
    };
  }
  if (state.sceneReport?.kind === 'the-xircle') {
    return {
      ...base,
      scene: 'open_house_running',
      eyebrow: `🏕️ THE XIRCLE · MONTH ${state.month}`,
      title: `มา ${state.sceneReport.attended} จาก ${state.sceneReport.invited} คน`,
      reason: 'คนที่มาได้รับแรงส่งตามบทบาท โดยไม่ได้ถูกเปลี่ยนเป็น Sale หรือ X-VISOR แบบอัตโนมัติ',
      speaker: 'THE XIRCLE',
      dialogue: '⭐ คุณเองก็ได้รับ Buff และ Skill XP จากแคมป์นี้',
      facts: (state.sceneReport.messages || []).map((message, index) => [index === 0 ? 'ATTENDANCE' : index === 1 ? 'TEAM' : 'YOU', message]),
      actions: getBestNextActions(state, 3),
    };
  }
  if (state.sceneReport?.kind === 'xlead-exam') {
    return {
      ...base,
      eyebrow: '🎓 XLEAD EXAM · PASSED',
      title: 'Certified XLEAD',
      reason: 'Qualification อย่างเดียวไม่ปลดล็อกรายได้ — ต้องผ่าน Exam ก่อน',
      speaker: 'Xcademy',
      dialogue: '② รายได้จากการพัฒนา Direct G1 ปลดล็อกแล้ว',
      actions: getBestNextActions(state, 3),
    };
  }
  if (state.sceneReport?.kind === 'xgen-exam') {
    return {
      ...base,
      eyebrow: '🎓 XGEN EXAM · PASSED',
      title: 'Certified XGEN',
      reason: '3,000,000 TGV คือ Qualification; Certification คือสิ่งที่ปลดล็อกแผนรายได้',
      speaker: 'Xcademy',
      dialogue: '③ รายได้จากการบริหาร Organization ปลดล็อกแล้ว',
      actions: getBestNextActions(state, 3),
    };
  }
  if (state.campaignComplete && state.stage === 'month_closed') {
    const score = state.campaignScore || {};
    return {
      ...base,
      scene: 'season_review',
      eyebrow: '🏆 MONTH 12 · REVELATION',
      title: '12 เดือนแรกจบแล้ว · High Score ถูกล็อก',
      reason: 'จากคนเดียว → ลูกค้า → X-VISOR → XLEAD → Organization ที่ไม่ต้องรอคุณทำทุก transaction',
      speaker: 'X-VISOR QUEST',
      dialogue: 'คุณไม่ได้หยุดทำธุรกิจ แต่ธุรกิจไม่ต้องรอคุณทำทุกอย่างด้วยตัวเองอีกแล้ว',
      facts: [
        ['🏆 Best TGV', `${Number(score.bestTgv || 0).toLocaleString('th-TH')} XV`],
        ['💰 รายได้รวม 12 เดือน', `฿${Number(score.totalIncome || 0).toLocaleString('th-TH')}`],
        ['💎 สูงสุด/เดือน', `฿${Number(score.bestMonthlyIncome || 0).toLocaleString('th-TH')}`],
        ['🏙️ Organization', `${Number(score.organizationSize || 0).toLocaleString('th-TH')} คน`],
      ],
      actions: [{ label: '▶ เล่นต่อ · Organization Mode', event: EVENTS.START_NEXT_MONTH, icon: 'play' }],
    };
  }
  return base;
}
