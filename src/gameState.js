// Game state machine: SPLASH -> (press Enter/Space) -> PLAYING
// PLAYING -> CRASHED -> (auto reset) -> PLAYING
// PLAYING -> WON -> (press R) -> PLAYING
(function () {
  const STATUS = { SPLASH: 'splash', PLAYING: 'playing', CRASHED: 'crashed', WON: 'won' };

  const CRASH_MESSAGE_DURATION = 1.2; // seconds the "crashed" message stays up before auto-reset

  function createGameState() {
    return { status: STATUS.SPLASH, crashTimer: 0 };
  }

  function startGame(state) {
    if (state.status !== STATUS.SPLASH) return;
    state.status = STATUS.PLAYING;
  }

  function triggerCrash(state) {
    if (state.status !== STATUS.PLAYING) return;
    state.status = STATUS.CRASHED;
    state.crashTimer = CRASH_MESSAGE_DURATION;
  }

  function triggerWin(state) {
    if (state.status !== STATUS.PLAYING) return;
    state.status = STATUS.WON;
  }

  function backToPlaying(state) {
    state.status = STATUS.PLAYING;
    state.crashTimer = 0;
  }

  window.Game = window.Game || {};
  window.Game.GameState = { STATUS, createGameState, startGame, triggerCrash, triggerWin, backToPlaying };
})();
