import { useState, useEffect } from 'react';
import { HABITS_LIST, getDayLog, toggleHabit } from './habitService';
import { auth, provider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function App() {
  // Application State
  const [logs, setLogs] = useState({});
  const [dates, setDates] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // 1. Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Generate the last 7 days (YYYY-MM-DD)
  useEffect(() => {
    const generatedDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0]; 
      generatedDates.push(dateString);
    }
    setDates(generatedDates);
  }, []);

  // 3. Fetch data from Firebase for the generated dates
  useEffect(() => {
    const fetchLogs = async () => {
      if (dates.length === 0 || !user) return; 
      
      const newLogs = {};
      for (const date of dates) {
        const dayData = await getDayLog(user.uid, date);
        newLogs[date] = dayData;
      }
      setLogs(newLogs);
    };
    
    fetchLogs();
  }, [dates, user]);

  // 4. Handle habit toggle
  const handleToggle = async (date, habitId) => {
    if (!user) return;
    const currentValue = logs[date]?.[habitId] || false;
    const newValue = !currentValue;

    // Optimistic UI update
    setLogs(prev => ({
      ...prev,
      [date]: { ...prev[date], [habitId]: newValue }
    }));

    // Save changes to the cloud
    await toggleHabit(user.uid, date, habitId, newValue);
  };

  // 5. Auth handlers
  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  // --- APP SCREENS ---

  // Loading Screen
  if (loadingAuth) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white font-sans">Loading...</div>;
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 font-sans">
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          NO PAIN NO GAIN
        </h1>
        <p className="mb-10 text-gray-400 text-center max-w-md">
          Sign in to access your private habit calendar. 
        </p>
        <button 
          onClick={handleLogin}
          className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl shadow-lg hover:bg-gray-200 transition-transform transform hover:scale-105"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  // --- STATS CALCULATION ---
  let totalXP = 0;
  let completedHabitsCount = 0;
  let perfectDays = 0;

  const maxDailyXp = HABITS_LIST.reduce((sum, habit) => sum + habit.xp, 0)
  const maxTotalXP = dates.length * maxDailyXp;

  dates.forEach(date => {
    let dayCompletedCount = 0;
    HABITS_LIST.forEach(habit => {
      if (logs[date]?.[habit.id]) {
        completedHabitsCount++;
        totalXP += habit.xp;
        dayCompletedCount++;
      }
    });
    if (dayCompletedCount === HABITS_LIST.length && HABITS_LIST.length > 0) perfectDays++;
  });

  const healthScore = maxTotalXP === 0 ? 0 : Math.round((totalXP / maxTotalXP) * 100);

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans pb-12">
      <div className="max-w-4xl mx-auto mt-8">
        
        {/* Top bar with Logout */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
            NO PAIN NO GAIN
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">Logged in as {user.displayName}</span>
            <button onClick={handleLogout} className="text-sm px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:bg-red-500 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
        
        {/* Horizontal scroll container for smaller screens */}
        <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr>
                <th className="p-3 border-b border-gray-600 font-semibold text-gray-300">HABIT</th>
                {dates.map(date => (
                  <th key={date} className="p-3 border-b border-gray-600 text-center text-sm font-medium text-gray-400">
                    {date.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HABITS_LIST.map(habit => (
                <tr key={habit.id} className="hover:bg-gray-750 transition-colors border-b border-gray-700/50 last:border-0">
                  <td className="p-3 font-medium">
                    {habit.name} <span className="block text-xs text-blue-400 mt-1">+{habit.xp} XP</span>
                  </td>
                  {dates.map(date => {
                    const isDone = logs[date]?.[habit.id] || false;
                    return (
                      <td key={date} className="p-3 text-center">
                        <button
                          onClick={() => handleToggle(date, habit.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 transform hover:scale-110 active:scale-90 ${
                            isDone ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-gray-700 text-transparent hover:bg-gray-600'
                          }`}
                        >
                          ✓
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats Module */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center transform hover:-translate-y-1 transition-transform">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Gathered XP (7 days)</span>
            <span className="text-4xl font-extrabold text-blue-400">{totalXP}</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center transform hover:-translate-y-1 transition-transform">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Weekly Score</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-4xl font-extrabold ${healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {healthScore}%
              </span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center transform hover:-translate-y-1 transition-transform">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Perfect Days</span>
            <span className="text-4xl font-extrabold text-purple-400">{perfectDays}</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;