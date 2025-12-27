export enum Page {
  Home = "الرئيسية",
  Instructions = "التعليمات",
  News = "الأخبار",
  Content = "المحتوى",
  Goals = "الأهداف",
  Profile = "الصفحة الشخصية",
  Contact = "اتصل بنا",
  AdminDashboard = "لوحة تحكم الباحثة",
  LearningPath = "مسار التعلم المخصص لك",
  LearningPathDetail = "تفاصيل مسار التعلم",
  ModuleContent = "محتوى الموديول",
  Activity = "النشاط",
  GroupFormation = "تكوين المجموعات",
  CollaborativeLearning = "التعليم التشاركي",
  ModuleQuiz = "الاختبار القبلي",
  FinalQuiz = "الاختبار البعدي",
}

export interface User {
  id: string; // Changed to string for MongoDB compatibility
  firebaseUid?: string;
  name: string;
  email: string;
  avatar: string;
  role?: string;
  groupId?: string;
}

export type CognitiveLevel = "أساسي" | "متوسط" | "متقدم" | "beginner" | "intermediate" | "advanced";

export interface Group {
  id: string;
  name: string;
  members: User[];
  level?: CognitiveLevel;
}

export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64 Data URI
  fileId?: string; // GridFS file ID
  url?: string; // URL to download from backend
}

export interface Message {
  id: string;
  groupId: string;
  moduleId: number | null;
  activityId: number;
  author: User;
  text: string;
  timestamp: string;
  attachment?: Attachment;
  isSubmission?: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  content: string;
}

// ============ Socket.io Event Types ============

/**
 * Socket.io event payload types
 * Maps event names to their expected payload types
 */
export interface SocketEvents {
  // Authentication events
  authenticated: {
    userId: string;
    groups: string[];
  };

  // Group events
  "group:updated": {
    id: string;
    name: string;
    type: "single" | "multi";
    members: string[]; // Array of Firebase UIDs
    level: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };

  // Message events
  "message:new": {
    _id: string;
    activityId: string;
    groupId: string;
    text: string;
    senderUid: string;
    createdAt: string;
    author?: User;
  };

  // News events
  "news:updated": {
    newsId: number;
    title: string;
    content: string;
    author?: string;
    publishedAt?: string;
  };

  // Exam events
  "exam:updated": {
    examId: string;
    title: string;
    duration: number;
    questions: Array<{
      id: string;
      text: string;
      options: string[];
      correctAnswer?: number;
    }>;
  };

  // Error events
  error: {
    message: string;
  };

  // Connection events
  connect: void;
  disconnect: string; // reason
  connect_error: Error;
}
