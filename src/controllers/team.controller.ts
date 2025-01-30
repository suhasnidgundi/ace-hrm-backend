import { Request, Response } from 'express';
import { Team, ITeam } from '../models/Team';
import { Employee } from '../models/Employee';
import { Types } from 'mongoose';

export const teamController = {
    // Create a new team
    createTeam: async (req: Request, res: Response) => {
        try {
            const {
                name,
                description,
                organizationHead,
                parentTeam,
                department,
                level,
                members
            } = req.body;

            // Validate parent team if provided
            if (parentTeam) {
                const parentTeamExists = await Team.findById(parentTeam);
                if (!parentTeamExists) {
                    return res.status(404).json({ error: 'Parent team not found' });
                }
            }

            // Create the team
            const team = await Team.create({
                name,
                description,
                organizationHead,
                parentTeam,
                department,
                level,
                members: members || [],
                createdBy: req.user?.employee._id,
                updatedBy: req.user?.employee._id
            });

            // Update parent team's subTeams array
            if (parentTeam) {
                await Team.findByIdAndUpdate(parentTeam, {
                    $push: { subTeams: team._id }
                });
            }

            // Update employee records with new team
            if (members && members.length > 0) {
                await Employee.updateMany(
                    { _id: { $in: members.map((m: { employeeId: any; }) => m.employeeId) } },
                    { $set: { teamId: team._id } }
                );
            }

            res.status(201).json(team);
        } catch (error) {
            console.error('Create team error:', error);
            res.status(500).json({ error: 'Failed to create team' });
        }
    },

    // Get team hierarchy
    getTeamHierarchy: async (req: Request, res: Response) => {
        try {
            const { teamId } = req.params;

            const team = await Team.findById(teamId)
                .populate({
                    path: 'members.employeeId',
                    select: 'userId jobTitle role',
                    populate: {
                        path: 'userId',
                        select: 'firstName lastName email avatarUrl'
                    }
                })
                .populate({
                    path: 'subTeams',
                    populate: {
                        path: 'members.employeeId',
                        select: 'userId jobTitle role',
                        populate: {
                            path: 'userId',
                            select: 'firstName lastName email avatarUrl'
                        }
                    }
                })
                .lean();

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            res.json(team);
        } catch (error) {
            console.error('Get team hierarchy error:', error);
            res.status(500).json({ error: 'Failed to get team hierarchy' });
        }
    },

    // Get full organizational hierarchy
    getOrganizationHierarchy: async (_req: Request, res: Response) => {
        try {
            // Get top-level teams (no parent)
            const topLevelTeams = await Team.find({ parentTeam: null })
                .populate({
                    path: 'members.employeeId',
                    select: 'userId jobTitle role',
                    populate: {
                        path: 'userId',
                        select: 'firstName lastName email avatarUrl'
                    }
                })
                .populate({
                    path: 'subTeams',
                    populate: {
                        path: 'members.employeeId',
                        select: 'userId jobTitle role',
                        populate: {
                            path: 'userId',
                            select: 'firstName lastName email avatarUrl'
                        }
                    }
                })
                .lean();

            res.json(topLevelTeams);
        } catch (error) {
            console.error('Get organization hierarchy error:', error);
            res.status(500).json({ error: 'Failed to get organization hierarchy' });
        }
    },

    // Update team
    updateTeam: async (req: Request, res: Response) => {
        try {
            const { teamId } = req.params;
            const updateData = {
                ...req.body,
                updatedBy: req.user?.employee._id
            };

            const team = await Team.findByIdAndUpdate(
                teamId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            res.json(team);
        } catch (error) {
            console.error('Update team error:', error);
            res.status(500).json({ error: 'Failed to update team' });
        }
    },

    // Add member to team
    addTeamMember: async (req: Request, res: Response) => {
        try {
            const { teamId } = req.params;
            const { employeeId, role } = req.body;

            const team = await Team.findByIdAndUpdate(
                teamId,
                {
                    $push: {
                        members: {
                            employeeId,
                            role,
                            joinedAt: new Date()
                        }
                    }
                },
                { new: true }
            );

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            // Update employee record
            await Employee.findByIdAndUpdate(employeeId, {
                $set: { teamId: team._id }
            });

            res.json(team);
        } catch (error) {
            console.error('Add team member error:', error);
            res.status(500).json({ error: 'Failed to add team member' });
        }
    },

    // Remove member from team
    removeTeamMember: async (req: Request, res: Response) => {
        try {
            const { teamId, employeeId } = req.params;

            const team = await Team.findByIdAndUpdate(
                teamId,
                {
                    $pull: {
                        members: {
                            employeeId: new Types.ObjectId(employeeId)
                        }
                    }
                },
                { new: true }
            );

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            // Update employee record
            await Employee.findByIdAndUpdate(employeeId, {
                $unset: { teamId: "" }
            });

            res.json(team);
        } catch (error) {
            console.error('Remove team member error:', error);
            res.status(500).json({ error: 'Failed to remove team member' });
        }
    }
};