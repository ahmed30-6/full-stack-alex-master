
import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../src/services/apiService';
import type { User, Group } from '../../types';
import { MODULES, ADMIN_USER_EMAIL } from '../../constants';

const avatarFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23737474' font-size='20'>No+Image</text></svg>";

interface Question {
    questionText: string;
    answerOptions: any[];
}
interface QuizQuestionsByModule {
    [key: number]: Question[];
}

interface ProfilePageProps {
    user: User;
    allModuleScores: { [email: string]: { [key: number]: { preTestScore: number | null, postTestScore: number | null, preTestTime: number | null, postTestTime: number | null } } };
    quizQuestionsByModule: QuizQuestionsByModule;
    isAdmin: boolean;
    allStudents: User[];
    groups: Group[];
    myGroup: Group | null;
    onUpdateAvatar?: (newAvatar: string) => void;
}

const StudentProfileView: React.FC<{
    student: User,
    scores: { [key: number]: any },
    quizQuestionsByModule: QuizQuestionsByModule,
    groups: Group[],
    myGroup: Group | null,
    submissions: any[],
    isOwner?: boolean,
    onUpdateAvatar?: (newAvatar: string) => void
}> = ({ student, scores, quizQuestionsByModule, groups, myGroup, submissions, isOwner, onUpdateAvatar }) => {

    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatTime = (totalSeconds: number | null) => {
        if (totalSeconds === null || totalSeconds === undefined) return '---';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // ✅ SINGLE SOURCE OF TRUTH: Use student.groupId directly (no fallback logic)
    const studentGroup = student.groupId ? groups.find(g => g.id === student.groupId) : null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onUpdateAvatar) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onUpdateAvatar(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <>
            <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-6">
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-right">
                    <div className="relative mr-0 sm:mr-6 mb-4 sm:mb-0">
                        <img
                            src={student.avatar || avatarFallback}
                            alt="صورة الطالب"
                            className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover"
                        />
                        {isOwner && onUpdateAvatar && (
                            <div
                                className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer hover:bg-blue-700 transition"
                                onClick={() => fileInputRef.current?.click()}
                                title="تغيير الصورة"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{student.name}</h2>
                        <p className="text-gray-600">{student.email}</p>
                        <p className="text-sm text-blue-600 font-semibold mt-1">نمط التعلم: تشاركي</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-bold text-indigo-600 mb-4 border-b pb-2">ملفاتي (الأنشطة المرفوعة)</h3>
                {submissions.length > 0 ? (
                    <ul className="space-y-2">
                        {submissions.map((sub: any) => (
                            <li key={sub._id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                <div>
                                    <span className="font-semibold block">{sub.filename}</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(sub.createdAt).toLocaleDateString('ar-EG')}
                                    </span>
                                </div>
                                <a
                                    href={sub.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-500 hover:text-blue-700 text-sm font-bold"
                                >
                                    عرض الملف
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">لا توجد ملفات مرفوعة حتى الآن.</p>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-green-600 mb-4 border-b pb-2">الدرجات والتقدم</h3>
                <div className="space-y-4">
                    {MODULES.map(module => {
                        const moduleScoresData = scores[module.id] || { preTestScore: null, postTestScore: null, preTestTime: null, postTestTime: null };
                        const totalQuestions = quizQuestionsByModule[module.id]?.length || 0;
                        const renderScore = (score: number | null) => {
                            if (score === null || totalQuestions === 0) return 'لم يتم';
                            return `${Math.round((score / totalQuestions) * 100)}% (${score}/${totalQuestions})`;
                        };

                        return (
                            <React.Fragment key={module.id}>
                                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                                    <div>
                                        <p className="font-semibold">الاختبار القبلي - {module.title}</p>
                                        <p className="text-sm text-gray-500">الزمن المستغرق: {formatTime(moduleScoresData.preTestTime)}</p>
                                    </div>
                                    <p className="font-bold text-lg text-red-500">
                                        {renderScore(moduleScoresData.preTestScore)}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                                    <div>
                                        <p className="font-semibold">الاختبار البعدي - {module.title}</p>
                                        <p className="text-sm text-gray-500">الزمن المستغرق: {formatTime(moduleScoresData.postTestTime)}</p>
                                    </div>
                                    <p className="font-bold text-lg text-red-500">
                                        {renderScore(moduleScoresData.postTestScore)}
                                    </p>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                        <div>
                            <p className="font-semibold">الاختبار التحصيلي</p>
                            <p className="text-sm text-gray-500">الزمن: 30 دقيقة</p>
                        </div>
                        <p className="font-bold text-lg text-red-500">(قيد التقدم)</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">المجموعة التشاركية</h3>
                {studentGroup ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="font-semibold text-gray-700">اسم المجموعة:</p>
                            <p className="font-bold text-lg text-gray-800 bg-blue-100 px-3 py-1 rounded-full">{studentGroup.name}</p>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="font-semibold text-gray-700">مستوى المجموعة:</p>
                            <p className="font-bold text-lg text-gray-800">
                                {studentGroup.level === 'beginner' ? 'أساسي' :
                                    studentGroup.level === 'intermediate' ? 'متوسط' :
                                        studentGroup.level === 'advanced' ? 'متقدم' : studentGroup.level}
                            </p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 mb-2">الزملاء في المجموعة:</p>
                            {studentGroup.members.filter(m => m.id !== student.id).length > 0 ? (
                                <ul className="space-y-2">
                                    {studentGroup.members.filter(m => m.id !== student.id).map(member => (
                                        <li key={member.id} className="text-gray-700 flex items-center bg-gray-100 p-2 rounded-lg">
                                            <img src={member.avatar || avatarFallback} alt={member.name} className="w-8 h-8 rounded-full ml-3 object-cover" />
                                            <span>{member.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">أنت العضو الوحيد في هذه المجموعة حاليًا.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">لم ينضم الطالب إلى مجموعة بعد.</p>
                )}
            </div>
        </>
    );
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, allModuleScores, quizQuestionsByModule, isAdmin, allStudents, groups, myGroup, onUpdateAvatar }) => {
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [studentScores, setStudentScores] = useState<{ [key: number]: any } | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>(allStudents || []);
    const [studentFilter, setStudentFilter] = useState<'all' | 'inGroup' | 'noGroup'>('all');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [selectedStudentSubmissions, setSelectedStudentSubmissions] = useState<any[]>([]);

    const avatarFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23737474' font-size='20'>No+Image</text></svg>";

    // Set up real-time listener for continuous, live data sync from Firestore
    useEffect(() => {
        if (isAdmin) {
            let unsub = () => { };
            let mounted = true;

            // Seed users from backend endpoint as a fallback (in case Firestore listener fails or collection ordering fails)
            (async () => {
                try {
                    setUsers(allStudents || []);
                    setLoadingUsers(true);
                    const fetched = await apiService.getUsers();
                    if (!mounted) return;
                    if (Array.isArray(fetched) && fetched.length > 0) {
                        setUsers(fetched);
                    }
                } catch (err) {
                    console.warn('getUsers fallback failed', err);
                    setUsers(allStudents || []);
                    setUsersError('Failed to fetch users from backend. Check admin auth.');
                } finally {
                    setLoadingUsers(false);
                }
            })();

            // Watch students collection in real-time for instant updates
            unsub = apiService.watchStudents((students) => {
                if (!students || students.length === 0) {
                    // helpful console log for debugging when the listener returns empty
                    console.warn('watchStudents returned empty list — falling back to backend/props if available');
                } else {
                    setUsers(students);
                }
            });

            // Cleanup listener on unmount or when admin status changes
            return () => { mounted = false; try { unsub(); } catch (e) { } };
        }
    }, [isAdmin]);

    // Fetch submissions for current user (student view)
    useEffect(() => {
        if (!isAdmin) {
            let mounted = true;
            (async () => {
                try {
                    const subs = await apiService.getMySubmissions();
                    if (mounted) setSubmissions(subs);
                } catch (err) {
                    console.error('Failed to fetch submissions', err);
                    if (mounted) setSubmissions([]);
                }

                // Fetch persistent exam results
                try {
                    const results = await apiService.getMyExamResults();
                    // Merge into local scores ONLY IF backend has them
                    // This logic might need refinement if we want to purely rely on this endpoint
                    if (results && results.length > 0) {
                        const newScores: any = {};
                        results.forEach((r: any) => {
                            // r.examId is string, but module IDs are numbers? 
                            // Check backend stored type. We sent String(currentModuleId).
                            const modId = Number(r.examId);
                            if (!newScores[modId]) newScores[modId] = {};

                            if (r.examType === 'pre') {
                                newScores[modId].preTestScore = r.score;
                            } else if (r.examType === 'post') {
                                newScores[modId].postTestScore = r.score;
                            }
                        });
                        // Update local state if we are viewing self (implied by !isAdmin check context usually)
                        // But wait, 'scores' prop is passed from App.tsx usually. 
                        // ProfilePage uses prop `scores` in StudentProfileView.
                        // We need to update the parent state or local state that overrides it.
                        // Here we don't have a setter for `scores` prop.
                        // But `StudentProfileView` uses `scores` prop. 
                        // If we want to support refresh persistence we need to update `studentScores` or `allModuleScores` in App.tsx?
                        // Actually, App.tsx loads appData on login.
                    }
                } catch (err) {
                    console.error("Failed to fetch exam results:", err);
                }

            })();
            return () => { mounted = false; };
        }
    }, [isAdmin]);

    // local UI state for loading/errors (moved above)

    const handleViewStudent = (student: User) => {
        // If admin, fetch latest profile + appdata (moduleScores) from backend
        (async () => {
            setProfileError(null);
            setLoadingProfile(true);
            try {
                const resp = await apiService.getUserProfile(student.email);
                // resp: { user, appData }
                if (resp && resp.user) {
                    setSelectedStudent(resp.user);
                } else {
                    // fallback to passed student
                    setSelectedStudent(student);
                }

                if (resp && resp.appData && resp.appData.moduleScores) {
                    setStudentScores(resp.appData.moduleScores || {});
                } else {
                    setStudentScores(null);
                }

                // Fetch student's submissions (admin can view any user's files)
                try {
                    const subs = await apiService.getUserSubmissions(student.firebaseUid || student.id);
                    setSelectedStudentSubmissions(subs);
                } catch (err) {
                    console.error('Failed to fetch student submissions', err);
                    setSelectedStudentSubmissions([]);
                }
            } catch (err: any) {
                console.warn('Failed to fetch profile for', student.email, err);
                setProfileError('فشل جلب بيانات الملف الشخصي. تأكد من صلاحيات المسؤول.');
                // still show the basic student object
                setSelectedStudent(student);
                setStudentScores(null);
                setSelectedStudentSubmissions([]);
            } finally {
                setLoadingProfile(false);
            }
        })();
    };

    const handleBackToList = () => {
        setSelectedStudent(null);
    };

    if (isAdmin) {
        if (selectedStudent) {
            return (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl md:text-3xl font-bold text-red-600">الصفحة الشخصية للطالب: {selectedStudent.name}</h1>
                        <button onClick={handleBackToList} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                            العودة
                        </button>
                    </div>
                    <StudentProfileView
                        student={selectedStudent}
                        scores={studentScores || allModuleScores[selectedStudent.email] || {}}
                        quizQuestionsByModule={quizQuestionsByModule}
                        groups={groups}
                        myGroup={groups.find(g => g.id === selectedStudent.groupId) || null}
                        submissions={selectedStudentSubmissions}
                        isOwner={false}
                    />
                </div>
            );
        }

        const studentsToList = users.filter(s => s.email !== ADMIN_USER_EMAIL);
        const studentsInGroups = studentsToList.filter(s => s.groupId);
        const studentsWithoutGroups = studentsToList.filter(s => !s.groupId);
        const displayedStudents = studentFilter === 'all' ? studentsToList : (studentFilter === 'inGroup' ? studentsInGroups : studentsWithoutGroups);

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-red-600">قائمة الطلاب المسجلين</h1>
                    <div className="flex items-center">
                        <div className="hidden sm:flex items-center space-x-2 ml-4">
                            <button onClick={() => setStudentFilter('all')} className={`py-1 px-3 rounded-lg text-sm ${"all" === undefined ? '' : ''} bg-gray-200 hover:bg-gray-300`}>الكل</button>
                            <button onClick={() => setStudentFilter('inGroup')} className={`py-1 px-3 rounded-lg text-sm bg-gray-200 hover:bg-gray-300`}>المنضمين لمجموعة</button>
                            <button onClick={() => setStudentFilter('noGroup')} className={`py-1 px-3 rounded-lg text-sm bg-gray-200 hover:bg-gray-300`}>غير المنضمين</button>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-green-600 mb-4 border-b pb-2">اسماء الطلاب</h3>
                    {studentsToList.length > 0 ? (
                        <>
                            {/* Mobile View: Cards */}
                            <div className="md:hidden space-y-4">
                                {displayedStudents.map(student => {
                                    const studentGroup = groups.find(g => g.id === student.groupId);
                                    const groupMates = studentGroup ? studentGroup.members.filter(m => m.id !== student.id).map(m => m.name).join(', ') : 'لا يوجد';
                                    return (
                                        <div key={student.id} className="bg-gray-50 p-4 rounded-lg shadow">
                                            <div className="flex items-center mb-3">
                                                <img src={"data:image/jpeg;base64,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RQAUUUUAFFFFABRRRQAUUUUAFFFFABXR+DvGeoeDNTFxZt5lvJjz7dm+WQf0I7H+YrnKKAPrDwx4r0zxbpou9NmDEDEkLcPEfQj+vQ1t18haTrF9oOoJe6Zcvb3CdGQ9R6Edx7GvavCPxrsNQVLbxEq2Vz0+0ICYX+vdT+Y9xQB6nRUVvcw3kCTW00c0TjKyRsGU/QipaACiiigAooooAKKK4nxX8VdC8NK8MMy6hfDpDA2VU/7TdB9Bk+1AHW31/babZyXV7NHBbxDLyOcAV4D8RfifP4pd9O0svBpKnnPDXGO59F/2fxPoOd8V+NtX8X3XmahNtgU5ito+I4/w7n3PNc7QAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAGz4Qvf7P8YaRc5wI7uMsfYsAf0Jr6yr43ikaKVJF+8jBh9RX1J/wmVr6igD5m1i9OoapNck5L7f0UD+lUaKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKANTR/Eer+H5fM0rUJ7Uk5Ko3yt9VPB/Gu90v47a1bALqVjaXqjqyZiY/lkfpXl1FAHu9r8fNHkA+1aXfQn/YKOP1Iq+Pjj4WIzs1Ee3kL/wDFV880UAe+3Px48Pxj/R7HUZj7qij/ANCrntS+Pt5ICul6PDD6PPIZD+Qx/OvI6KAOj13x/wCIvEQZL/U5fJbrDF+7T8h1/HNc5RRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV03/CUz+p/OuZooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAnvLdrW6eFxhlxkfhn+tQV1HxH07+y/HN/bA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uYflkH1P8X45rx/xN8GNc0ffNpeNTthziMYlA917/hn6V9C0UAfHE8MtvM0U8bxyKcMjggj6g1HX1prnhXRvEkJTVbCG4OMCQrh1+jDkV5nr/wABkctL4f1Ep3EF2Mj8HH9QfrQB4vRXR634B8R+H9xvtLn8pes0Q8xPzHT8cVzlABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUoUsQACSewoASiup0P4b+Jte2tbaZJDCf8Altc/ul/Xk/gDXpOgfAiwttsuvXr3bjrDb/In4t94/higDxWxsLvUrlbextpbmZukcSFifwFem+GPgdqF7sn8QXAsoTz5ERDyn6n7q/r9K9n0rQ9O0O2FvpdlDax9xEuM/U9T+NX6AMbQPCmkeGbbydJs0hyMNJjLv9WPJ+nStmiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACilooASilooASilooASilooASilooASilooASilooASilooASilooASilooASsLV/BPh7Xdx1HSbWR26yKux/wDvpcGt6igDyvVfgRo1zubTL+6s2PRXAlUfyP61yWo/AvxDbZNlc2V4vYBzG35EY/WvoGigD5Yvvh14q0/d5+h3bBepiXzB/wCO5rBuLG6tCRc200JB6SRlf519i1T1T/kHy/SgD4/or0Lxz/rX+tefN980AJRRRQAUUUDrQAVNb2dxdPttreWZvSNC38q6/wAGf8fK/WvoXQv+Qan0oA+abH4e+KdRx9n0O8APQyp5Y/8AHsV0+nfAvxDckG9ubKzTuC5kYfgOP1r6BooA8t0r4E6JbYbU727vWH8KYiQ/lk/rXc6R4R0LQsHTNLtYHHSQJuf/AL6PNbNFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFAH/9k="} alt={student.name} className="w-10 h-10 rounded-full ml-3 object-cover" />
                                                <span className="font-bold text-gray-800">{student.name}</span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-600 border-t pt-3 mt-3">
                                                <p><span className="font-semibold text-gray-700">المجموعة:</span> {studentGroup ? studentGroup.name : 'لم ينضم بعد'}</p>
                                                <p><span className="font-semibold text-gray-700">الزملاء:</span> {groupMates}</p>
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <button onClick={() => handleViewStudent(student)} className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-lg transition">
                                                    عرض التفاصيل
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="min-w-full bg-white">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="text-right py-3 px-4 font-semibold text-sm">اسم الطالب</th>
                                            <th className="text-right py-3 px-4 font-semibold text-sm">المجموعة</th>
                                            <th className="text-right py-3 px-4 font-semibold text-sm">الزملاء في المجموعة</th>
                                            <th className="text-center py-3 px-4 font-semibold text-sm">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedStudents.map(student => {
                                            const studentGroup = groups.find(g => g.id === student.groupId);
                                            const groupMates = studentGroup ? studentGroup.members.filter(m => m.id !== student.id).map(m => m.name).join(', ') : 'لا يوجد';
                                            return (
                                                <tr key={student.id} className="border-b hover:bg-gray-50">
                                                    <td className="py-3 px-4 flex items-center">
                                                        <img src={"data:image/jpeg;base64,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RQAUUUUAFFFFABRRRQAUUUUAFFFFABXR+DvGeoeDNTFxZt5lvJjz7dm+WQf0I7H+YrnKKAPrDwx4r0zxbpou9NmDEDEkLcPEfQj+vQ1t18haTrF9oOoJe6Zcvb3CdGQ9R6Edx7GvavCPxrsNQVLbxEq2Vz0+0ICYX+vdT+Y9xQB6nRUVvcw3kCTW00c0TjKyRsGU/QipaACiiigAooooAKKK4nxX8VdC8NK8MMy6hfDpDA2VU/7TdB9Bk+1AHW31/babZyXV7NHBbxDLyOcAV4D8RfifP4pd9O0svBpKnnPDXGO59F/2fxPoOd8V+NtX8X3XmahNtgU5ito+I4/w7n3PNc7QAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAGz4Qvf7P8YaRc5wI7uMsfYsAf0Jr6yr43ikaKVJF+8jBh9RX1J/wmVr6igD5m1i9OoapNck5L7f0UD+lUaKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKANTR/Eer+H5fM0rUJ7Uk5Ko3yt9VPB/Gu90v47a1bALqVjaXqjqyZiY/lkfpXl1FAHu9r8fNHkA+1aXfQn/YKOP1Iq+Pjj4WIzs1Ee3kL/wDFV880UAe+3Px48Pxj/R7HUZj7qij/ANCrntS+Pt5ICul6PDD6PPIZD+Qx/OvI6KAOj13x/wCIvEQZL/U5fJbrDF+7T8h1/HNc5RRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV03/CUz+p/OuZooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAnvLdrW6eFxhlxkfhn+tQV1HxH07+y/HN/bA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uYflkH1P8X45rx/xN8GNc0ffNpeNTthziMYlA917/hn6V9C0UAfHE8MtvM0U8bxyKcMjggj6g1HX1prnhXRvEkJTVbCG4OMCQrh1+jDkV5nr/wABkctL4f1Ep3EF2Mj8HH9QfrQB4vRXR634B8R+H9xvtLn8pes0Q8xPzHT8cVzlABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUoUsQACSewoASiup0P4b+Jte2tbaZJDCf8Altc/ul/Xk/gDXpOgfAiwttsuvXr3bjrDb/In4t94/higDxWxsLvUrlbextpbmZukcSFifwFem+GPgdqF7sn8QXAsoTz5ERDyn6n7q/r9K9n0rQ9O0O2FvpdlDax9xEuM/U9T+NX6AMbQPCmkeGbbydJs0hyMNJjLv9WPJ+nStmiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACilooASilooASilooASilooASilooASilooASilooASilooASilooASilooASsLV/BPh7Xdx1HSbWR26yKux/wDvpcGt6igDyvVfgRo1zubTL+6s2PRXAlUfyP61yWo/AvxDbZNlc2V4vYBzG35EY/WvoGigD5Yvvh14q0/d5+h3bBepiXzB/wCO5rBuLG6tCRc200JB6SRlf519i1T1T/kHy/SgD4/or0Lxz/rX+tefN980AJRRRQAUUUDrQAVNb2dxdPttreWZvSNC38q6/wAGf8fK/WvoXQv+Qan0oA+abH4e+KdRx9n0O8APQyp5Y/8AHsV0+nfAvxDckG9ubKzTuC5kYfgOP1r6BooA8t0r4E6JbYbU727vWH8KYiQ/lk/rXc6R4R0LQsHTNLtYHHSQJuf/AL6PNbNFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFACUUtFAH/9k="} alt={student.name} className="w-8 h-8 rounded-full ml-3 object-cover" />
                                                        {student.name}
                                                    </td>
                                                    <td className="py-3 px-4">{studentGroup ? studentGroup.name : 'لم ينضم لمجموعة'}</td>
                                                    <td className="py-3 px-4">{groupMates}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <button onClick={() => handleViewStudent(student)} className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-lg transition">
                                                            عرض التفاصيل
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-500 py-4">لا يوجد طلاب مسجلون بعد.</p>
                    )}
                </div>
            </div>
        );
    }

    // Removed local myGroup fetching, using prop myGroup instead

    // Default view for regular student (Viewing their own profile)
    return (
        <div>
            <h1 className="text-3xl font-bold text-red-600 mb-6">الصفحة الشخصية للطالب</h1>
            <StudentProfileView
                student={user}
                scores={allModuleScores[user.email] || {}}
                quizQuestionsByModule={quizQuestionsByModule}
                groups={groups}
                myGroup={myGroup} // Pass the fetched group
                submissions={submissions}
                isOwner={true}
                onUpdateAvatar={onUpdateAvatar}
            />
        </div>
    );
};

export default ProfilePage;