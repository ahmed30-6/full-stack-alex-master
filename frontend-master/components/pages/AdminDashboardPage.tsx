import React, { useEffect, useState } from "react";
import { apiService } from "../../src/services/apiService";
import type { Activity } from "../../src/services/apiService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { User, Group, Message } from "../../types";
import { ADMIN_USER_EMAIL } from "../../constants";

interface Question {
  questionText: string;
  answerOptions: any[];
}
interface QuizQuestionsByModule {
  [key: number]: Question[];
}

interface AdminDashboardPageProps {
  groups: Group[];
  allStudents: User[];
  allModuleScores: {
    [email: string]: {
      [key: number]: {
        preTestScore: number | null;
        postTestScore: number | null;
        preTestTime: number | null;
        postTestTime: number | null;
      };
    };
  };
  quizQuestionsByModule: QuizQuestionsByModule;
  discussions?: Message[];
}

const getCognitiveLevel = (
  score: number | null,
  totalQuestions: number
): string => {
  if (score === null || score === undefined || totalQuestions === 0)
    return "لم يحدد بعد";

  const percentage = (score / totalQuestions) * 100;

  if (percentage <= 47) return "مبتدئ";
  if (percentage <= 73) return "متوسط";
  return "متقدم";
};

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  groups,
  allStudents,
  allModuleScores,
  quizQuestionsByModule,
  discussions = [],
}) => {
  const totalQuestionsForModule1 = quizQuestionsByModule[1]?.length || 0;

  // 1. Calculate stats for "عدد المجموعات حسب المستوى المعرفي"
  const groupLevels: { [key: string]: number } = {
    مبتدئ: 0,
    متوسط: 0,
    متقدم: 0,
    "لم يحدد بعد": 0,
  };

  groups.forEach((group) => {
    let totalScore = 0;
    let membersWithScores = 0;

    // Filter out the admin before calculating group scores
    const studentMembers = group.members.filter(
      (member) => member.email !== ADMIN_USER_EMAIL
    );

    studentMembers.forEach((member) => {
      const scores = allModuleScores[member.email];
      const preTestScore = scores && scores[1] ? scores[1].preTestScore : null;
      if (preTestScore !== null) {
        totalScore += preTestScore;
        membersWithScores++;
      }
    });

    if (membersWithScores > 0) {
      const avgScore = totalScore / membersWithScores;
      const level = getCognitiveLevel(avgScore, totalQuestionsForModule1);
      groupLevels[level]++;
    } else if (studentMembers.length > 0) {
      // Only count groups that have actual students
      groupLevels["لم يحدد بعد"]++;
    }
  });

  const groupLevelData = [
    { name: "مبتدئ", "عدد المجموعات": groupLevels["مبتدئ"], fill: "#3b82f6" },
    { name: "متوسط", "عدد المجموعات": groupLevels["متوسط"], fill: "#ef4444" },
    { name: "متقدم", "عدد المجموعات": groupLevels["متقدم"], fill: "#22c55e" },
  ];

  // Real-time users state from Firestore
  const [users, setUsers] = useState<User[]>(allStudents || []);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Set up real-time listeners for continuous, live data sync from Firestore
  useEffect(() => {
    // Watch students collection in real-time for instant updates
    const unsubscribeStudents = apiService.watchStudents((students) => {
      setUsers(students);
    });

    // Watch activities collection in real-time
    const unsubscribeActivities = apiService.watchActivities((activities) => {
      setRecentActivities(activities.slice(0, 50)); // Show latest 50 activities
    });

    // Cleanup both listeners on unmount
    return () => {
      unsubscribeStudents();
      unsubscribeActivities();
    };
  }, []);

  // 2. Prepare data for "المسار التعليمي" for every student
  const studentsToList = users
    .filter((s) => s.email !== ADMIN_USER_EMAIL)
    .map((student) => {
      const studentScores = allModuleScores[student.email];
      const preTestScore =
        studentScores && studentScores[1]
          ? studentScores[1].preTestScore
          : null;
      const level = getCognitiveLevel(preTestScore, totalQuestionsForModule1);

      return {
        ...student,
        level,
        preTestScore,
      };
    });

  // 3. Fetch activity file submissions from backend
  const [activityFiles, setActivityFiles] = useState<any[]>([]);

  // Login events loaded from backend
  const [loginEvents, setLoginEvents] = useState<any[]>([]);

  // Helper: normalize various timestamp shapes to a JS Date
  const normalizeToDate = (ts: any): Date => {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
    // Firestore Timestamp-like object
    if (typeof ts.toDate === "function") return ts.toDate();
    // Fallback: try to read seconds/nanos
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
    return new Date();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const events = await apiService.getLoginEvents();
        if (mounted) setLoginEvents(events);
      } catch (err) {
        console.error("Failed to fetch login events", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch activity files for submissions section
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const files = await apiService.getActivityFiles();
        if (mounted) setActivityFiles(files);
      } catch (err) {
        console.error("Failed to fetch activity files", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        لوحة تحكم الباحثة - تحليلات الطلاب والمجموعات
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 mb-8">
        {/* Chart for Group Cognitive Level */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg md:text-xl font-bold text-gray-700 mb-4">
            عدد المجموعات حسب المستوى المعرفي
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={groupLevelData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip wrapperClassName="bg-white p-2 border rounded-md" />
              <Legend />
              <Bar dataKey="عدد المجموعات" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table for student learning paths */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg md:text-xl font-bold text-gray-700 mb-4">
            المسارات التعليمية للطلاب
          </h2>
          <div className="overflow-y-auto h-[300px]">
            {studentsToList.length > 0 ? (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {studentsToList.map((student) => (
                    <div key={student.id} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-bold text-gray-800">{student.name}</p>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>
                          المسار:{" "}
                          <span className="font-semibold text-blue-600">
                            {student.level}
                          </span>
                        </p>
                        <p>
                          درجة الاختبار:{" "}
                          <span className="font-semibold text-red-600">
                            {student.preTestScore !== null
                              ? `${student.preTestScore} / ${totalQuestionsForModule1}`
                              : "N/A"}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <table className="min-w-full bg-white hidden md:table">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-right py-3 px-4 font-semibold text-sm">
                        اسم الطالب
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">
                        المسار (المستوى)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">
                        درجة الاختبار القبلي
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">
                        المجموعة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {studentsToList.map((student) => {
                      const studentGroup = groups.find(g => g.id === student.groupId);
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">{student.name}</td>
                          <td className="py-3 px-4">{student.level}</td>
                          <td className="py-3 px-4">
                            {student.preTestScore !== null
                              ? `${student.preTestScore} / ${totalQuestionsForModule1}`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${studentGroup ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {studentGroup ? studentGroup.name : 'لم ينضم'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-center text-gray-500 py-4">
                لا يوجد طلاب مسجلون لعرض بياناتهم.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Student Activities Section */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mt-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-700 mb-4">
          🔔 الأنشطة الحية (آخر التحديثات - مباشر)
        </h2>
        <div className="overflow-y-auto h-[300px]">
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-blue-900">
                        {activity.userName}
                      </p>
                      <p className="text-sm text-blue-700">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        البريد: {activity.userEmail}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {activity.timestamp &&
                        normalizeToDate(activity.timestamp).toLocaleTimeString(
                          "ar-EG"
                        )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              لا توجد أنشطة حتى الآن. سيتم عرض الأنشطة هنا بشكل مباشر عند
              حدوثها.
            </p>
          )}
        </div>
      </div>

      {/* Activity Submissions Section */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
        <h2 className="text-lg md:text-xl font-bold text-gray-700 mb-4">
          تسليمات الأنشطة الطلابية (الملفات المحملة)
        </h2>
        <div className="overflow-y-auto h-[300px]">
          {activityFiles.length > 0 ? (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-right py-3 px-4 font-semibold text-sm">
                    اسم الطالب
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">
                    النشاط
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">
                    اسم الملف
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">
                    تاريخ التسليم
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">
                    تحميل
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activityFiles.map((file) => {
                  // Find student by uploadedByUid
                  const student = users.find(
                    (u) => u.firebaseUid === file.uploadedByUid || u.id === file.uploadedByUid
                  );

                  return (
                    <tr key={file._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        {student && (
                          <>
                            <img
                              src={student.avatar || "/default-avatar.png"}
                              className="w-6 h-6 rounded-full"
                              alt="avatar"
                            />
                            {student.name}
                          </>
                        )}
                        {!student && (
                          <span className="text-gray-400">غير معروف</span>
                        )}
                      </td>
                      <td className="py-3 px-4">نشاط {file.activityId}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {file.filename}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(file.createdAt).toLocaleDateString("ar-EG")}{" "}
                        {new Date(file.createdAt).toLocaleTimeString("ar-EG")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={file.url}
                          download={file.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded transition"
                        >
                          تنزيل
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-4">
              لا توجد تسليمات حتى الآن.
            </p>
          )}
        </div>
      </div>

      {/* Login Events Section */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mt-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-700 mb-4">
          سجل تسجيلات الدخول (أحدث أولاً)
        </h2>
        <div className="overflow-y-auto h-[260px]">
          {loginEvents.length > 0 ? (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-right py-2 px-3 text-sm font-semibold">
                    الاسم
                  </th>
                  <th className="text-right py-2 px-3 text-sm font-semibold">
                    البريد الإلكتروني
                  </th>
                  <th className="text-right py-2 px-3 text-sm font-semibold">
                    الوقت
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold">
                    المتصفح / الجهاز
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loginEvents.map((ev) => (
                  <tr key={ev._id} className="hover:bg-gray-50">
                    <td className="py-2 px-3">{ev.name}</td>
                    <td className="py-2 px-3">{ev.email}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">
                      {new Date(ev.timestamp).toLocaleString("ar-EG")}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-700 break-words">
                      {ev.userAgent || ev.ip || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-4">
              لا توجد تسجيلات دخول حتى الآن.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
