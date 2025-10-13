
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Complaint } from '../types';
import ComplaintCard from '../components/ComplaintCard';
import { ComplaintStatus, ComplaintPriority } from '../types';
import { useNotification } from '../context/NotificationContext';
import Spinner from '../components/Spinner';
import { fetchGeneratedSolution } from '../services/api';


const priorityOrderMap: Record<ComplaintPriority, number> = {
    [ComplaintPriority.Urgent]: 1,
    [ComplaintPriority.High]: 2,
    [ComplaintPriority.Medium]: 3,
    [ComplaintPriority.Low]: 4,
};

const statusOrderMap: Record<ComplaintStatus, number> = {
    [ComplaintStatus.Reopened]: 1,
    [ComplaintStatus.Open]: 2,
    [ComplaintStatus.Closed]: 3,
};


const DepartmentComplaints: React.FC = () => {
    const { user } = useAuth();
    const { getComplaintsByDepartment, updateComplaint, refreshData } = useData();
    const { addNotification } = useNotification();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [filter, setFilter] = useState<ComplaintStatus | 'All'>('All');
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);

    const fetchComplaints = useCallback(() => {
        if (user && user.departmentName) {
            const deptComplaints = getComplaintsByDepartment(user.departmentName);
            setComplaints(deptComplaints);
        }
    }, [user, getComplaintsByDepartment]);
    
    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

     const handleBatchGenerateSolutions = async () => {
        const ticketsToProcess = complaints.filter(c => 
            (c.status === ComplaintStatus.Open || c.status === ComplaintStatus.Reopened) && !c.solutionText
        );

        if (ticketsToProcess.length === 0) {
            addNotification('No open tickets require an AI solution at this time.', 'info');
            return;
        }

        setIsBatchGenerating(true);
        addNotification(`Starting AI solution generation for ${ticketsToProcess.length} tickets...`, 'info');

        let successCount = 0;
        try {
            for (const complaint of ticketsToProcess) {
                const { solutionText } = await fetchGeneratedSolution(complaint);
                await updateComplaint(complaint.id, { solutionText });
                successCount++;
            }
            addNotification(`Successfully generated ${successCount} solutions!`, 'success');
        } catch (error) {
            console.error('Batch AI generation failed:', error);
            addNotification('An error occurred during batch generation. Some solutions may not have been created.', 'error');
        } finally {
            refreshData(); // Refresh all data from server
            setIsBatchGenerating(false);
        }
    };
    
    const processedComplaints = useMemo(() => {
        let filteredComplaints = complaints;

        if (filter !== 'All') {
            filteredComplaints = complaints.filter(c => c.status === filter);
        }

        const sorted = [...filteredComplaints];

        switch(sortOrder) {
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'status':
                sorted.sort((a, b) => statusOrderMap[a.status] - statusOrderMap[b.status]);
                break;
            case 'priority':
                sorted.sort((a, b) => priorityOrderMap[a.priority] - priorityOrderMap[b.priority]);
                break;
            case 'date-desc':
            default:
                 sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                 break;
        }

        return sorted;
    }, [complaints, filter, sortOrder]);

    const openTicketsWithoutSolutions = useMemo(() => {
        return complaints.filter(c => (c.status === ComplaintStatus.Open || c.status === ComplaintStatus.Reopened) && !c.solutionText).length;
    }, [complaints]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Complaints for {user?.departmentName}</h1>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleBatchGenerateSolutions}
                        disabled={isBatchGenerating || openTicketsWithoutSolutions === 0}
                        className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 dark:disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                        {isBatchGenerating ? <><Spinner size="sm"/><span className="ml-2">Generating...</span></> : <>✨ Generate Solutions for Open Tickets ({openTicketsWithoutSolutions})</>}
                    </button>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="statusFilter" className="text-sm font-medium">Filter by:</label>
                        <select 
                            id="statusFilter"
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value as ComplaintStatus | 'All')}
                             className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="All">All</option>
                            <option value={ComplaintStatus.Open}>Open</option>
                            <option value={ComplaintStatus.Reopened}>Reopened</option>
                            <option value={ComplaintStatus.Closed}>Closed</option>
                        </select>
                    </div>
                     <div className="flex items-center space-x-2">
                        <label htmlFor="sortOrder" className="text-sm font-medium">Sort by:</label>
                        <select
                            id="sortOrder"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="date-desc">Date (Newest First)</option>
                            <option value="date-asc">Date (Oldest First)</option>
                             <option value="priority">Priority</option>
                            <option value="status">Status</option>
                        </select>
                    </div>
                </div>
            </div>
            
            {processedComplaints.length > 0 ? (
                <div className="space-y-4">
                    {processedComplaints.map(c => <ComplaintCard key={c.id} complaint={c} onUpdate={fetchComplaints}/>)}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p className="text-gray-500 dark:text-gray-400">No complaints found for the selected filter.</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentComplaints;
