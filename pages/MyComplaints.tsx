import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Complaint } from '../types';
import { ComplaintStatus, ComplaintPriority } from '../types';
import ComplaintCard from '../components/ComplaintCard';
import { Link } from 'react-router-dom';

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

const MyComplaints: React.FC = () => {
    const { user } = useAuth();
    const { getComplaintsByStudent } = useData();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [sortOrder, setSortOrder] = useState('date-desc');

    const fetchComplaints = () => {
         if (user) {
            const studentComplaints = getComplaintsByStudent(user.id);
            setComplaints(studentComplaints);
        }
    }
    
    useEffect(() => {
       fetchComplaints();
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, getComplaintsByStudent]);

    const sortedComplaints = useMemo(() => {
        const sorted = [...complaints];
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
    }, [complaints, sortOrder]);


    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">My Complaints</h1>
                <div className="flex items-center space-x-4">
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
                    <Link to="/new-complaint" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 whitespace-nowrap">
                        + New Complaint
                    </Link>
                </div>
            </div>
            
            {sortedComplaints.length > 0 ? (
                <div className="space-y-4">
                    {sortedComplaints.map(c => <ComplaintCard key={c.id} complaint={c} onUpdate={fetchComplaints}/>)}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p className="text-gray-500 dark:text-gray-400">You haven't submitted any complaints yet.</p>
                </div>
            )}
        </div>
    );
};

export default MyComplaints;