import { useState, useEffect } from 'react';
import { HABITS_LIST, getDayLog, toggleHabit } from './habitService';

function App() {
  // Stan (pamięć) naszej aplikacji
  const [logs, setLogs] = useState({});
  const [dates, setDates] = useState([]);

  // 1. Generowanie ostatnich 7 dni w formacie YYYY-MM-DD
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

  // 2. Pobieranie danych z Firebase dla wygenerowanych dni
  useEffect(() => {
    const fetchLogs = async () => {
      if (dates.length === 0) return;
      
      const newLogs = {};
      for (const date of dates) {
        const dayData = await getDayLog(date);
        newLogs[date] = dayData;
      }
      setLogs(newLogs); // Zapisujemy pobrane dane do Reacta
    };
    
    fetchLogs();
  }, [dates]);

  // 3. Funkcja obsługująca kliknięcie w nawyk
  const handleToggle = async (date, habitId) => {
    // Sprawdzamy, czy nawyk był zaznaczony
    const currentValue = logs[date]?.[habitId] || false;
    const newValue = !currentValue;

    // "Optymistyczna aktualizacja interfejsu" - zmieniamy wygląd OD RAZU,
    // nie czekając na odpowiedź serwera, żeby aplikacja wydawała się błyskawiczna!
    setLogs(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [habitId]: newValue
      }
    }));

    // Zapisujemy zmianę w chmurze w tle
    await toggleHabit(date, habitId, newValue);
  };

  // --- ETAP 5: OBLICZANIE STATYSTYK ---
  let totalXP = 0;
  let completedHabitsCount = 0;
  let perfectDays = 0;
  const totalPossibleHabits = dates.length * HABITS_LIST.length;

  // Przechodzimy przez każdy wyświetlany dzień
  dates.forEach(date => {
    let dayCompletedCount = 0;
    
    // Sprawdzamy każdy nawyk w danym dniu
    HABITS_LIST.forEach(habit => {
      if (logs[date]?.[habit.id]) {
        completedHabitsCount++;
        totalXP += habit.xp; // Dodajemy punkty doświadczenia
        dayCompletedCount++;
      }
    });

    // Jeśli w danym dniu zrobiłeś wszystkie nawyki - to perfekcyjny dzień!
    if (dayCompletedCount === HABITS_LIST.length && HABITS_LIST.length > 0) {
      perfectDays++;
    }
  });

  // Obliczamy procentowy wynik zdrowia (Health Score)
  const healthScore = totalPossibleHabits === 0 
    ? 0 
    : Math.round((completedHabitsCount / totalPossibleHabits) * 100);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="max-w-4xl mx-auto mt-8">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          NO PAIN NO GAIN
        </h1>
        
        {/* Kontener z przewijaniem poziomym dla małych ekranów (telefonów) */}
        <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr>
                <th className="p-3 border-b border-gray-600 font-semibold text-gray-300">HABIT</th>
                {dates.map(date => (
                  <th key={date} className="p-3 border-b border-gray-600 text-center text-sm font-medium text-gray-400">
                    {date.slice(5)} {/* Odcinamy rok, pokazujemy tylko MM-DD */}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HABITS_LIST.map(habit => (
                <tr key={habit.id} className="hover:bg-gray-750 transition-colors border-b border-gray-700/50 last:border-0">
                  <td className="p-3 font-medium">
                    {habit.name} 
                    <span className="block text-xs text-blue-400 mt-1">+{habit.xp} XP</span>
                  </td>
                  
                  {dates.map(date => {
                    const isDone = logs[date]?.[habit.id] || false;
                    return (
                      <td key={date} className="p-3 text-center">
                        <button
                          onClick={() => handleToggle(date, habit.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 transform hover:scale-110 active:scale-90 ${
                            isDone 
                              ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]' 
                              : 'bg-gray-700 text-transparent hover:bg-gray-600'
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
        
        {/* Moduł Statystyk */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kafelek 1: Punkty XP */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center transform hover:-translate-y-1 transition-transform">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Gathered XP (7 days)</span>
            <span className="text-4xl font-extrabold text-blue-400">{totalXP}</span>
          </div>

          {/* Kafelek 2: Health Score */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center transform hover:-translate-y-1 transition-transform">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Weekly Score</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-4xl font-extrabold ${healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {healthScore}%
              </span>
            </div>
          </div>

          {/* Kafelek 3: Perfekcyjne Dni */}
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