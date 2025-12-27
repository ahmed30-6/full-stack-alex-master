
import React, { useState } from 'react';
import type { User, Group } from '../../types';

interface GroupFormationPageProps {
  onNavigateToModuleContent: () => void;
  user: User;
  groups: Group[];
  onCreateGroup: () => void;
  onJoinGroup: (groupId: string) => void;
  onRemoveUserFromGroup: (groupId: string, userId: string) => void;
  onAddUserToGroup: (groupId: string, userId?: string) => void;
  onEnterGroup: (groupId: string) => void;
  isAdmin: boolean;
  allUsers: User[];
}

const GroupFormationPage: React.FC<GroupFormationPageProps> = ({
  onNavigateToModuleContent,
  user,
  groups,
  onCreateGroup,
  onJoinGroup,
  onRemoveUserFromGroup,
  onAddUserToGroup,
  onEnterGroup,
  isAdmin,
  allUsers,
}) => {
  const [showAddUserModal, setShowAddUserModal] = useState<string | null>(null); // stores groupId to add to
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>("");

  // ✅ SINGLE SOURCE OF TRUTH: user.groupId determines membership
  // Array lookup ONLY for display details (name, members), NOT for permission/membership checks
  const userGroup = user.groupId ? groups.find(group => group.id === user.groupId) : null;
  const canJoinGroup = !user.groupId; // Direct check on groupId, not array inference

  // Filter groups based on role:
  // - Admin: See all groups
  // - Student with group: See only their group
  // - Student without group: See all groups (to join)
  const displayedGroups = isAdmin
    ? groups // Admin sees all groups
    : userGroup
      ? [userGroup] // Student with group sees only their group
      : groups; // Student without group sees all groups to join

  const handleAddUserSubmit = () => {
    if (showAddUserModal && selectedUserIdToAdd) {
      onAddUserToGroup(showAddUserModal, selectedUserIdToAdd);
      setShowAddUserModal(null);
      setSelectedUserIdToAdd("");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">تكوين المجموعات التشاركية</h1>
      <div className="bg-white p-8 rounded-xl shadow-lg relative">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-blue-700">قائمة المجموعات</h2>
          {isAdmin && (
            <button
              onClick={onCreateGroup}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              انشاء مجموعة جديدة
            </button>
          )}
        </div>

        {userGroup && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md mb-6">
            أنت حاليًا في <span className="font-bold">{userGroup.name}</span>. يمكنك الآن الانتقال إلى محتوى الموديول.
          </div>
        )}

        <div className="space-y-4">
          {displayedGroups.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد مجموعات حاليًا. {isAdmin ? 'قم بإنشاء مجموعة جديدة.' : 'انتظر حتى تقوم الباحثة بإنشاء المجموعات.'}</p>
          ) : (
            displayedGroups.map(group => (
              <div key={group.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{group.name}</h3>
                    <p className="text-sm text-gray-600">{group.members.length} / 4 أعضاء</p>
                  </div>
                  <div className="flex gap-2">
                    {(() => {
                      if (isAdmin) {
                        return (
                          <>
                            <button
                              onClick={() => onEnterGroup(group.id)}
                              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition"
                            >
                              دخول الجروب
                            </button>
                            {group.members.length < 4 ? (
                              <button onClick={() => setShowAddUserModal(group.id)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition">إضافة عضو</button>
                            ) : (
                              <button disabled className="bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed">ممتلئة</button>
                            )}
                          </>
                        );
                      }

                      if (userGroup?.id === group.id) {
                        return <span className="text-green-600 font-semibold px-4">أنت هنا</span>;
                      }
                      if (canJoinGroup && group.members.length < 4) {
                        return <button onClick={() => onJoinGroup(group.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition">انضمام</button>;
                      }
                      return <button disabled className="bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed">{group.members.length >= 4 ? 'ممتلئة' : 'لا يمكن الانضمام'}</button>;
                    })()}
                  </div>
                </div>
                <div className="mt-4 border-t pt-2">
                  <h4 className="text-sm font-semibold mb-2">الأعضاء:</h4>
                  {group.members.length > 0 ? (
                    <ul className="space-y-2">
                      {group.members.map(member => (
                        <li key={member.id} className="flex items-center justify-between bg-gray-200 rounded-lg px-3 py-1 text-sm">
                          <div className="flex items-center">
                            <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full ml-2" />
                            {member.name}
                            {member.id === user.id && <span className="text-xs text-blue-600 mr-2">(أنت)</span>}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => onRemoveUserFromGroup(group.id, member.id)}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded"
                              title={`إزالة ${member.name}`}
                            >
                              إزالة
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm italic">لا يوجد أعضاء في هذه المجموعة بعد.</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onNavigateToModuleContent}
            disabled={!userGroup}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            الانتقال إلى محتوى الموديول
          </button>
        </div>

        {/* Admin Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-800">إضافة عضو إلى المجموعة</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">اختر المستخدم:</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={selectedUserIdToAdd}
                  onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                >
                  <option value="">-- اختر مستخدم --</option>
                  {allUsers.map(u => {
                    // Check if user is already in a group
                    const isInGroup = !!u.groupId;
                    return (
                      <option key={u.id} value={u.id} disabled={isInGroup}>
                        {u.name} ({u.email}) {isInGroup ? '- في مجموعة' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddUserModal(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddUserSubmit}
                  disabled={!selectedUserIdToAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupFormationPage;
