/** Independent view, evidence, and display state. Physical geometry never lives here. */
export const initialState = Object.freeze({
  view: 'whole',
  activeFloor: 'f1',
  selectedRoomId: null,
  lens: 'model',
  renderMode: 'sd',
  wallMode: 'auto',
  furniture: true,
  builtins: true,
  grid: true,
  isolate: true,
  labels: true,
  ceiling: false,
  tourIndex: null,
});

const views = new Set(['whole', 'f1', 'f2', 'exploded']);
const lenses = new Set(['model', 'plan', 'photo']);
const walls = new Set(['full', 'auto', 'low']);
const renderModes = new Set(['sd', 'hd']);
const findRoom = (house, id) => house?.rooms?.find((room) => room.id === id);

/** Invalid URL/input values fall back without allowing a cross-floor selection. */
export function normalizeState(value = initialState, house) {
  const state = { ...initialState, ...value };
  if (!views.has(state.view)) state.view = 'whole';
  if (!['f1', 'f2'].includes(state.activeFloor)) state.activeFloor = 'f1';
  if (state.view === 'f1' || state.view === 'f2') state.activeFloor = state.view;
  if (!lenses.has(state.lens)) state.lens = 'model';
  if (!walls.has(state.wallMode)) state.wallMode = 'auto';
  if (!renderModes.has(state.renderMode)) state.renderMode = 'sd';
  for (const key of ['furniture', 'builtins', 'grid', 'isolate', 'labels', 'ceiling']) {
    if (typeof state[key] !== 'boolean') state[key] = initialState[key];
  }
  if (!Number.isInteger(state.tourIndex) || state.tourIndex < 0) state.tourIndex = null;
  const room = findRoom(house, state.selectedRoomId);
  if (!room || (room.floor && room.floor !== state.activeFloor)) {
    if (state.selectedRoomId && state.lens === 'photo') state.lens = 'model';
    state.selectedRoomId = null;
  }
  if (!state.selectedRoomId || state.lens !== 'model') state.ceiling = false;
  return state;
}

/** Latest event wins. No animations, DOM, photo indices, or source mutation. */
export function reduce(value, event, house) {
  const state = normalizeState(value, house);
  if (!event || typeof event.type !== 'string') return state;
  let next = state;
  switch (event.type) {
    case 'RESET':
      return { ...initialState, renderMode: state.renderMode, wallMode: state.wallMode };
    case 'RENDER_MODE':
      if (renderModes.has(event.mode)) next = { ...state, renderMode: event.mode };
      break;
    case 'VIEW': {
      if (!views.has(event.view)) return state;
      const floor = event.view === 'f1' || event.view === 'f2' ? event.view : state.activeFloor;
      const room = findRoom(house, state.selectedRoomId);
      const keepRoom = event.view !== 'whole' && (!room?.floor || room.floor === floor);
      next = {
        ...state, view: event.view, activeFloor: floor,
        selectedRoomId: keepRoom ? state.selectedRoomId : null,
        lens: event.view === 'whole' || event.view === 'exploded' || !keepRoom ? 'model' : state.lens,
        ceiling: false, tourIndex: null,
      };
      break;
    }
    case 'SELECT_ROOM': {
      const room = findRoom(house, event.id);
      if (!room) return state;
      next = {
        ...state, selectedRoomId: room.id,
        activeFloor: room.floor || state.activeFloor,
        view: room.floor || state.view,
        lens: 'model', ceiling: false, tourIndex: null,
      };
      break;
    }
    case 'CLOSE_ROOM':
      next = { ...state, selectedRoomId: null, lens: 'model', ceiling: false, tourIndex: null };
      break;
    case 'LENS':
      if (lenses.has(event.lens)) next = { ...state, lens: event.lens, ceiling: false };
      break;
    case 'WALL':
      if (walls.has(event.mode)) next = { ...state, wallMode: event.mode };
      break;
    case 'BUILTINS':
      next = { ...state, builtins: !state.builtins };
      break;
    case 'ISOLATE':
      next = { ...state, isolate: !state.isolate };
      break;
    case 'GRID':
      next = { ...state, grid: !state.grid };
      break;
    case 'FURNITURE':
      next = { ...state, furniture: !state.furniture };
      break;
    case 'LABELS':
      next = { ...state, labels: !state.labels };
      break;
    case 'CEILING':
      if (state.selectedRoomId && state.lens === 'model') next = { ...state, ceiling: !state.ceiling };
      break;
    case 'TOUR':
      if (event.index === null || (Number.isInteger(event.index) && event.index >= 0)) {
        next = { ...state, tourIndex: event.index };
      }
      break;
  }
  return normalizeState(next, house);
}

/** A compact allowlist suitable for a shareable URL. */
export function serializeState(value, house) {
  const state = normalizeState(value, house);
  const params = new URLSearchParams({ view: state.view, floor: state.activeFloor, lens: state.lens });
  if (state.selectedRoomId) params.set('room', state.selectedRoomId);
  return params.toString();
}

export function parseState(search, house) {
  const params = new URLSearchParams(search);
  return normalizeState({
    ...initialState,
    view: params.get('view') || 'whole', activeFloor: params.get('floor') || 'f1',
    selectedRoomId: params.get('room'), lens: params.get('lens') || 'model',
  }, house);
}
