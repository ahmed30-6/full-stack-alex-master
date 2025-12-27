import React, { useState } from "react";
import type { User } from "../types";
import { MOCK_USER, ADMIN_USER } from "../constants";
import UniversityLogo from "./UniversityLogo";
import { loginUser } from "../src/authservice";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../src/firebase";
import { apiService } from "../src/services/apiService";
import { syncLoginTime } from "../src/services/syncService";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (email === ADMIN_USER.email && password === "collearningadmin#2025") {
      try {
        const token = await loginUser(email, password);

        // 🔥 CRITICAL: Persist admin user to MongoDB BEFORE any protected actions
        // This ensures admin user document exists for group creation and other operations
        try {
          await apiService.addUser({
            name: "Admin User", // Will be overwritten by backend if user already exists
            email: email,
            avatar: "",
          });
          console.log("✅ Admin user persisted to MongoDB");
        } catch (persistErr) {
          console.warn("⚠️ Failed to persist admin user (may already exist):", persistErr);
          // Don't block login - backend will handle idempotency
        }

        // TASK 1: Fetch MongoDB userId from backend
        const profileData = await apiService.getUserProfile(email);

        if (!profileData?.user?._id) {
          setError("فشل تحميل بيانات المستخدم من قاعدة البيانات");
          return;
        }

        const adminUser: User = {
          id: profileData.user._id,  // ✅ MongoDB ObjectId from backend
          name: profileData.user.name ?? "مشرف",
          email,
          avatar: profileData.user.avatar ?? "",
        };

        console.log("✅ Admin logged in with MongoDB userId:", adminUser.id);
        onLogin(adminUser);
      } catch (err) {
        setError("فشل تسجيل دخول المشرف");
      }
      return;
    }

    try {
      const token = await loginUser(email, password); // Firebase Auth
      console.log("User Token:", token);

      // 🔥 CRITICAL: Persist user to MongoDB BEFORE any protected actions
      // This ensures user document exists for group operations and other features
      try {
        await apiService.addUser({
          name: name || "مستخدم", // Will be updated from profile if exists
          email: email,
          avatar: "",
        });
        console.log("✅ User persisted to MongoDB");
      } catch (persistErr) {
        console.warn("⚠️ Failed to persist user (may already exist):", persistErr);
        // Don't block login - backend will handle idempotency
      }

      // Sync login time to backend
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          await syncLoginTime({ firebaseUid: firebaseUser.uid }, token);
          console.log("✅ Login time synced to backend");
        }
      } catch (syncErr) {
        console.warn("Failed to sync login time:", syncErr);
      }

      // TASK 1: Fetch user profile from backend to get MongoDB userId and name
      // Backend is the ONLY source of truth
      let mongoUserId = "";
      let savedName = "";
      let savedAvatar = "";

      try {
        const profileData = await apiService.getUserProfile(email);
        console.log("🔍 Full Profile Response:", JSON.stringify(profileData, null, 2));

        // Extract MongoDB _id (CRITICAL for group operations)
        mongoUserId = profileData?.user?._id || profileData?.profile?._id || "";

        // Extract name from backend
        const backendName = profileData?.profile?.name || profileData?.user?.name;
        savedName = backendName || "مستخدم";

        // Extract avatar
        savedAvatar = profileData?.user?.avatar || profileData?.profile?.avatar || "";

        if (mongoUserId) {
          console.log(`✅ Loaded MongoDB userId: ${mongoUserId}`);
          console.log(`✅ Loaded saved name: "${savedName}"`);
        } else {
          console.error("❌ Failed to get MongoDB userId from backend");
          setError("فشل تحميل بيانات المستخدم من قاعدة البيانات");
          return;
        }
      } catch (err) {
        console.error("❌ Failed to load profile from backend:", err);
        setError("فشل تحميل بيانات المستخدم");
        return;
      }

      // Build user object with MongoDB _id (NOT Date.now()!)
      const loggedInUser: User = {
        id: mongoUserId,  // ✅ MongoDB ObjectId from backend
        name: savedName,
        email,
        avatar: savedAvatar || `https://picsum.photos/seed/${Date.now()}/100/100`,
      };

      console.log("✅ Student logged in with MongoDB userId:", loggedInUser.id);
      onLogin(loggedInUser);
    } catch (err) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      console.error(err);
    }
  };
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("يرجى ملء جميع الحقول");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      // Persist user to backend MongoDB with name as source-of-truth
      try {
        await apiService.addUser({
          name: name,
          email: email,
          avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
        });
        console.log("✅ New user persisted to MongoDB");
      } catch (err) {
        console.error("Failed to persist user to server during signup", err);
        setError("فشل حفظ بيانات المستخدم");
        return;
      }

      // TASK 1: Fetch MongoDB userId from backend after signup
      try {
        const profileResp = await apiService.getUserProfile(email);

        if (!profileResp?.user?._id) {
          console.error("❌ Failed to get MongoDB userId after signup");
          setError("فشل تحميل بيانات المستخدم");
          return;
        }

        const newUser: User = {
          id: profileResp.user._id,  // ✅ MongoDB ObjectId from backend
          name: profileResp.user.name || name,
          email,
          avatar: profileResp.user.avatar || `https://picsum.photos/seed/${Date.now()}/100/100`,
        };

        console.log("✅ New user created with MongoDB userId:", newUser.id);
        onLogin(newUser);
      } catch (err) {
        console.error("Failed to load profile after signup", err);
        setError("فشل تحميل بيانات المستخدم");
      }
    } catch (err) {
      setError("حدث خطأ أثناء إنشاء الحساب");
      console.error(err);
    }
  };

  const toggleView = () => {
    resetForm();
    setIsLoginView(!isLoginView);
  };

  const backgroundStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(15 23 42 / 0.04)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
    backgroundColor: "#f8fafc",
  };

  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col items-center justify-center bg-cover bg-center p-4"
      style={backgroundStyle}
    >
      <div className="relative z-10 w-full max-w-md mx-auto p-6 md:p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 text-gray-800">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center w-full mb-4">
            <UniversityLogo className="h-20 md:h-24" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-red-500">
            بيئة التعلم التكيفية التشاركية
          </h1>
          <p className="text-base md:text-lg mt-2 text-gray-600">
            مرحبًا بك في بيئة التعلم المستقبلية
          </p>
        </div>

        <div className="p-6 md:p-8 bg-blue-800 rounded-lg text-white">
          {isLoginView ? (
            <>
              <h2 className="text-2xl font-bold text-center mb-6">
                تسجيل الدخول
              </h2>
              {error && (
                <p className="text-red-300 bg-red-800/50 p-3 rounded-md text-center mb-4">
                  {error}
                </p>
              )}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-1 text-blue-100"
                  >
                    البريد الإلكتروني
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="student@example.com"
                    className="w-full px-4 py-2 bg-white text-black border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium mb-1 text-blue-100"
                  >
                    كلمة المرور
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white text-black border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  الدخول
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-center mb-6">
                إنشاء حساب جديد
              </h2>
              {error && (
                <p className="text-red-300 bg-red-800/50 p-3 rounded-md text-center mb-4">
                  {error}
                </p>
              )}
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-1 text-blue-100"
                  >
                    الاسم الكامل
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="الاسم الكامل"
                    className="w-full px-4 py-2 bg-white text-black border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-1 text-blue-100"
                  >
                    البريد الإلكتروني
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="example@example.com"
                    className="w-full px-4 py-2 bg-white text-black border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium mb-1 text-blue-100"
                  >
                    كلمة المرور
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white text-black border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  إنشاء حساب
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={toggleView}
              className="text-sm text-blue-200 hover:text-white hover:underline"
            >
              {isLoginView
                ? "ليس لديك حساب؟ إنشاء حساب جديد"
                : "لديك حساب بالفعل؟ تسجيل الدخول"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
