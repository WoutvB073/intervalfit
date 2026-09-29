export type Category = 'benen' | 'boven' | 'core' | 'cardio';

export type LibraryExercise = {
  id: string;
  name: string;
  /** Zoekwoorden, altijd zowel de Nederlandse als de Engelse variant. */
  aliases: string[];
  /** Tekst voor de spraak als de naam anders verkeerd wordt uitgesproken. */
  spoken?: string;
  category: Category;
  /** Korte instructie van één zin. */
  instruction: string;
  /** Geschatte MET-waarde voor de calorieberekening. */
  met: number;
  defaultWorkSec: number;
};

export type WorkoutExercise = {
  /** Uniek per regel, zodat dezelfde oefening twee keer in een workout kan staan. */
  id: string;
  /** Verwijzing naar de bibliotheek; leeg bij een eigen oefening. */
  libraryId?: string;
  name: string;
  workSec: number;
  /** Eigen rust ná deze oefening; leeg = standaardrust van de workout. */
  restSec?: number;
  /** Sleutel van een eigen foto in IndexedDB. */
  photoId?: string;
};

export type Workout = {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  /** Standaardrust ná elke oefening. */
  restSec: number;
  rounds: number;
  /** Rust tussen twee rondes; vervangt dan de gewone rust. */
  roundRestSec: number;
  createdAt: number;
  updatedAt: number;
};

export type ThemeId = 'sportief' | 'fris' | 'vrolijk' | 'pastel';

export type Settings = {
  sound: {
    beeps: boolean;
    whistle: boolean;
    voice: boolean;
    vibrate: boolean;
    /** Ook geluid als de iPhone op stil staat (muziek van andere apps pauzeert dan). */
    alwaysAudible: boolean;
    /** 0 t/m 1 */
    volume: number;
  };
  countdown: { enabled: boolean; seconds: number };
  theme: ThemeId;
  weightKg?: number;
  voiceURI?: string;
};

export type HistoryEntry = {
  id: string;
  /** ISO-datum/tijd van afronden. */
  date: string;
  workoutId: string;
  workoutName: string;
  totalSec: number;
  workSec: number;
  kcal: number;
  rounds: number;
  exercisesDone: number;
  completed: boolean;
  perExercise: { key: string; name: string; workSec: number }[];
};
