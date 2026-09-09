/** One curiosity loop. No visitor categories, destinations or route inference. */
export const EXPERIENCE = 'frontdoor-seed-6.0';
// A fresh study journey keeps prior leaf-study milestones from deduplicating
// this different discovery. Its old keys remain untouched.
const PREFIX = 'mc:frontdoor:underpaper-study:v1:';
/** The study gets its own journey/visit/outbox; the approved checkpoint is never overwritten. */
export function prototypeStorage(storage) {
  if (!storage) return null;
  const key = value => value.startsWith('mc:frontdoor:v2:') ? PREFIX + value.slice('mc:frontdoor:v2:'.length) : value;
  return { getItem: value => storage.getItem(key(value)), setItem: (value,data) => storage.setItem(key(value),data), removeItem: value => storage.removeItem(key(value)) };
}
export function createFlow(telemetry) {
  let phase = 'opening', touched = false, seen = false, crossingRevision=0;
  telemetry.state.updateJourney({ experienceVersion:EXPERIENCE });
  return {
    get phase() { return phase; },
    restore(){phase='alive';touched=seen=true;},
    pickup() {
      if (phase !== 'opening') return false;
      phase = 'holding';
      if (!touched) { touched = true; telemetry.state.updateJourney({ stage:'choice' }); telemetry.emit('FRONTDOOR_CHOICE',{ properties:{ choiceStage:'primary',fromNode:'frontdoor',toNode:'value' } }); }
      return true;
    },
    reveal({ visible = true, painted = false } = {}) {
      if (!visible || !painted || phase !== 'holding') return false;
      phase = 'alive';
      if (!seen) {
        seen = true; telemetry.emit('FRONTDOOR_REACTION_COMPLETE');
        telemetry.state.updateJourney({ stage:'value' });
        telemetry.emit('LUCKY_RETURN',{ properties:{fromNode:'frontdoor',toNode:'value'} });
      }
      return true;
    },
    control() {
      if (phase !== 'alive') return false;
      // Pickup now gives the discovery. Further exploration is voluntary.
      return true;
    },
    crossing({revision=0,painted=false,visible=true}={}){
      if(phase!=='alive'||!painted||!visible||!Number.isInteger(revision)||revision<=crossingRevision)return false;
      crossingRevision=revision;telemetry.emit('FRONTDOOR_FREE_ROAM',{properties:{fromNode:'value',toNode:'value'}});return true;
    },
    putDown() { if (phase === 'opening') return false; phase = 'opening'; return true; },
  };
}
