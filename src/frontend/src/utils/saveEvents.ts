// Global save event system for non-intrusive save indicator
export const saveEvents = new EventTarget();

export const emitSaving = (): void => {
  saveEvents.dispatchEvent(new Event("saving"));
};

export const emitSaved = (): void => {
  saveEvents.dispatchEvent(new Event("saved"));
};
