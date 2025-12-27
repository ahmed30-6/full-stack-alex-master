/*import BackendStatus from './components/BackendStatus';*/
import React, { useState, useCallback, useEffect } from "react";
import { apiService } from "./src/services/apiService";
import { syncActivityFile, syncActivityMessage } from "./src/services/syncService";
import * as statePersistence from "./src/services/statePersistence";
import { auth } from "./src/firebase";
import { useSocket, useSocketEvent, useGroupContext } from "./src/hooks";
import * as guards from "./src/auth";
import type {
  User,
  Page,
  Group,
  Message,
  NewsItem,
  CognitiveLevel,
} from "./types";
import { Page as PageEnum } from "./types";
import { PAGES, ADMIN_USER, INITIAL_NEWS_ITEMS, MODULES } from "./constants";
import { quizQuestions as allQuizQuestions } from "./quizQuestions";
import { moduleContent } from "./moduleContent";
import LoginPage from "./components/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import HomePage from "./components/pages/HomePage";
import NewsPage from "./components/pages/NewsPage";
import ContentPage from "./components/pages/ContentPage";
import ProfilePage from "./components/pages/ProfilePage";
import AdminDashboardPage from "./components/pages/AdminDashboardPage";
import GoalsPage from "./components/pages/GoalsPage";
import ModuleQuizPage from "./components/pages/ModuleQuizPage";
import LearningPathPage from "./components/pages/LearningPathPage";
import LearningPathDetailPage from "./components/pages/LearningPathDetailPage";
import ModuleContentPage from "./components/pages/ModuleContentPage";
import FinalQuizPage from "./components/pages/FinalQuizPage";
import PostTestResultsPage from "./components/pages/PostTestResultsPage";
import ActivityPage from "./components/pages/ActivityPage";
import GroupFormationPage from "./components/pages/GroupFormationPage";
import CollaborativeLearningPage from "./components/pages/CollaborativeLearningPage";
import InstructionsPage from "./components/pages/InstructionsPage";
import "./src/index.css";
// Data extracted from PDF for each module
const MODULE_DETAILS: { [key: number]: { goal: string; objectives: string } } =
{
  1: {
    goal: "إلمام الطالب المعلم بنشأة المكتبات الافتراضية ثلاثية الأبعاد.",
    objectives: `يتوقع بعد انتهائك عزيزي الطالب من دراسة هذا الموضوع أن تصبح قادراً على أن:
• تتعرف على مراحل تطور المكتبات.
• تفرق بين أنواع المكتبات.
• تحدد سبب ظهور المكتبات الافتراضية ثلاثية الأبعاد.
• تعرف المكتبات الافتراضية ثلاثية الأبعاد.
• تتعرف على أنواع المكتبات الافتراضية.
• تتعرف على مسميات المكتبات الافتراضية ثلاثية الأبعاد.
• تحدد خدمات المكتبات الافتراضية ثلاثية الأبعاد.`,
  },
  2: {
    goal: "إلمام الطالب المعلم بطبيعة المكتبات الافتراضية ثلاثية الأبعاد (المميزات-الخصائص-الأهمية-الصعوبات).",
    objectives: `يتوقع بعد انتهائك عزيزي الطالب من دراسة هذا الموضوع أن تصبح قادراً على أن:
• تعدد مميزات المكتبات الافتراضية ثلاثية الأبعاد.
• تذكر خصائص المكتبات الافتراضية ثلاثية الأبعاد.
• تحدد أهمية المكتبات الافتراضية ثلاثية الأبعاد في دعم العملية التعليمية.
• تحدد المتطلبات الأساسية اللازمة لتصميم وإنتاج المكتبات الافتراضية ثلاثية الأبعاد.
• تعدد التحديات (الصعوبات) التي تواجه تصميم وإنتاج المكتبات الافتراضية ثلاثية الأبعاد.`,
  },
  3: {
    goal: "إلمام الطالب المعلم بتصميم المكتبة الافتراضية ثلاثية الأبعاد.",
    objectives: `يتوقع بعد انتهائك عزيزي الطالب من دراسة هذا الموضوع أن تصبح قادراً على أن:
• تحدد المعايير التي ينبغي توافرها عند تصميم المكتبة الافتراضية ثلاثية الأبعاد.
• تذكر المعايير التربوية الواجب توافرها عند تصميم المكتبة الافتراضية ثلاثية الأبعاد.
• تحدد المعايير الفنية الواجب توافرها عند تصميم المكتبة الافتراضية ثلاثية الأبعاد.
• توضح أهمية المعايير التربوية في تصميم المكتبة الافتراضية ثلاثية الأبعاد.
• توضح أهمية المعايير الفنية في تصميم المكتبة الافتراضية ثلاثية الأبعاد.
• تصوغ أهدافاً تعليمية واضحة ومحددة للمكتبة الافتراضية ثلاثية الأبعاد، مع مراعاة جميع الجوانب (المعرفية، المهارية، الوجدانية).
• تعدد أنواع المصادر الإلكترونية التي يمكن تضمينها في المكتبة الافتراضية.
• تنشئ مجلدات سحابية للموارد داخل Google Drive.
• تصمم دليل المستخدم للمكتبة الافتراضية ثلاثية الأبعاد.`,
  },
  4: {
    goal: "إلمام الطالب المعلم بمهارات إنتاج المكتبات الافتراضية ثلاثية الأبعاد.",
    objectives: `يتوقع بعد انتهائك عزيزي الطالب من دراسة هذا الموضوع أن تصبح قادراً على أن:
• تُعرف مهارات إنتاج المكتبات الافتراضية ثلاثية الأبعاد.
• تتعرف على كيفية الوصول إلى منصة Frame VR عبر محركات البحث المختلفة.
• تتمكن من تسجيل الدخول إلى منصة Frame VR.
• تختار القالب المناسب لتطوير المكتبة الافتراضية من بين الخيارات المتاحة في المنصة.
• تضيف الأثاث المناسب داخل المكتبة الافتراضية.
• تضبط الإضاءة داخل المكتبة الافتراضية بحيث تكون مريحة وجذابة بصريًا.
• تتمكن من ضبط خصائص وإعدادات المكتبة الافتراضية لتحسين وظائفها وتفاعليتها.
• تكتب نصوصًا داخل المكتبة الافتراضية بألوان واضحة يسهل قراءتها.
• تذكر مفهوم التصنيف في المكتبات وأهميته في تنظيم المعلومات.
• تضيف شاشة عرض إرشادية لكيفية الإبحار.`,
  },
};

