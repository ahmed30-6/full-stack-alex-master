
import React, { useRef } from 'react';
import { activitiesByModule } from '../../activities';

interface ActivityPageProps {
  onStartFinalQuiz: () => void;
  onStartActivity: (activityId: number) => void;
  currentModuleId: number | null;
  isPostTestCompleted?: boolean;
  onNavigateToModuleContent?: () => void;
  isAdmin: boolean;
  onSubmitActivity: (activityId: number, file: File) => void;
}

const ActivityPage: React.FC<ActivityPageProps> = ({ 
  onStartFinalQuiz, 
  onStartActivity, 
  currentModuleId,
  isPostTestCompleted,
  onNavigateToModuleContent,
  isAdmin,
  onSubmitActivity
}) => {
  const moduleActivities = (currentModuleId && activitiesByModule[currentModuleId]?.length > 0)
    ? activitiesByModule[currentModuleId]
    : null;

  // Helper to render activity actions
  const renderActivityActions = (activityId: number) => {
    // Use a unique ref for each file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onSubmitActivity(activityId, e.target.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="mt-6 flex justify-start gap-4">
            <button onClick={() => onStartActivity(activityId)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition">
                ابدا النشاط {activityId}
            </button>
            
            {!isAdmin && (
                <>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button onClick={triggerFileInput} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition">
                        تحميل
                    </button>
                </>
            )}
        </div>
    );
  };

  // Helper Component wrapper to allow hooks usage inside map
  const ActivityItem = ({ activityId, children }: { activityId: number, children?: React.ReactNode }) => {
     return (
         <div>
            {children}
            {renderActivityActions(activityId)}
         </div>
     )
  }


  const renderDefaultActivities = () => (
    <>
      {/* Activity 1 */}
      <div className="border-b-2 border-gray-100 pb-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">نشاط 1: (التفرقة بين أنواع المكتبات)</h2>
        <div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">الهدف:</h3>
          <p className="text-gray-700 mb-4">تفرق بين أنواع المكتبات.</p>
          <h3 className="text-xl font-semibold text-red-600 mb-2">التنفيذ:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>التعرف على أنواع المكتبات (تقليدية، رقمية، إلكترونية، افتراضية).</li>
            <li>مهمة كل طالب هي تعريف المكتبة.</li>
            <li>
              يعد كل طالب قائمة أسئلة مثل:
              <ul className="list-disc list-inside mt-2 space-y-1 pr-6">
                <li>"ما هي أهم ميزة لمكتبتكم؟"</li>
                <li>"من هو الجمهور الرئيسي الذي تخدمونه؟"</li>
                <li>"ما أبرز الخدمات التي تقدمونها؟"</li>
                <li>"ما الذي يجعل مكتبتكم تختلف عن غيرها؟"</li>
              </ul>
            </li>
          </ol>
        </div>
        <ActivityItem activityId={1}><span></span></ActivityItem>
      </div>

      {/* Activity 2 */}
      <div className="border-b-2 border-gray-100 pb-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">نشاط 2: لتحديد أسباب ظهور المكتبات الافتراضية ثلاثية الأبعاد</h2>
          <div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">الهدف:</h3>
          <p className="text-gray-700 mb-4">تحدد سبب ظهور المكتبات الافتراضية ثلاثية الأبعاد.</p>
          <h3 className="text-xl font-semibold text-red-600 mb-2">التنفيذ:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              يقدم الطلاب "قائمة" تمثل مشكلات في المكتبات (التقليدية، الرقمية، الإلكترونية) مثل:
              <ul className="list-disc list-inside mt-2 space-y-1 pr-6">
                <li>(المكتبة التقليدية) تعاني من محدودية في الاستيعاب (المكان والوقت).</li>
                <li>(المكتبة التقليدية) لا تصل إلى فئات معينة من المستفيدين (ذوي الاحتياجات الخاصة، سكان المناطق النائية).</li>
                <li>(المكتبة الرقمية) يشعر فيها المستخدم إنها روتينية وتفتقر للإبداع.</li>
                <li>(المكتبة الإلكترونية والافتراضية ثنائية الأبعاد) تعاني من صعوبة في عرض مصادر المعلومات غير التقليدية (النماذج ثلاثية الأبعاد، المعارض التفاعلية).</li>
              </ul>
            </li>
            <li>يقوم الطلاب بمناقشة كل المشكلات وتقديم الحل المناسب.</li>
            <li>يتوصلون جماعيًا إلى أن الحل هو ظهور المكتبات الافتراضية ثلاثية الأبعاد.</li>
          </ol>
        </div>
        <ActivityItem activityId={2}><span></span></ActivityItem>
      </div>

      {/* Activity 3 */}
      <div className="border-b-2 border-gray-100 pb-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">النشاط 3: نشاط خاص بتعريف وتسمية المكتبات الافتراضية ثلاثية الأبعاد</h2>
          <div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">الهدف:</h3>
              <p className="text-gray-700 mb-4">تعرف المكتبات الاftراضية ثلاثية الأبعاد وتتعرف على مسمياتها.</p>
              <h3 className="text-xl font-semibold text-red-600 mb-2">التنفيذ:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>يقوم الطلاب بعمل خريطة ذهنية مركزها المكتبات الافتراضية ثلاثية الأبعاد.</li>
                  <li>يتم استخراج التعريف من المحتوى وكتابته داخل دائرة متصلة بالمركز.</li>
                  <li>ثم، اطلب منهم الخروج بجميع المسميات البديلة (مكتبات العالم الافتراضي، مكتبات بلا جدران، المكتبات الهجينة) ووضع كل مسمى في فقاعة متصلة.</li>
              </ol>
              <h3 className="text-xl font-semibold text-red-600 mt-4 mb-2">النتيجة:</h3>
              <p className="text-gray-700">خريطة ذهنية تشاركية توضح التعريف والمسميات المختلفة بشكل واضح ومترابط.</p>
          </div>
          <ActivityItem activityId={3}><span></span></ActivityItem>
      </div>

      {/* Activity 4 */}
      <div className="border-b-2 border-gray-100 pb-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">النشاط 4: لتحديد خدمات المكتبات الافتراضية ثلاثية الأبعاد</h2>
          <div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">الهدف:</h3>
              <p className="text-gray-700 mb-4">تحدد خدمات المكتبات الافتراضية ثلاثية الأبعاد.</p>
              <h3 className="text-xl font-semibold text-red-600 mb-2">التنفيذ:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>يقوم الطلاب بتحديد مجموعه من الخدمات بعضها خاص بالمكتبات الافتراضية ثلاثية الأبعاد وبعضها تقليدي.
                      <p className="mt-2 pr-6">مثال على المكتبات التقليدية: "إعارة كتاب ورقي"، "جولة افتراضية بزاوية 360"، "تصفح قاعدة بيانات"، "التفاعل مع كتاب نادر عبر تقنية الـ 3D"، "الاستماع إلى محاضرة"، "تنزيل كتاب إلكتروني"، "بناء هوية افتراضية للمستخدم."</p>
                  </li>
                  <li>مهمة كل طالب هي اختيار الخدمات التي تمثل خدمات تقدمها المكتبات الافتراضية ثلاثية الأبعاد.</li>
              </ol>
          </div>
          <ActivityItem activityId={4}><span></span></ActivityItem>
      </div>
      
      {/* Activity 5 */}
      <div>
          <h2 className="text-2xl font-bold text-blue-700 mb-4">النشاط 5: "لعبة التصنيف السريع" (للتفرقة بين أنواع المكتبات الافتراضية)</h2>
          <div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">الهدف:</h3>
              <p className="text-gray-700 mb-4">تتعرف على أنواع المكتبات الافتراضية.</p>
              <h3 className="text-xl font-semibold text-red-600 mb-2">التنفيذ:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>يذكر الطلاب أسماء أنواع المكتبات الافتراضية (ثنائية الأبعاد، الثلاثية الأبعاد).</li>
                  <li>يتم مراجعه خصائص كل نوع عن طريق العصف الذهني.</li>
                  <li>كل طالب يقوم بتوصيل كل نوع من المكتبات مع الخصائص التي تناسبه في أسرع وقت ممكن.</li>
              </ol>
          </div>
          <ActivityItem activityId={5}><span></span></ActivityItem>
      </div>
    </>
  );

  const renderModuleActivities = () => (
    <>
      {moduleActivities && moduleActivities.map((activity, index) => (
        <div key={activity.id} className={index < moduleActivities.length - 1 ? "border-b-2 border-gray-100 pb-8" : ""}>
          <h2 className="text-2xl font-bold text-blue-700 mb-4">{activity.title}</h2>
          <div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">الهدف:</h3>
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{activity.objective}</p>
            <h3 className="text-xl font-semibold text-red-600 mb-2">التنفيذ:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              {activity.implementation.map((step: string, stepIndex: number) => (
                  <li key={stepIndex} className="whitespace-pre-wrap">{step}</li>
              ))}
            </ol>
          </div>
          <ActivityItem activityId={activity.id}><span></span></ActivityItem>
        </div>
      ))}
    </>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">الأنشطة التعليمية</h1>
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-12">
        {moduleActivities ? renderModuleActivities() : renderDefaultActivities()}
      </div>
       <div className="mt-12 flex justify-center">
          {isPostTestCompleted && !isAdmin ? (
              <button
                onClick={onNavigateToModuleContent}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg transform hover:scale-105"
              >
                العودة إلى المحتوى
              </button>
          ) : (
              <button
                onClick={onStartFinalQuiz}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg transform hover:scale-105"
              >
                ابدأ الاختبار البعدي
              </button>
          )}
        </div>
    </div>
  );
};

export default ActivityPage;