import { useState, useEffect } from 'react';
import { getCustomHabits, addCustomHabit, deleteCustomHabit, getDayLog, toggleHabit } from './habitService';
import { getMissions, addMission, toggleMission, deleteMission } from './missionService';
import { auth, provider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function App() {
  const [logs, setLogs] = useState({});
  const [dates, setDates] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('habits');

  // --- NOWE STANY: Dynamiczne nawyki ---
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitXp, setNewHabitXp] = useState(20);

  const [missions, setMissions] = useState([]);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionXp, setNewMissionXp] = useState(50);

  // 1. AUTH
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  // 2. GENEROWANIE DAT
  useEffect(() => {
    const generatedDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      generatedDates.push(d.toISOString().split('T')[0]);
    }
    setDates(generatedDates);
  }, []);

  // 3. POBIERANIE NAWYKÓW I DANYCH (Habits)
  const fetchUserHabitsAndLogs = async () => {
    if (!user || dates.length === 0) return;
    
    // Pobierz dynamiczną listę nawyków
    const userHabits = await getCustomHabits(user.uid);
    setHabits(userHabits);

    // Pobierz odznaczone kwadraciki
    const newLogs = {};
    for (const date of dates) {
      newLogs[date] = await getDayLog(user.uid, date);
    }
    setLogs(newLogs);
  };

  useEffect(() => {
    if (activeTab === 'habits') {
      fetchUserHabitsAndLogs();
    }
  }, [dates, user, activeTab]);

  // --- ZARZĄDZANIE NAWYKAMI (Nowe funkcje) ---
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    await addCustomHabit(user.uid, newHabitName, newHabitXp);
    setNewHabitName('');
    setNewHabitXp(20);
    fetchUserHabitsAndLogs(); // Odśwież listę
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm("Delete this habit? It won't erase past stats, but will remove it from the list.")) {
      await deleteCustomHabit(user.uid, habitId);
      fetchUserHabitsAndLogs(); // Odśwież listę
    }
  };

  const handleToggleHabit = async (date, habitId) => {
    if (!user) return;
    const currentValue = logs[date]?.[habitId] || false;
    const newValue = !currentValue;

    setLogs(prev => ({
      ...prev,
      [date]: { ...prev[date], [habitId]: newValue }
    }));
    await toggleHabit(user.uid, date, habitId, newValue);
  };

  // --- MISSIONS LOGIC ---
  const fetchUserMissions = async () => {
    if (!user) return;
    const data = await getMissions(user.uid);
    setMissions(data);
  };

  useEffect(() => {
    if (user && activeTab === 'missions') fetchUserMissions();
  }, [user, activeTab]);

  const handleAddMission = async (e) => {
    e.preventDefault();
    if (!newMissionTitle.trim()) return;
    await addMission(user.uid, newMissionTitle, newMissionXp);
    setNewMissionTitle('');
    setNewMissionXp(50);
    fetchUserMissions();
  };

  const handleToggleMission = async (missionId, currentStatus) => {
    setMissions(missions.map(m => m.id === missionId ? { ...m, isCompleted: !currentStatus } : m));
    await toggleMission(user.uid, missionId, !currentStatus);
    fetchUserMissions();
  };

  const handleDeleteMission = async (missionId) => {
    if (window.confirm("Are you sure you want to delete this mission?")) {
      setMissions(missions.filter(m => m.id !== missionId));
      await deleteMission(user.uid, missionId);
    }
  };

  // --- EKRANY ŁADOWANIA I LOGOWANIA ---
  if (loadingAuth) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">NO PAIN NO GAIN</h1>
        <p className="mb-10 text-gray-400 text-center max-w-md">Sign in to access your private habit calendar and side quests.</p>
        <button onClick={handleLogin} className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl shadow-lg hover:bg-gray-200 transition-transform hover:scale-105">
          Sign in with Google
        </button>
      </div>
    );
  }

  // --- STATS CALCULATION (HABITS) ---
  let totalHabitXP = 0;
  let perfectDays = 0;
  // Używamy teraz dynamicznej zmiennej 'habits' zamiast HABITS_LIST
  const maxDailyXP = habits.reduce((sum, habit) => sum + habit.xp, 0);
  const maxTotalXP = dates.length * maxDailyXP;

  dates.forEach(date => {
    let dayCompletedCount = 0;
    habits.forEach(habit => {
      if (logs[date]?.[habit.id]) {
        totalHabitXP += habit.xp;
        dayCompletedCount++;
      }
    });
    if (dayCompletedCount === habits.length && habits.length > 0) perfectDays++;
  });
  const healthScore = maxTotalXP === 0 ? 0 : Math.round((totalHabitXP / maxTotalXP) * 100);

  // --- STATS CALCULATION (MISSIONS) ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let monthlyMissionsCompleted = 0;
  let monthlyMissionsXP = 0;

  missions.forEach(mission => {
    if (mission.isCompleted && mission.completedAt) {
      const completedDate = new Date(mission.completedAt);
      if (completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear) {
        monthlyMissionsCompleted++;
        monthlyMissionsXP += mission.xp;
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans pb-12">
      <div className="max-w-4xl mx-auto mt-8">
        
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">NO PAIN NO GAIN</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">Logged in as {user.displayName || user.email}</span>
            <button onClick={handleLogout} className="text-sm px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:bg-red-500 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex space-x-2 mb-8 bg-gray-800 p-1 rounded-xl">
          <button onClick={() => setActiveTab('habits')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'habits' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            Daily Habits
          </button>
          <button onClick={() => setActiveTab('missions')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'missions' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-gray-400 hover:text-white'}`}>
            Side Quests
          </button>
        </div>
        
        {/* ==================== HABITS TAB ==================== */}
        {activeTab === 'habits' && (
          <div className="animate-fade-in">
            {/* Tabela Nawyków */}
            <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4 mb-8">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="p-3 border-b border-gray-600 font-semibold text-gray-300 w-1/3">HABIT</th>
                    {dates.map(date => (
                      <th key={date} className="p-3 border-b border-gray-600 text-center text-sm font-medium text-gray-400">
                        {date.slice(5)}
                      </th>
                    ))}
                    <th className="p-3 border-b border-gray-600"></th> {/* Pusta kolumna na kosz */}
                  </tr>
                </thead>
                <tbody>
                  {habits.length === 0 && (
                    <tr><td colSpan={dates.length + 2} className="p-4 text-center text-gray-500">Add your first habit below!</td></tr>
                  )}
                  {habits.map(habit => (
                    <tr key={habit.id} className="hover:bg-gray-750 transition-colors border-b border-gray-700/50 last:border-0 group">
                      <td className="p-3 font-medium">
                        {habit.name} <span className="block text-xs text-blue-400 mt-1">+{habit.xp} XP</span>
                      </td>
                      {dates.map(date => {
                        const isDone = logs[date]?.[habit.id] || false;
                        return (
                          <td key={date} className="p-3 text-center">
                            <button
                              onClick={() => handleToggleHabit(date, habit.id)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 transform hover:scale-110 active:scale-90 ${
                                isDone ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-gray-700 text-transparent hover:bg-gray-600'
                              }`}
                            >✓</button>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        {/* Przycisk usuwania widoczny tylko po najechaniu myszką */}
                        <button onClick={() => handleDeleteHabit(habit.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2" title="Delete Habit">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edytor Nawyków (Formularz) */}
            <form onSubmit={handleAddHabit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 flex flex-col sm:flex-row gap-4 items-center">
              <span className="text-gray-400 font-semibold whitespace-nowrap">Manage Habits:</span>
              <input 
                type="text" placeholder="New daily habit..." value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)}
                className="flex-grow bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500" required
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <input 
                  type="number" min="1" step="5" value={newHabitXp} onChange={(e) => setNewHabitXp(e.target.value)}
                  className="w-20 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500" title="XP Value"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors whitespace-nowrap">
                  Add
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center">
                <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Gathered XP (7 days)</span>
                <span className="text-4xl font-extrabold text-blue-400">{totalHabitXP}</span>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center">
                <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Weekly Score</span>
                <span className={`text-4xl font-extrabold ${healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{healthScore}%</span>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center">
                <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Perfect Days</span>
                <span className="text-4xl font-extrabold text-purple-400">{perfectDays}</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MISSIONS TAB (Bez Zmian) ==================== */}
        {activeTab === 'missions' && (
          <div className="animate-fade-in">
            <form onSubmit={handleAddMission} className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 flex flex-col sm:flex-row gap-4">
              <input 
                type="text" placeholder="New side quest..." value={newMissionTitle} onChange={(e) => setNewMissionTitle(e.target.value)}
                className="flex-grow bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500" required
              />
              <div className="flex gap-4">
                <input 
                  type="number" min="5" step="5" value={newMissionXp} onChange={(e) => setNewMissionXp(e.target.value)}
                  className="w-24 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500" title="XP Value"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap">
                  Add Quest
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-purple-500 flex flex-col justify-center">
                <span className="text-gray-400 text-sm font-semibold uppercase mb-1">Quests Completed (This Month)</span>
                <span className="text-3xl font-bold text-white">{monthlyMissionsCompleted}</span>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-blue-500 flex flex-col justify-center">
                <span className="text-gray-400 text-sm font-semibold uppercase mb-1">Quest XP Gained (This Month)</span>
                <span className="text-3xl font-bold text-blue-400">+{monthlyMissionsXP} XP</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {missions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No active side quests. Add one above!</div>
              ) : (
                <ul>
                  {missions.map((mission) => (
                    <li key={mission.id} className={`flex items-center justify-between p-4 border-b border-gray-700/50 last:border-0 transition-colors hover:bg-gray-750 ${mission.isCompleted ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-4 flex-grow">
                        <button onClick={() => handleToggleMission(mission.id, mission.isCompleted)} className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center transition-all duration-300 ${mission.isCompleted ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-gray-700 text-transparent border border-gray-600 hover:border-purple-400'}`}>✓</button>
                        <span className={`font-medium text-lg ${mission.isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>{mission.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="bg-gray-900 text-blue-400 px-3 py-1 rounded-full text-sm font-bold border border-gray-700">+{mission.xp} XP</span>
                        <button onClick={() => handleDeleteMission(mission.id)} className="text-gray-500 hover:text-red-500 transition-colors p-2" title="Delete Quest">✕</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;