
import { Page } from './types';

export const PAGES: Page[] = [
  Page.Home,
  Page.Instructions,
  Page.News,
  Page.Content,
  Page.Goals,
  Page.Activity,
  Page.AdminDashboard,
];

export const MOCK_USER = {
  id: 1,
  name: 'أحمد محمود',
  email: 'student@example.com',
  avatar: 'https://picsum.photos/100/100',
};

export const ADMIN_USER_EMAIL = 'admuser.collearning.2025@gmail.com';

export const ADMIN_USER = {
  id: 99,
  name: 'الباحثة',
  email: ADMIN_USER_EMAIL,
  avatar: 'https://picsum.photos/100/101',
}

export const INITIAL_NEWS_ITEMS = [
    { id: 1, title: "موعد تسليم الأنشطة للموديول الأول", content: "يرجى من جميع الطلاب تسليم أنشطة الموديول الأول قبل نهاية الأسبوع. بالتوفيق للجميع في دراستكم." },
    { id: 2, title: "إعلان عن ورشة عمل جديدة", content: "سيتم عقد ورشة عمل حول 'مهارات البحث المتقدم' يوم الثلاثاء القادم. التسجيل مفتوح الآن." },
    { id: 3, title: "تحديثات في بيئة التعلم", content: "تم إضافة ميزات جديدة إلى المنصة لتحسين تجربة التعلم. استكشفوها الآن!" },
];

export const MODULES = [
    { id: 1, title: "الموديول الأول: نشأت المكتبات الافتراضية ثلاثية الأبعاد", level: "أساسي", active: true },
    { id: 2, title: "الموديول الثاني: طبيعة المكتبات الافتراضية ثلاثية الأبعاد", level: "متوسط", active: false },
    { id: 3, title: "الموديول الثالث:  تصميم المكتبة الافتراضية ثلاثية الأبعاد", level: "متقدم", active: false },
    { id: 4, title: "الموديول الرابع: مهارات انتاج المكتبات الافتراضيه ثلاثيه الابعاد", level: "متقدم", active: false },
];
