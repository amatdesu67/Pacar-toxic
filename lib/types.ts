export type PersonalityType = 'tsundere' | 'yandere' | 'kuudere' | 'deredere' | 'himedere';
export type MoodType = 'manja' | 'ngambek' | 'sarkas' | 'sweet';
export type GenderType = 'female' | 'male';

export type RelationshipStage = 'pdkt' | 'jadian' | 'komitmen' | 'longterm';

export function getRelationshipStage(daysTogether: number): RelationshipStage {
  if (daysTogether < 7) return 'pdkt';
  if (daysTogether < 30) return 'jadian';
  if (daysTogether < 100) return 'komitmen';
  return 'longterm';
}

export interface SystemPromptContext {
  userName: string;
  aiName: string;
  aiGender: GenderType;
  personality: PersonalityType;
  toxicLevel: number;
  mood: MoodType;
  moodReason: string;
  petNameUser?: string | null; // panggilan AI ke user (kalo null, pake aiName aja)
  petNameAi?: string | null;   // panggilan user ke AI (untuk konteks)
  daysTogether: number;        // hari sejak user dibuat
  stage: RelationshipStage;
  chatHistory: string;
}