// Helper function to determine cognitive level based on score percentage
const getCognitiveLevel = (
  score: number | null,
  totalQuestions: number
): CognitiveLevel => {
  if (score === null || totalQuestions === 0) return "أساسي";
  const percentage = (score / totalQuestions) * 100;
  if (percentage <= 47) return "أساسي";
  if (percentage <= 73) return "متوسط";
  return "متقدم";
};

// Map CognitiveLevel string or numeric level to backend string enum
const mapLevelToString = (level?: CognitiveLevel | number | string | null) => {
  if (level === null || level === undefined) return "beginner";
  if (level === "beginner" || level === "intermediate" || level === "advanced") return level;

  if (typeof level === "number") {
    if (level === 1) return "beginner";
    if (level === 2) return "intermediate";
    if (level === 3) return "advanced";
    return "beginner";
  }

  switch (level) {
    case "أساسي":
      return "beginner";
    case "متوسط":
      return "intermediate";
    case "متقدم":
      return "advanced";
    default:
      return "beginner";
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(PAGES[0]);
  const [quizActive, setQuizActive] = useState(false);
  const [showFinalQuiz, setShowFinalQuiz] = useState(false);
  const [showPostTestResults, setShowPostTestResults] = useState(false);
  const [postTestScore, setPostTestScore] = useState<{
    score: number;
    maxScore: number;
    passingScore: number;
  } | null>(null);

  // Global states for all users
  const [allModuleScores, setAllModuleScores] = useState<{
    [email: string]: {
      [key: number]: {
        preTestScore: number | null;
        postTestScore: number | null;
        preTestTime: number | null;
        postTestTime: number | null;
      };
    };
  }>({});
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(INITIAL_NEWS_ITEMS);

  // User-specific states
  const [learningPathTopic, setLearningPathTopic] = useState<string | null>(
    null
  );
  const [completedLessons, setCompletedLessons] = useState<{
    [key: number]: number[];
  }>({});
  const [finalQuizPassed, setFinalQuizPassed] = useState(false);
  const [unlockedModules, setUnlockedModules] = useState<number[]>([1]);
  const [currentActivityId, setCurrentActivityId] = useState<number | null>(
    null
  );
  const [currentModuleId, setCurrentModuleId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [discussions, setDiscussions] = useState<Message[]>([]);

  // Admin context: Track which group admin has "entered" for interaction
  // This is UI context only, NOT stored in user document
  const [adminEnteredGroupId, setAdminEnteredGroupId] = useState<string | null>(null);

  // State for Module Content Page progress
  const [moduleLessonIndex, setModuleLessonIndex] = useState(0);
  const [modulePageIndex, setModulePageIndex] = useState(0);

  const [quizQuestionsByModule, setQuizQuestionsByModule] =
    useState(allQuizQuestions);
  const [unifiedLearningPathDescription, setUnifiedLearningPathDescription] =
    useState(
      `مرحباً بك في مسار التعلم الموحد. سنركز هنا على المفاهيم الأساسية والأساسيات التي تحتاجها لبدء رحلتك في تطوير المكتبات الافتراضية.`
    );

  // Initial state for goals/objectives (will be updated by useEffect)
  const [learningPathGeneralGoal, setLearningPathGeneralGoal] = useState(
    MODULE_DETAILS[1].goal
  );
  const [learningPathObjectives, setLearningPathObjectives] = useState(
    MODULE_DETAILS[1].objectives
  );

  // ✅ CENTRALIZED GROUP CONTEXT - Single source of truth for group logic
  const groupContext = useGroupContext(user, adminEnteredGroupId);

  // Update Learning Path Goals and Objectives when currentModuleId changes
  useEffect(() => {
    const moduleId = currentModuleId || 1;
    if (MODULE_DETAILS[moduleId]) {
      setLearningPathGeneralGoal(MODULE_DETAILS[moduleId].goal);
      setLearningPathObjectives(MODULE_DETAILS[moduleId].objectives);
    }
  }, [currentModuleId]);

  // ✅ PHASE 2: Load news items from centralized persistence (UI-shared state)
  useEffect(() => {
    const savedNews = statePersistence.loadNewsItems();
    if (savedNews && Array.isArray(savedNews) && savedNews.length > 0) {
      setNewsItems(savedNews);
    }
  }, []);

  // ✅ PHASE 2: Save news items to centralized persistence
  useEffect(() => {
    if (user) {
      // Only save if user is logged in
      statePersistence.saveNewsItems(newsItems);
    }
  }, [newsItems, user]);

  // ✅ PHASE 2: Save UI-only state (navigation indices) to localStorage
  useEffect(() => {
    if (user) {
      statePersistence.saveUIState({
        moduleLessonIndex,
        modulePageIndex,
        currentActivityId,
      });
    }
  }, [moduleLessonIndex, modulePageIndex, currentActivityId, user]);

  // ============ Socket.io Real-Time Integration ============

  // Initialize socket connection
  const { socket, connected, authenticated } = useSocket();

  // Listen for socket errors
  useSocketEvent(
    "error",
    (error: any) => {
      console.error("Socket error received in App:", error);
      // Error is already handled by socketService
      // This listener is for application-level logging and monitoring
      // Do not show UI alerts - keep user experience smooth
    },
    []
  );

  // Listen for group updates
  useSocketEvent(
    "group:updated",
    (groupData: any) => {
      console.log("Received group:updated event:", groupData);

      setGroups((prev) => {
        const existing = prev.find((g) => g.id === groupData.id);

        if (existing) {
          // Update existing group
          return prev.map((g) =>
            g.id === groupData.id
              ? {
                ...g,
                name: groupData.name,
                level: groupData.level,
                members: groupData.members || g.members,
              }
              : g
          );
        } else {
          // Add new group
          return [
            ...prev,
            {
              id: groupData.id,
              name: groupData.name,
              level: groupData.level,
              members: groupData.members || [],
            },
          ];
        }
      });
    },
    []
  );

  // Listen for new messages
  useSocketEvent(
    "message:new",
    (messageData: any) => {
      console.log("Received message:new event:", messageData);

      setDiscussions((prev) => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some((m) => m.id === messageData._id);
        if (exists) {
          return prev;
        }

        // Add new message
        return [
          ...prev,
          {
            id: messageData._id,
            groupId: messageData.groupId,
            moduleId: null,
            activityId: messageData.activityId,
            author: messageData.author || {
              id: 0,
              name: "Unknown",
              email: "",
              avatar: "",
            },
            text: messageData.text,
            timestamp: messageData.createdAt,
          },
        ];
      });
    },
    []
  );

  // Listen for news updates
  useSocketEvent(
    "news:updated",
    (newsData: any) => {
      console.log("Received news:updated event:", newsData);

      setNewsItems((prev) => {
        const existing = prev.find((n) => n.id === newsData.newsId);

        if (existing) {
          // Update existing news item
          return prev.map((n) =>
            n.id === newsData.newsId
              ? {
                ...n,
                title: newsData.title || n.title,
                content: newsData.content || n.content,
              }
              : n
          );
        } else {
          // Add new news item
          return [
            {
              id: newsData.newsId,
              title: newsData.title,
              content: newsData.content,
            },
            ...prev,
          ];
        }
      });
    },
    []
  );

  // Auto-join user's group rooms after authentication
  useEffect(() => {
    if (!socket || !authenticated || !user) {
      return;
    }

    console.log("Socket authenticated, joining user groups...");

    // Use user.groupId as the authoritative source of truth
    const userGroups = user.groupId ? groups.filter((g) => g.id === user.groupId) : [];

    if (userGroups.length === 0) {
      console.log("User is not assigned to any group.");
    } else {
      console.log(
        `User is member of group:`,
        userGroups[0].id
      );
    }

    // Join each group room
    userGroups.forEach((group) => {
      console.log(`Joining group room: ${group.id}`);
      socket.emit("join:group", { groupId: group.id });
    });

    // Cleanup: leave all groups on unmount or when user/socket changes
    return () => {
      if (socket && socket.connected) {
        console.log("Leaving group rooms...");
        userGroups.forEach((group) => {
          console.log(`Leaving group room: ${group.id}`);
          socket.emit("leave:group", { groupId: group.id });
        });
      }
    };
  }, [socket, authenticated, user, groups]);

  // Monitor reconnection and maintain app state
  useEffect(() => {
    if (connected && authenticated) {
      console.log("Socket connection established and authenticated");
      // Socket is ready - all event listeners are active
      // Groups are automatically re-joined by socketService
      // No need to reload data - real-time events will update state
    }
  }, [connected, authenticated]);

  // ============ End Socket.io Integration ============

  const handleUpdateQuestion = (
    moduleId: number,
    index: number,
    newText: string
  ) => {
    setQuizQuestionsByModule((prev) => {
      const updatedQuestions = [...prev[moduleId]];
      updatedQuestions[index].questionText = newText;
      return { ...prev, [moduleId]: updatedQuestions };
    });
  };

  const handleUpdateAnswerText = (
    moduleId: number,
    questionIndex: number,
    answerIndex: number,
    newText: string
  ) => {
    setQuizQuestionsByModule((prev) => {
      const updatedQuestions = [...prev[moduleId]];
      updatedQuestions[questionIndex].answerOptions[answerIndex].answerText =
        newText;
      return { ...prev, [moduleId]: updatedQuestions };
    });
  };

  const handleSetCorrectAnswer = (
    moduleId: number,
    questionIndex: number,
    correctAnserIndex: number
  ) => {
    setQuizQuestionsByModule((prev) => {
      const updatedQuestions = [...prev[moduleId]];
      updatedQuestions[questionIndex].answerOptions.forEach((option, index) => {
        option.isCorrect = index === correctAnserIndex;
      });
      return { ...prev, [moduleId]: updatedQuestions };
    });
  };

  const handleUpdateLearningPath = (newText: string) => {
    setUnifiedLearningPathDescription(newText);
  };

  const handleUpdateNewsItem = (
    id: number,
    newTitle: string,
    newContent: string
  ) => {
    setNewsItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id
          ? { ...item, title: newTitle, content: newContent }
          : item
      )
    );
  };

  const handleAddNewsItem = () => {
    setNewsItems((prevItems) => [
      {
        id: Date.now(),
        title: "عنوان جديد",
        content: "محتوى جديد. انقر للتعديل.",
      },
      ...prevItems,
    ]);
  };

  const handleDeleteNewsItem = (id: number) => {
    setNewsItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // Fetch all groups from backend (admin only)
  const fetchGroups = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const API_BASE =
        (import.meta as any).env?.VITE_API_BASE ||
        "http://localhost:5001/api";

      const response = await fetch(`${API_BASE}/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.warn("Failed to fetch groups:", response.status);
        return;
      }

      const json = await response.json();
      setGroups(json.groups || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  }, []);

  const handleLogin = useCallback((loggedInUser: User) => {
    // ⚠️ BUG FIX: Don't set user immediately - fetch fresh profile from backend first
    setCurrentPage(PAGES[0]);

    // Add user to the global list if they don't exist
    setAllStudents((prev) => {
      if (prev.some((student) => student.email === loggedInUser.email)) {
        return prev;
      }
      return [...prev, loggedInUser];
    });

    // ✅ BUG FIX: Fetch fresh user profile from backend to get current groupId
    (async () => {
      try {
        // Fetch fresh profile to get groupId and other backend state
        const profileResp = await apiService.getUserProfile(loggedInUser.email);
        const freshUser = profileResp?.user;

        if (freshUser) {
          // Set user with FRESH data from backend (includes groupId)
          setUser({
            ...loggedInUser,
            groupId: freshUser.groupId, // Backend is source of truth
          });
        } else {
          // Fallback: use Firebase user if profile fetch fails
          setUser(loggedInUser);
        }

        // Load user's saved appdata from backend and merge into state
        // ✅ PHASE 2: Load user's saved appdata from backend (PRIORITY 1 - Backend wins)
        const resp = await apiService.loadAppData();
        const appData = resp?.appData || null;
        if (appData) {
          // ✅ BACKEND-OWNED STATE (MongoDB is source of truth)
          // merge moduleScores into allModuleScores under this user's email
          setAllModuleScores((prev) => ({
            ...prev,
            [loggedInUser.email]: appData.moduleScores || {},
          }));
          setCompletedLessons(appData.completedLessons || {});
          setFinalQuizPassed(appData.finalQuizPassed || false);
          setUnlockedModules(appData.unlockedModules || [1]);
          setCurrentActivityId(appData.currentActivityId || null);
          setCurrentModuleId(appData.currentModuleId || null);
          setNewsItems(appData.newsItems || INITIAL_NEWS_ITEMS);

          // ✅ UI-ONLY STATE (localStorage, loaded AFTER backend)
          // Only load if backend doesn't provide these values
          if (!appData.moduleLessonIndex && !appData.modulePageIndex) {
            const uiState = statePersistence.loadUIState();
            setModuleLessonIndex(uiState.moduleLessonIndex);
            setModulePageIndex(uiState.modulePageIndex);
            // currentActivityId already set from backend above
          } else {
            // Backend provided UI state (legacy support)
            setModuleLessonIndex(appData.moduleLessonIndex || 0);
            setModulePageIndex(appData.modulePageIndex || 0);
          }

          // Clean up old localStorage keys
          statePersistence.migrateOldStorage(loggedInUser.email);
        }

        // If admin, also fetch all users' appdata and student list to populate admin dashboard
        if (loggedInUser.email === ADMIN_USER.email) {
          try {
            const allResp = await apiService.getAllAppData();
            const all = allResp?.appdata || [];
            // Build allModuleScores map and discussions/groups pool
            const scoresMap: any = {};
            const discussionsList: any[] = [];
            for (const item of all) {
              if (item.email && item.moduleScores)
                scoresMap[item.email] = item.moduleScores;
              if (item.discussions && Array.isArray(item.discussions))
                discussionsList.push(...item.discussions);
            }
            setAllModuleScores((prev) => ({ ...prev, ...scoresMap }));
            if (discussionsList.length > 0) setDiscussions(discussionsList);
          } catch (err) {
            console.warn("Failed to load all appdata for admin", err);
          }

          // Fetch registered users list from backend (/api/users)
          try {
            const usersResp = await apiService.getUsers();
            if (Array.isArray(usersResp) && usersResp.length > 0) {
              setAllStudents(usersResp);
            }
          } catch (err) {
            console.warn("Failed to load users list for admin", err);
          }

          // Fetch groups list from backend (/api/groups)
          try {
            await fetchGroups();
          } catch (err) {
            console.warn("Failed to load groups list for admin", err);
          }
        }

        // Fetch user's group (skip for admin users who don't belong to groups)
        if (loggedInUser.email !== ADMIN_USER.email) {
          try {
            const group = await apiService.getMyGroup();
            setMyGroup(group);

            // If user is already in a group, navigate to correct starting module
            if (group && freshUser?.startModuleId) {
              // Navigate to the correct starting module (backend-driven)
              setCurrentModuleId(freshUser.startModuleId);
              setCurrentPage(PageEnum.ModuleContent);
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ User already in group - navigating to Module ${freshUser.startModuleId} based on backend learningPath`);
              }
            }
          } catch (err) {
            console.warn("Failed to fetch user group", err);
          }
        }
      } catch (err) {
        console.warn("Failed to load user appdata", err);
      }
    })();
  }, [setUser, setAllStudents, setAllModuleScores, setCompletedLessons, setFinalQuizPassed, setUnlockedModules, setCurrentActivityId, setCurrentModuleId, setModuleLessonIndex, setModulePageIndex, setDiscussions, setNewsItems, setMyGroup, fetchGroups]);

  const handleLogout = useCallback(() => {
    setUser(null);
    setQuizActive(false);
    setShowFinalQuiz(false);
    setLearningPathTopic(null);
    setCompletedLessons({});
    setFinalQuizPassed(false);
    setModuleLessonIndex(0);
    setModulePageIndex(0);
    setUnlockedModules([1]);
    setCurrentActivityId(null);
    setCurrentModuleId(null);
    setMyGroup(null);

    // ✅ PHASE 2: Clear UI-only state on logout
    statePersistence.clearUIState();

    // Do not clear global data like students, scores, groups or discussions on logout
  }, []);

  const handleSmartContentNavigation = useCallback(() => {
    if (!user) return;

    const userScores = allModuleScores[user.email];
    let lastPreTestModuleId: number | null = null;
    let isPostTestCompleted = false;

    if (userScores) {
      const moduleIds = Object.keys(userScores).map(Number);
      // Find modules where preTestScore exists (is not null)
      const modulesWithPreTest = moduleIds.filter(
        (id) =>
          userScores[id] &&
          userScores[id].preTestScore !== null &&
          userScores[id].preTestScore !== undefined
      );

      if (modulesWithPreTest.length > 0) {
        lastPreTestModuleId = Math.max(...modulesWithPreTest);

        // Check if post test is also completed for this module
        if (
          userScores[lastPreTestModuleId].postTestScore !== null &&
          userScores[lastPreTestModuleId].postTestScore !== undefined
        ) {
          isPostTestCompleted = true;
        }
      }
    }

    if (lastPreTestModuleId !== null) {
      if (isPostTestCompleted) {
        // If post-test is done, go to Content page (Modules list)
        setCurrentPage(PageEnum.Content);
      } else {
        // If post-test is NOT done, go to Learning Path
        setCurrentModuleId(lastPreTestModuleId);
        setCurrentPage(PageEnum.LearningPath);
      }
    } else {
      // No pre-test done at all
      setCurrentPage(PageEnum.Content);
    }
  }, [user, allModuleScores]);

  const handleStartModule = useCallback((moduleId: number) => {
    setCurrentModuleId(moduleId);
    setQuizActive(true);
    setModuleLessonIndex(0);
    setModulePageIndex(0);
  }, []);

  const handleContinueModule = useCallback(
    (moduleId: number) => {
      // Reset page index to 0 to prevent out-of-bounds errors when switching modules
      setModulePageIndex(0);

      // Determine the appropriate lesson to start/resume
      const completed = completedLessons[moduleId] || [];
      const lessons = moduleContent[moduleId] || [];
      let nextLessonIndex = 0;

      if (lessons.length > 0 && completed.length > 0) {
        const maxCompleted = Math.max(...completed);
        if (maxCompleted + 1 < lessons.length) {
          nextLessonIndex = maxCompleted + 1;
        }
      }
      setModuleLessonIndex(nextLessonIndex);

      setCurrentModuleId(moduleId);
      setCurrentPage(PageEnum.ModuleContent);
    },
    [completedLessons]
  );

  const handleCompleteQuiz = useCallback(
    (score: number, timeTaken: number) => {
      if (currentModuleId && user) {
        let nextAllModuleScores: typeof allModuleScores | null = null;

        setAllModuleScores((prevScores) => {
          const userScores = prevScores[user.email] || {};
          const updatedUserScores = {
            ...userScores,
            [currentModuleId]: {
              ...(userScores[currentModuleId] || {
                preTestScore: null,
                postTestScore: null,
                preTestTime: null,
                postTestTime: null,
              }),
              preTestScore: score,
              preTestTime: timeTaken,
            },
          };
          nextAllModuleScores = {
            ...prevScores,
            [user.email]: updatedUserScores,
          };
          return nextAllModuleScores;
        });

        // Persist appdata (moduleScores) to backend
        // Guard: Only save if user has valid data to persist
        // Note: saveAppData does not require groupId, so this is safe for all users
        try {
          const payload = {
            moduleScores: undefined as any,
            completedLessons: undefined as any,
            finalQuizPassed: undefined as any,
            unlockedModules: undefined as any,
            currentActivityId: currentActivityId,
            currentModuleId: currentModuleId,
            moduleLessonIndex,
            modulePageIndex,
            learningPathTopic,
            newsItems,
          };
          // construct moduleScores for this user
          // Use latest in-memory state via functional update capture
          const moduleScoresForUser =
            nextAllModuleScores?.[user.email] || allModuleScores[user.email] || {};
          payload.moduleScores = moduleScoresForUser;
          payload.completedLessons = completedLessons;
          payload.finalQuizPassed = finalQuizPassed;
          payload.unlockedModules = unlockedModules;

          apiService
            .saveAppData(payload)
            .catch((err: any) =>
              console.warn("Failed to save appdata after pre-test", err)
            );
        } catch (err) {
          console.warn("AppData save unavailable", err);
        }

        // Activity recording removed - backend endpoint /api/activities does not exist
        // Activity data is now tracked via /api/appdata

        // POST exam result to new endpoint
        const questionsForModule = quizQuestionsByModule[currentModuleId] || [];
        apiService
          .submitExam({
            examId: String(currentModuleId),
            examType: "pre",
            score: Number(score),
            total: Number(questionsForModule.length),
          })
          .then((resp) => {
            console.log("Exam submitted:", resp);
            // If checking learning path from response:
            // if (resp.learningPath) { ... }
          })
          .catch((err) => console.error("Failed to submit exam:", err));
      }
      setQuizActive(false);
      setCurrentPage(PageEnum.LearningPath);
    },
    [currentModuleId, user, quizQuestionsByModule]
  );

  const handleStartFinalQuiz = useCallback(() => {
    setShowFinalQuiz(true);
  }, []);

  const handleCompleteFinalQuiz = useCallback(
    (score: number, timeTaken: number) => {
      if (currentModuleId && user) {
        let nextAllModuleScores: typeof allModuleScores | null = null;

        const questionsForModule = quizQuestionsByModule[currentModuleId] || [];
        const passingScore = Math.ceil(questionsForModule.length * 0.8); // Example: 80% to pass

        setAllModuleScores((prevScores) => {
          const userScores = prevScores[user.email] || {};
          const updatedUserScores = {
            ...userScores,
            [currentModuleId]: {
              ...(userScores[currentModuleId] || {
                preTestScore: null,
                postTestScore: null,
                preTestTime: null,
                postTestTime: null,
              }),
              postTestScore: score,
              postTestTime: timeTaken,
            },
          };
          nextAllModuleScores = {
            ...prevScores,
            [user.email]: updatedUserScores,
          };
          return nextAllModuleScores;
        });

        // Persist user's appdata with updated moduleScores and finalQuizPassed/unlockedModules
        // Guard: saveAppData does not require groupId, safe for all users
        try {
          const payload: any = {};
          const moduleScoresForUser =
            nextAllModuleScores?.[user.email] || allModuleScores[user.email] || {};
          payload.moduleScores = moduleScoresForUser;
          payload.completedLessons = completedLessons;
          payload.finalQuizPassed =
            finalQuizPassed ||
            score >=
            Math.ceil(
              (quizQuestionsByModule[currentModuleId] || []).length * 0.8
            );
          payload.unlockedModules = unlockedModules;
          payload.currentActivityId = currentActivityId;
          payload.currentModuleId = currentModuleId;
          payload.moduleLessonIndex = moduleLessonIndex;
          payload.modulePageIndex = modulePageIndex;
          payload.newsItems = newsItems;

          apiService
            .saveAppData(payload)
            .catch((err: any) =>
              console.warn("Failed to save appdata after final quiz", err)
            );
        } catch (err) {
          console.warn("AppData save unavailable", err);
        }

        // Activity recording removed - backend endpoint /api/activities does not exist
        // Activity data is now tracked via /api/appdata

        // POST exam result to new endpoint
        const totalQuestions = (quizQuestionsByModule[currentModuleId] || []).length;
        apiService
          .submitExam({
            examId: String(currentModuleId),
            examType: "post",
            score,
            total: totalQuestions,
          })
          .then((resp) => console.log("Post-exam submitted:", resp))
          .catch((err) => console.error("Failed to submit post-exam:", err));

        if (score >= passingScore) {
          setFinalQuizPassed(true);

          // Auto-unlock next module upon passing
          const nextModuleId = currentModuleId + 1;
          setUnlockedModules((prev) => {
            // Check if module exists and isn't already unlocked
            if (
              !prev.includes(nextModuleId) &&
              nextModuleId <= MODULES.length
            ) {
              return [...prev, nextModuleId].sort((a, b) => a - b);
            }
            return prev;
          });

          // Note: Automatic Removal from Group is disabled here.
          // In a stateless model, this must be handled by the backend.
        }

        // Show post-test results page
        setShowFinalQuiz(false);
        setPostTestScore({
          score,
          maxScore: questionsForModule.length,
          passingScore,
        });
        setShowPostTestResults(true);
      }
    },
    [currentModuleId, user, quizQuestionsByModule]
  );

  const handleContinueFromResults = useCallback(() => {
    setShowPostTestResults(false);
    setPostTestScore(null);
    setCurrentPage(PageEnum.Content);
  }, []);

  const handleRetryModule = useCallback(() => {
    setShowFinalQuiz(false);
    setCurrentPage(PageEnum.ModuleContent);
  }, []);

  const handleNavigateToActivity = useCallback(() => {
    setCurrentPage(PageEnum.Activity);
  }, []);

  const handleUnlockAndNavigate = useCallback(
    (moduleId: number, page: Page) => {
      setUnlockedModules((prev) => {
        if (prev.includes(moduleId)) return prev;
        return [...prev, moduleId].sort((a, b) => a - b);
      });
      setCurrentPage(page);
      setShowFinalQuiz(false);
    },
    []
  );

  const handleNavigateAndCloseQuiz = useCallback((page: Page) => {
    setCurrentPage(page);
    setShowFinalQuiz(false);
  }, []);

  const handleSelectTopic = useCallback((topic: string) => {
    setLearningPathTopic(topic);
    setCurrentPage(PageEnum.LearningPathDetail);
  }, []);

  const handleReturnToPath = useCallback(() => {
    setLearningPathTopic(null);
    setCurrentPage(PageEnum.LearningPath);
  }, []);

  const handleNavigateToModuleContent = useCallback(() => {
    setCurrentPage(PageEnum.ModuleContent);
  }, []);

  const handleNavigateToContent = useCallback(() => {
    setCurrentPage(PageEnum.Content);
  }, []);

  const handleNavigateToGroupFormation = useCallback(() => {
    setCurrentPage(PageEnum.GroupFormation);
  }, []);

  const handleStartActivity = useCallback((activityId: number) => {
    setCurrentActivityId(activityId);
    setCurrentPage(PageEnum.CollaborativeLearning);
  }, []);

  const handleBackToActivities = useCallback(() => {
    setCurrentActivityId(null);
    setCurrentPage(PageEnum.Activity);
  }, []);

  const handleEnterGroup = useCallback((groupId: string) => {
    // Admin enters group - set context and navigate to Activity page
    // This allows admin to chat/upload in this group
    setAdminEnteredGroupId(groupId);
    setCurrentPage(PageEnum.Activity);
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!user) return;

    try {
      // TASK 3: Backend generates name - don't send name from frontend
      await apiService.createGroup({ level: "beginner", members: [] });
      console.log("Group created successfully");

      // TASK 5: Re-fetch groups to ensure UI updates immediately with backend-generated name
      await fetchGroups();
    } catch (err: any) {
      console.error("Failed to create group:", err);
      // TASK 5: Never show [object Object] - extract proper error message
      const msg = err?.response?.data?.error || err?.message || "حدث خطأ غير متوقع";
      alert(`فشل إنشاء المجموعة: ${msg}`);
    }
  }, [user, fetchGroups]);

  const handleUpdateAvatar = (newAvatar: string) => {
    if (user) {
      const updatedUser = { ...user, avatar: newAvatar };
      setUser(updatedUser);
      // Update in
      localStorage.setItem("userAvatar", newAvatar);

      // Also update in allStudents list
      setAllStudents((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u))
      );

      // Note: Group membership updates are handled by the backend
      // and reflected here via real-time socket events.
    }
  };

  const handleJoinGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;

      try {
        // TASK 2: Use new student join endpoint (token-based, no userId)
        await apiService.joinGroup(groupId);
        if (process.env.NODE_ENV === 'development') {
          console.log("Successfully joined group");
        }

        // Refresh groups to update UI
        await fetchGroups();

        // ✅ CRITICAL: Fetch fresh user profile and update user object in App state
        // This fixes stale state that causes "Join Group" button to persist
        try {
          const profileResp = await apiService.getUserProfile(user.email);

          if (profileResp?.user) {
            // Update user object with fresh data from backend (including groupId)
            setUser({
              ...user,
              groupId: profileResp.user.groupId, // Fresh groupId from backend
            });

            const startModuleId = profileResp.user.startModuleId;

            if (startModuleId) {
              // Navigate to the correct starting module (backend-driven)
              setCurrentModuleId(startModuleId);
              setCurrentPage(PageEnum.ModuleContent);
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ Navigating to Module ${startModuleId} based on backend learningPath`);
              }
            }
          }
        } catch (profileErr) {
          console.warn("Failed to fetch profile after group join:", profileErr);
          // Don't block the success flow - user can navigate manually
        }

        alert("تم الانضمام إلى المجموعة بنجاح");
      } catch (err: any) {
        console.error("Failed to join group:", err);
        const msg = err?.response?.data?.error || err?.message || "حدث خطأ غير متوقع";
        alert(`فشل الانضمام للمجموعة: ${msg}`);
      }
    },
    [user, fetchGroups]
  );

  const handleRemoveUserFromGroup = useCallback(
    (groupId: string, userId: string) => {
      apiService.removeUserFromGroup(groupId, userId)
        .then(async () => {
          if (process.env.NODE_ENV === 'development') {
            console.log("Successfully removed user from group");
          }
          // TASK 6: Ensure UI refresh after removal
          await fetchGroups();
        })
        .catch(err => {
          console.error("Failed to remove user from group:", err);
          const msg = err?.response?.data?.error || err?.message || "حدث خطأ غير متوقع";
          alert(`فشل إزالة المستخدم: ${msg}`);
        });
    },
    [fetchGroups]
  );

  const handleAddUserToGroup = useCallback(
    (groupId: string, userId?: string) => {
      if (!userId) {
        // Logic to find unassigned student
        const assignedStudentIds = new Set(
          groups.flatMap((g) => g.members.map((m) => m.id))
        );
        const userToAdd = allStudents.find(
          (s) => !assignedStudentIds.has(s.id) && s.email !== ADMIN_USER.email
        );

        if (!userToAdd) {
          alert("لا يوجد مستخدم لإضافته.");
          return;
        }
        userId = userToAdd.id;
      }

      // TASK 4: Guard - validate userId before API call
      if (!userId || userId.trim() === "") {
        alert("من فضلك اختر مستخدم صحيح");
        return;
      }

      apiService.assignUserToGroup(groupId, userId)
        .then(async () => {
          if (process.env.NODE_ENV === 'development') {
            console.log("Successfully added user to group");
          }
          // TASK 5: Re-fetch groups to ensure UI updates immediately
          await fetchGroups();
        })
        .catch(err => {
          console.error("Failed to add user to group:", err);
          // TASK 5: Never show [object Object] - extract proper error message
          const msg = err?.response?.data?.error || err?.message || "حدث خطأ غير متوقع";
          alert(`فشل إضافة العضو: ${msg}`);
        });
    },
    [allStudents, groups, fetchGroups]
  );

  const handleSendMessage = useCallback(
    (activityId: number, text: string) => {
      if (!user || !text.trim() || !currentModuleId) return;

      // ✅ PHASE 3: Use centralized guard (no silent blocks)
      const { currentGroupId } = groupContext;
      const guardResult = guards.canChat(user, currentGroupId, adminEnteredGroupId);

      if (!guardResult.allowed) {
        // Show user-facing message instead of silent return
        guards.showBlockedMessage(guardResult);
        return;
      }

      const newMessage: Message = {
        id: `msg - ${Date.now()} `,
        groupId: currentGroupId,
        moduleId: currentModuleId,
        activityId,
        author: user,
        text,
        timestamp: new Date().toISOString(),
      };
      setDiscussions((prev) => [...prev, newMessage]);

      // Sync activity message to backend MongoDB
      // Both admin and student can sync (backend validates permissions)
      (async () => {
        try {
          const firebaseUser = auth.currentUser;
          if (firebaseUser) {
            const idToken = await firebaseUser.getIdToken();
            await syncActivityMessage(
              {
                activityId: activityId,
                text: text,
              },
              idToken
            );
            if (process.env.NODE_ENV === 'development') {
              console.log("✅ Activity message synced to backend");
            }
          }
        } catch (syncErr) {
          console.warn("Failed to sync activity message:", syncErr);
        }
      })();

    },
    [user, groupContext, currentModuleId]
  );

  // Handle Activity File Submission
  const handleActivitySubmission = useCallback(
    (activityId: number, file: File) => {
      if (!user) return;

      // ✅ PHASE 3: Check permission before upload
      const guardResult = guards.canUploadFile(user, undefined, adminEnteredGroupId);
      if (!guardResult.allowed) {
        guards.showBlockedMessage(guardResult);
        return;
      }

      // Read file as Data URL and upload to backend GridFS submissions endpoint
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        try {
          // get Firebase ID token if available
          let token: string | null = null;
          try {
            const authModule = await import("./src/firebase");
            token = authModule.auth.currentUser
              ? await authModule.auth.currentUser.getIdToken()
              : null;
          } catch (err) {
            console.warn("Could not read Firebase token:", err);
          }

          const payload = {
            name: file.name,
            type: file.type,
            data: base64Data,
            moduleId: currentModuleId,
            activityId,
          };

          const headers: any = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = "Bearer " + token;

          // Use API_BASE from environment
          const API_BASE =
            (import.meta as any).env?.VITE_API_BASE ||
            "https://backend-adaptive-collearning.up.railway.app/api";

          const resp = await fetch(`${API_BASE}/submissions`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            console.error("Upload failed", resp.status);
            alert("فشل رفع الملف إلى الخادم");
            return;
          }
          const body = await resp.json();

          // Sync activity file to backend MongoDB
          // Both admin and student can sync (backend validates permissions)
          try {
            const firebaseUser = auth.currentUser;
            if (firebaseUser && token) {
              await syncActivityFile(
                {
                  activityId: activityId,
                  filename: file.name,
                  url: body.url,
                  uploadedByUid: firebaseUser.uid,
                },
                token
              );
              if (process.env.NODE_ENV === 'development') {
                console.log("✅ Activity file synced to backend");
              }
            }
          } catch (syncErr) {
            console.warn("Failed to sync activity file:", syncErr);
          }

          const newMessage: Message = {
            id: `sub-${Date.now()}`,
            groupId: "admin-inbox",
            moduleId: currentModuleId,
            activityId,
            author: user,
            text: `قام ${user.name} برفع ملف: ${file.name}`,
            timestamp: new Date().toISOString(),
            attachment: {
              name: file.name,
              type: file.type,
              // backend returns a stable URL
              data: undefined as any, // keep shape backward compatible; prefer `url` below
            },
            isSubmission: true,
          };

          // attach returned URL/id to message (store under attachment.url)
          (newMessage as any).attachment = {
            name: file.name,
            type: file.type,
            url: body.url,
            id: body.fileId,
          };

          alert("تم رفع الملف إلى الخادم وإرساله بنجاح!");
        } catch (err) {
          console.error("Error uploading submission:", err);
          alert("حدث خطأ أثناء رفع الملف");
        }
      };
      reader.readAsDataURL(file);
    },
    [user, currentModuleId]
  );

  const renderPage = () => {
    if (!user) return null;

    const isAdmin = user.email === ADMIN_USER.email;

    if (currentPage === PageEnum.LearningPathDetail && learningPathTopic) {
      return (
        <LearningPathDetailPage
          topicTitle={learningPathTopic}
          onBack={handleReturnToPath}
        />
      );
    }

    switch (currentPage) {
      case PageEnum.Home:
        return <HomePage />;
      case PageEnum.Instructions:
        return <InstructionsPage />;
      case PageEnum.News:
        return (
          <NewsPage
            newsItems={newsItems}
            isAdmin={isAdmin}
            onUpdateNewsItem={handleUpdateNewsItem}
            onAddNewsItem={handleAddNewsItem}
            onDeleteNewsItem={handleDeleteNewsItem}
          />
        );
      case PageEnum.Content:
        return (
          <ContentPage
            onStartModule={handleStartModule}
            onContinueModule={handleContinueModule}
            unlockedModules={unlockedModules}
            user={user}
            allModuleScores={allModuleScores}
          />
        );
      case PageEnum.Goals:
        return <GoalsPage />;
      case PageEnum.Profile:
        return (
          <ProfilePage
            user={user}
            allModuleScores={allModuleScores}
            quizQuestionsByModule={quizQuestionsByModule}
            isAdmin={isAdmin}
            allStudents={allStudents}
            groups={groups}
            myGroup={myGroup}
            onUpdateAvatar={handleUpdateAvatar}
          />
        );
      case PageEnum.AdminDashboard:
        return (
          <AdminDashboardPage
            groups={groups}
            allStudents={allStudents}
            allModuleScores={allModuleScores}
            quizQuestionsByModule={quizQuestionsByModule}
            discussions={discussions}
          />
        );
      case PageEnum.LearningPath:
        const userScores = user ? allModuleScores[user.email] : null;
        let level: CognitiveLevel = "أساسي";

        if (userScores) {
          const moduleIdsWithPreTest = Object.keys(userScores)
            .map(Number)
            .filter(
              (moduleId) =>
                userScores[moduleId].preTestScore !== null &&
                userScores[moduleId].preTestScore !== undefined
            );

          if (moduleIdsWithPreTest.length > 0) {
            const latestModuleId = Math.max(...moduleIdsWithPreTest);
            const latestScore = userScores[latestModuleId].preTestScore;
            const totalQuestionsForLatestModule =
              quizQuestionsByModule[latestModuleId]?.length || 0;
            level = getCognitiveLevel(
              latestScore,
              totalQuestionsForLatestModule
            );
          }
        }

        return (
          <LearningPathPage
            onSelectTopic={handleSelectTopic}
            onNavigateToGroupFormation={handleNavigateToGroupFormation}
            isAdmin={isAdmin}
            description={unifiedLearningPathDescription}
            onUpdateDescription={handleUpdateLearningPath}
            generalGoal={learningPathGeneralGoal}
            onUpdateGeneralGoal={setLearningPathGeneralGoal}
            objectives={learningPathObjectives}
            onUpdateObjectives={setLearningPathObjectives}
            level={level}
          />
        );
      case PageEnum.ModuleContent:
        return (
          <ModuleContentPage
            currentModuleId={currentModuleId}
            onBack={handleReturnToPath}
            completedLessons={
              currentModuleId ? completedLessons[currentModuleId] || [] : []
            }
            setCompletedLessons={(updater) => {
              if (!currentModuleId) return;
              setCompletedLessons((prev) => {
                const currentModuleCompleted = prev[currentModuleId] || [];
                const newCompleted =
                  typeof updater === "function"
                    ? updater(currentModuleCompleted)
                    : updater;
                return { ...prev, [currentModuleId]: newCompleted };
              });
            }}
            currentLessonIndex={moduleLessonIndex}
            currentPageIndex={modulePageIndex}
            onSetLesson={setModuleLessonIndex}
            onSetPage={setModulePageIndex}
            onNavigateToActivity={handleNavigateToActivity}
            onNavigateToContentPage={handleNavigateToContent}
          />
        );
      case PageEnum.GroupFormation:
        return (
          <GroupFormationPage
            onNavigateToModuleContent={handleNavigateToModuleContent}
            user={user}
            groups={groups}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
            onRemoveUserFromGroup={handleRemoveUserFromGroup}
            onAddUserToGroup={handleAddUserToGroup}
            onEnterGroup={handleEnterGroup}
            isAdmin={isAdmin}
            allUsers={allStudents}
          />
        );
      case PageEnum.Activity:
        const activityModuleScores =
          user && currentModuleId
            ? allModuleScores[user.email]?.[currentModuleId]
            : null;
        const questions = currentModuleId
          ? quizQuestionsByModule[currentModuleId] || []
          : [];
        const passingScore = Math.ceil(questions.length * 0.8);

        // Check if the user passed the final quiz (Post-Test)
        const isPostTestPassed =
          activityModuleScores?.postTestScore !== null &&
          activityModuleScores?.postTestScore !== undefined &&
          activityModuleScores.postTestScore >= passingScore;

        return <ActivityPage
          onStartFinalQuiz={handleStartFinalQuiz}
          onStartActivity={handleStartActivity}
          currentModuleId={currentModuleId}
          isPostTestCompleted={isPostTestPassed}
          onNavigateToModuleContent={handleNavigateToModuleContent}
          isAdmin={isAdmin}
          onSubmitActivity={handleActivitySubmission}
        />;

      case PageEnum.CollaborativeLearning:
        return (
          <CollaborativeLearningPage
            activityId={currentActivityId}
            moduleId={currentModuleId}
            onBack={handleBackToActivities}
            user={user}
            groups={groups}
            discussions={discussions}
            onSendMessage={handleSendMessage}
            adminEnteredGroupId={adminEnteredGroupId}
          />
        );
      default:
        return <HomePage />;
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isAdmin = user.email === ADMIN_USER.email;

  if (quizActive && currentModuleId) {
    return (
      <ModuleQuizPage
        onComplete={handleCompleteQuiz}
        questions={quizQuestionsByModule[currentModuleId] || []}
        onUpdateQuestion={(index, newText) =>
          handleUpdateQuestion(currentModuleId, index, newText)
        }
        isAdmin={isAdmin}
        onUpdateAnswerText={(qIndex, aIndex, newText) =>
          handleUpdateAnswerText(currentModuleId, qIndex, aIndex, newText)
        }
        onSetCorrectAnswer={(qIndex, aIndex) =>
          handleSetCorrectAnswer(currentModuleId, qIndex, aIndex)
        }
        currentModuleId={currentModuleId}
      />
    );
  }

  // Show post-test results page
  if (showPostTestResults && postTestScore && currentModuleId) {
    return (
      <PostTestResultsPage
        score={postTestScore.score}
        maxScore={postTestScore.maxScore}
        passingScore={postTestScore.passingScore}
        moduleId={currentModuleId}
        onContinue={handleContinueFromResults}
      />
    );
  }

  if (showFinalQuiz && currentModuleId) {
    const questionsForModule = quizQuestionsByModule[currentModuleId] || [];
    const passingScore = Math.ceil(questionsForModule.length * 0.8); // Example: 80% to pass

    return (
      <FinalQuizPage
        onComplete={handleCompleteFinalQuiz}
        onRetry={handleRetryModule}
        onUnlockAndNavigate={handleUnlockAndNavigate}
        onNavigateAndClose={handleNavigateAndCloseQuiz}
        questions={questionsForModule}
        onUpdateQuestion={(index, newText) =>
          handleUpdateQuestion(currentModuleId, index, newText)
        }
        isAdmin={isAdmin}
        onUpdateAnswerText={(qIndex, aIndex, newText) =>
          handleUpdateAnswerText(currentModuleId, qIndex, aIndex, newText)
        }
        onSetCorrectAnswer={(qIndex, aIndex) =>
          handleSetCorrectAnswer(currentModuleId, qIndex, aIndex)
        }
        currentModuleId={currentModuleId}
        passingScore={passingScore}
      />
    );
  }

  return (
    <DashboardLayout
      user={user}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      onLogout={handleLogout}
      finalQuizPassed={finalQuizPassed}
      onSmartContentNavigation={handleSmartContentNavigation}
    >
      {renderPage()}
    </DashboardLayout>
  );
};

export default App;
