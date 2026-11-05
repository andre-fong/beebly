import { create } from 'zustand';
import {
  CatCutInType,
  CatExpression,
  CatSoundCategory,
  DialogueTriggerSource,
} from '../types/domain';
import { soundEngine } from '../lib/cat-audio';

interface CompanionState {
  expression: CatExpression;
  /**
   * CRITICAL RESTRAINT RULE:
   * Verbal text dialogue is ONLY populated when triggered by:
   * 1. ONBOARDING
   * 2. EOD_REVIEW
   * 3. HELP_BUTTON
   * Routine app actions NEVER set dialogueText; they call reactSilently() instead.
   */
  dialogueText: string | null;
  dialogueSource: DialogueTriggerSource | null;
  activeCutIn: { type: CatCutInType; subtitle: string } | null;
  soundMuted: boolean;

  /** Silent facial expression + optional audio cue for all routine user actions */
  reactSilently: (
    expression: CatExpression,
    sound?: CatSoundCategory,
    pitch?: number,
    cutIn?: { type: CatCutInType; subtitle: string }
  ) => void;

  /** Strictly gated verbal dialogue bubble (restricted to Onboarding, EOD Review, Help '?' clicks) */
  speakPermittedDialogue: (
    source: DialogueTriggerSource,
    text: string,
    expression?: CatExpression,
    sound?: CatSoundCategory,
    cutIn?: { type: CatCutInType; subtitle: string }
  ) => void;

  dismissDialogue: () => void;
  clearCutIn: () => void;
  toggleSoundMute: () => void;
}

const ALLOWED_DIALOGUE_SOURCES = new Set<DialogueTriggerSource>([
  DialogueTriggerSource.ONBOARDING,
  DialogueTriggerSource.EOD_REVIEW,
  DialogueTriggerSource.HELP_BUTTON,
]);

export const useCompanionStore = create<CompanionState>((set) => ({
  expression: CatExpression.NEUTRAL,
  dialogueText: null,
  dialogueSource: null,
  activeCutIn: null,
  soundMuted: false,

  reactSilently: (expression, sound, pitch = 1.0, cutIn) => {
    if (sound) {
      soundEngine.playCatSound(sound, pitch);
    }
    set((state) => ({
      expression,
      // Explicitly clear any lingering non-onboarding bubble on routine actions
      dialogueText:
        state.dialogueSource === DialogueTriggerSource.ONBOARDING ? state.dialogueText : null,
      dialogueSource:
        state.dialogueSource === DialogueTriggerSource.ONBOARDING ? state.dialogueSource : null,
      activeCutIn: cutIn ?? state.activeCutIn,
    }));

    if (cutIn) {
      setTimeout(() => {
        set({ activeCutIn: null });
      }, 2200);
    }
  },

  speakPermittedDialogue: (
    source,
    text,
    expression = CatExpression.SMILE,
    sound = CatSoundCategory.MEOW,
    cutIn
  ) => {
    // Enforce strict restraint gate
    if (!ALLOWED_DIALOGUE_SOURCES.has(source)) {
      return;
    }

    if (sound) {
      soundEngine.playCatSound(sound, source === DialogueTriggerSource.HELP_BUTTON ? 1.12 : 1.0);
    }

    set({
      expression,
      dialogueText: text,
      dialogueSource: source,
      activeCutIn: cutIn ?? null,
    });

    if (cutIn) {
      setTimeout(() => {
        set({ activeCutIn: null });
      }, 2200);
    }
  },

  dismissDialogue: () => set({ dialogueText: null, dialogueSource: null }),

  clearCutIn: () => set({ activeCutIn: null }),

  toggleSoundMute: () =>
    set((state) => {
      const next = !state.soundMuted;
      soundEngine.setMuted(next);
      return { soundMuted: next };
    }),
}));
