import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// 1. Pobieranie własnych nawyków użytkownika z bazy
export const getCustomHabits = async (userId) => {
  const q = query(collection(db, 'users', userId, 'customHabits'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  let habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Jeśli użytkownik jest nowy i nie ma jeszcze nawyków, dajemy mu pakiet startowy
  if (habits.length === 0) {
    const defaultHabits = [
      { name: 'Wake up at 6:30', xp: 10 },
      { name: 'Workout', xp: 50 },
      { name: 'Read a book', xp: 20 },
      { name: 'Programming', xp: 40 }
    ];

    for (const habit of defaultHabits) {
      await addDoc(collection(db, 'users', userId, 'customHabits'), {
        name: habit.name,
        xp: habit.xp,
        createdAt: new Date().toISOString()
      });
    }
    // Pobieramy ponownie z bazy po dodaniu pakietu startowego
    const newSnapshot = await getDocs(q);
    habits = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  return habits;
};

// 2. Dodawanie nowego własnego nawyku
export const addCustomHabit = async (userId, name, xp) => {
  await addDoc(collection(db, 'users', userId, 'customHabits'), {
    name: name,
    xp: Number(xp),
    createdAt: new Date().toISOString()
  });
};

// 3. Usuwanie nawyku
export const deleteCustomHabit = async (userId, habitId) => {
  await deleteDoc(doc(db, 'users', userId, 'customHabits', habitId));
};

// 4. Pobieranie statystyk z danego dnia
export const getDayLog = async (userId, dateStr) => {
  const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : {};
};

// 5. Zaznaczanie nawyku jako zrobionego
export const toggleHabit = async (userId, dateStr, habitId, isCompleted) => {
  const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
  await setDoc(docRef, {
    [habitId]: isCompleted
  }, { merge: true });
};