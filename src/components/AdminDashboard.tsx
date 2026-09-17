import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, UserPlus, Activity, CalendarDays, Clock, Filter, Trash2, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay, subDays, isAfter } from 'date-fns';

interface UserData {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; signups: number }[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: UserData[] = [];
        const signupCounts: Record<string, number> = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUsers.push({
            id: doc.id,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            createdAt: data.createdAt,
          });

          if (data.createdAt) {
            // Convert to JS Date
            const date = data.createdAt.toDate();
            // Group by Day
            const dayKey = format(startOfDay(date), 'MMM dd, yyyy');
            signupCounts[dayKey] = (signupCounts[dayKey] || 0) + 1;
          }
        });

        setUsers(fetchedUsers);

        // Transform for Recharts
        const chart = Object.keys(signupCounts).map(date => ({
          date,
          signups: signupCounts[date]
        }));
        
        setChartData(chart);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-medium">Loading Dashboard Data...</p>
      </div>
    );
  }


  const sevenDaysAgo = subDays(new Date(), 7);
  const oneDayAgo = subDays(new Date(), 1);
  
  const displayedUsers = showOnlyNew 
    ? users.filter(u => u.createdAt && isAfter(u.createdAt.toDate(), sevenDaysAgo))
    : users;

  const newUsers24hCount = users.filter(u => u.createdAt && isAfter(u.createdAt.toDate(), oneDayAgo)).length;
  const newUsersCount = users.filter(u => u.createdAt && isAfter(u.createdAt.toDate(), sevenDaysAgo)).length;
  const previousUsersCount = users.length - newUsersCount;

  const adminCount = users.filter(u => u.role === 'admin').length;
  const regularCount = users.length - adminCount;

  const handleDeleteUser = (userId: string) => {
    alert(`User ${userId} would be deleted. (Requires Firebase Admin SDK setup)`);
  };

  const handlePromoteAdmin = (userId: string) => {
    alert(`User ${userId} would be promoted to Admin. (Requires Firebase Admin SDK setup)`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h2>
          <p className="text-slate-400 text-sm">Overview of platform registration and user activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-full">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Users</p>
            <p className="text-3xl font-black text-white">{users.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full">
            <UserPlus className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">New (Last 24h)</p>
            <p className="text-3xl font-black text-white">{newUsers24hCount}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex items-center gap-4">
          <div className="p-4 bg-slate-800/50 text-slate-400 rounded-full">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Previous (&gt;7d)</p>
            <p className="text-3xl font-black text-white">{previousUsersCount}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex items-center gap-4">
          <div className="p-4 bg-rose-500/10 text-rose-400 rounded-full">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Admins</p>
            <p className="text-3xl font-black text-white">{adminCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white">Sign-ups Over Time</h3>
          <p className="text-slate-400 text-sm">Number of new user registrations per day.</p>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#818cf8', fontWeight: 600 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="signups" 
                  name="Sign-ups"
                  stroke="#818cf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSignups)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 w-full flex items-center justify-center border border-dashed border-slate-700 rounded-xl">
            <p className="text-slate-500 font-medium text-sm">No registration data available yet.</p>
          </div>
        )}
      </div>

      {/* Registered Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md mt-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Registered Users</h3>
            <p className="text-slate-400 text-sm">{showOnlyNew ? "Showing new users (joined in the last 7 days)." : "A complete list of all users on the platform."}</p>
          </div>
          <button
            onClick={() => setShowOnlyNew(!showOnlyNew)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              showOnlyNew 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            {showOnlyNew ? <Filter className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {showOnlyNew ? 'Clear Filter' : 'Show New Users'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-lg">User</th>
                <th className="px-4 py-3 font-semibold">User ID</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Joined Date</th>
                <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {displayedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{user.fullName || "N/A"}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                      user.role === 'admin' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {user.createdAt ? format(user.createdAt.toDate(), 'MMM dd, yyyy h:mm a') : 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handlePromoteAdmin(user.id)}
                        className="p-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors"
                        title="Promote to Admin"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
