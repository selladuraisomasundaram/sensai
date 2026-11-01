export type VideoDomain =
  | 'technical_coding'
  | 'podcast_debate'
  | 'academic_lecture'
  | 'diy_hardware'
  | 'software_walkthrough';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface SpeakerPerspective {
  speaker: string;
  perspective: string;
}

export interface KeyboardShortcut {
  key: string;
  action: string;
}

// ==========================================
// 5 Universal Polymorphic Pillar Payloads
// ==========================================

export interface TechnicalCodingContent {
  architectural_objective: string;
  code_blocks: CodeBlock[];
  challenge_mission: string;
}

export interface PodcastDebateContent {
  context: string;
  speaker_perspectives: SpeakerPerspective[];
  key_takeaways: string[];
}

export interface AcademicLectureContent {
  core_theories: string[];
  formulas_or_dates: string[];
  real_world_application: string;
}

export interface DiyHardwareContent {
  materials_needed: string[];
  step_by_step_actions: string[];
  safety_warnings: string[];
  troubleshooting: string[];
}

export interface SoftwareWalkthroughContent {
  workflow_objective: string;
  ui_navigation_steps: string[];
  keyboard_shortcuts: KeyboardShortcut[];
}

export type DomainModuleContent =
  | TechnicalCodingContent
  | PodcastDebateContent
  | AcademicLectureContent
  | DiyHardwareContent
  | SoftwareWalkthroughContent;

// ==========================================
// Extracted Raw Lesson Module from LLM
// ==========================================

export interface RawExtractedModule {
  title: string;
  start_timestamp: string;
  end_timestamp: string;
  module_quiz: QuizQuestion[];

  // 1. Technical Coding
  architectural_objective?: string;
  code_blocks?: CodeBlock[];
  challenge_mission?: string;

  // 2. Podcast Debate
  context?: string;
  speaker_perspectives?: SpeakerPerspective[];
  key_takeaways?: string[];

  // 3. Academic Lecture
  core_theories?: string[];
  formulas_or_dates?: string[];
  real_world_application?: string;

  // 4. DIY Hardware
  materials_needed?: string[];
  step_by_step_actions?: string[];
  safety_warnings?: string[];
  troubleshooting?: string[];

  // 5. Software Walkthrough
  workflow_objective?: string;
  ui_navigation_steps?: string[];
  keyboard_shortcuts?: KeyboardShortcut[];
}

export interface LLMExtractionPayload {
  modules: RawExtractedModule[];
  final_quiz: QuizQuestion[];
}

// ==========================================
// Supabase Database Models
// ==========================================

export interface CourseRow {
  id: string;
  user_id?: string;
  youtube_url: string;
  video_title: string;
  domain_type: VideoDomain | 'pending';
  status: 'processing' | 'completed' | 'failed';
  final_quiz?: QuizQuestion[] | null;
  created_at?: string;
}

export interface ModuleRow {
  id?: string;
  course_id: string;
  module_order: number;
  title?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  content: DomainModuleContent & {
    title?: string;
    start_timestamp: string;
    end_timestamp: string;
  };
  module_quiz: QuizQuestion[];
  is_completed: boolean;
  created_at?: string;
}
