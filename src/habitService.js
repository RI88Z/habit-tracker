import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const HABITS_LIST = [
  { id: 'wake_up630', name: 'Wake up at 6:30', xp: 10 },
  { id: 'train', name: 'Train', xp: 50 },
  { id: 'book', name: 'Reading a book', xp: 20 },
  { id: 'programming', name: 'Programming', xp: 40 },
  { id: 'sleep_2230', name: 'Go to sleep at 22:30', xp: 10 },
];

// 2. Funkcja do pobierania wyników z konkretnego dnia
// dateStr to będzie tekst, np. "2024-03-04"
export const getDayLog = async (dateStr) => {
  const docRef = doc(db, 'dailyLogs', dateStr); // Wskazujemy na konkretny dokument w bazie
  const docSnap = await getDoc(docRef); // Pobieramy go

  if (docSnap.exists()) {
    return docSnap.data(); // Zwracamy zapisane nawyki (np. { trening: true })
  } else {
    return {}; // Jeśli to nowy dzień i nic nie kliknąłeś, zwracamy pusty obiekt
  }
};

// 3. Funkcja do zaznaczania/odznaczania nawyku
// habitId to np. "trening", isCompleted to true/false
export const toggleHabit = async (dateStr, habitId, isCompleted) => {
  const docRef = doc(db, 'dailyLogs', dateStr);
  
  // Używamy setDoc z opcją { merge: true }. To magiczna opcja!
  // Oznacza: "Jeśli dokument nie istnieje, stwórz go. 
  // Jeśli istnieje, zaktualizuj TYLKO ten jeden nawyk, nie usuwając reszty."
  await setDoc(docRef, {
    [habitId]: isCompleted
  }, { merge: true });
};