/**
 * GroupService
 *
 * Service layer for group membership management and validation.
 * Provides methods to query user groups, validate membership, and retrieve group data.
 */

import { Group, IGroup, User } from "../models";
import mongoose from "mongoose";

export class GroupService {
  /**
   * Get all group IDs that a user is a member of
   * @param userId - MongoDB ObjectId of the user
   * @returns Array of group IDs (as strings)
   */
  static async getUserGroups(userId: any): Promise<string[]> {
    const groups = await Group.find({
      members: userId,
    })
      .select("_id")
      .lean();

    return groups.map((group) => group._id.toString());
  }

  /**
   * Validate if a user is a member of a specific group
   * @param userId - MongoDB ObjectId of the user
   * @param groupId - MongoDB ObjectId of the group (as string)
   * @returns true if user is a member, false otherwise
   */
  static async validateGroupMembership(
    userId: any,
    groupId: string
  ): Promise<boolean> {
    const group = await Group.findById(groupId).select("members").lean();

    if (!group) {
      return false;
    }

    // Check if the userId (ObjectId) is in the members array
    return group.members.some((m: any) => m.toString() === userId.toString());
  }

  /**
   * Get all groups that a user is a member of (full group objects)
   * @param userId - MongoDB ObjectId of the member
   * @returns Array of group documents
   */
  static async getGroupsByMember(userId: any): Promise<IGroup[]> {
    const groups = await Group.find({
      members: userId,
    }).lean();

    return groups as IGroup[];
  }

  /**
   * Check if a user is a member of any of the specified groups
   * @param userId - MongoDB ObjectId of the user
   * @param groupIds - Array of group IDs to check
   * @returns true if user is a member of at least one group
   */
  static async isMemberOfAnyGroup(
    userId: any,
    groupIds: string[]
  ): Promise<boolean> {
    if (groupIds.length === 0) {
      return false;
    }

    const count = await Group.countDocuments({
      _id: { $in: groupIds },
      members: userId,
    });

    return count > 0;
  }

  /**
   * Get the intersection of user's groups and a list of group IDs
   * Useful for filtering data to only groups the user has access to
   * @param userId - MongoDB ObjectId of the user
   * @param groupIds - Array of group IDs to filter
   * @returns Array of group IDs that the user is a member of
   */
  static async filterUserGroups(
    userId: any,
    groupIds: string[]
  ): Promise<string[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const groups = await Group.find({
      _id: { $in: groupIds },
      members: userId,
    })
      .select("_id")
      .lean();

    return groups.map((group) => group._id.toString());
  }

  /**
   * Validate that all specified group IDs exist
   * @param groupIds - Array of group IDs to validate
   * @returns true if all groups exist, false otherwise
   */
  static async validateGroupsExist(groupIds: string[]): Promise<boolean> {
    if (groupIds.length === 0) {
      return true;
    }

    const count = await Group.countDocuments({
      _id: { $in: groupIds },
    });

    return count === groupIds.length;
  }

  /**
   * Get group membership count for a user
   * @param userId - MongoDB ObjectId of the user
   * @returns Number of groups the user is a member of
   */
  static async getMembershipCount(userId: any): Promise<number> {
    return await Group.countDocuments({
      members: userId,
    });
  }

  /**
   * Authoritative method to assign a user to a group.
   * Enforces the invariant: One user -> One group (for students).
   * Admins can join multiple groups without restrictions.
   * 
   * @param userId - MongoDB ObjectId of the user
   * @param groupId - MongoDB ObjectId of the group
   * @param session - Optional MongoDB session for atomic transactions
   * @param isAdmin - Optional flag to bypass single-group restriction (for admin users)
   */
  static async assignUserToGroup(
    userId: any,
    groupId: any,
    session?: mongoose.ClientSession,
    isAdmin?: boolean
  ): Promise<void> {
    const user = await User.findById(userId).session(session || null);
    if (!user) {
      throw new Error("User not found");
    }

    // Admin bypass: Admins can join multiple groups
    if (isAdmin || user.role === "admin") {
      // For admins, just add to group members without updating User.groupId
      // This allows admins to be in multiple groups simultaneously
      const group = await Group.findById(groupId).session(session || null);
      if (!group) {
        throw new Error("Group not found");
      }

      // Check if admin is already in this specific group
      const isAlreadyMember = group.members.some(
        (memberId: any) => memberId.toString() === userId.toString()
      );

      if (!isAlreadyMember) {
        await Group.findByIdAndUpdate(
          groupId,
          { $addToSet: { members: userId } },
          { session, new: true }
        );
      }
      return; // Skip student-specific checks
    }

    // Student-only logic: Enforce single-group membership
    // Check if user is already assigned to a group
    if (user.groupId) {
      if (user.groupId.toString() === groupId.toString()) {
        // Idempotent: User is already in this group
        return;
      }
      throw new Error("User is already assigned to a group");
    }

    // Double-check: Ensure user is not in ANY Group.members
    // This handles legacy data where user.groupId might be missing
    const existingGroupCount = await Group.countDocuments({
      members: userId,
    }).session(session || null);

    if (existingGroupCount > 0) {
      throw new Error("User is already a member of a group (invariant violation)");
    }

    // Update User
    user.groupId = groupId;
    await user.save({ session });

    // Update Group
    await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { session, new: true }
    );
  }

  /**
   * Remove a user from a group.
   * Updates both User.groupId and Group.members.
   * 
   * @param userId - MongoDB ObjectId of the user
   * @param groupId - MongoDB ObjectId of the group
   * @param session - Optional MongoDB session
   */
  static async removeUserFromGroup(
    userId: any,
    groupId: any,
    session?: mongoose.ClientSession
  ): Promise<void> {
    // Update User: clear groupId
    await User.findByIdAndUpdate(
      userId,
      { $unset: { groupId: "" } },
      { session }
    );

    // Update Group: remove userId from members
    await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { session }
    );

    // Optional: If group is empty, we could delete it, but let's keep it for now
    // unless the business logic explicitly requires it.
  }
}
