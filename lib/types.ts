export type PersonalityType = 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere';
export type MoodType = 'manja' | 'ngambek' | 'sarkas' | 'sweet';
export type GenderType = 'female' | 'male';

export interface GoalWithProgress {
  id: string;
  title: string;
  completedDates: string[]; // YYYY-MM-DD
  completionsLast7Days: number;
  currentStreak: number;
}

export interface SystemPromptContext {
  userName: string;
  aiName: string;
  aiGender: GenderType;
  personality: PersonalityType;
  toxicLevel: number;
  mood: MoodType;
  moodReason: string;
  goals: GoalWithProgress[];
  progressText: string;
  streakText: string;
  chatHistory: string;
}
