import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, writeBatch } from 'firebase/firestore';

// 1. Pobieranie własnych nawyków
export const getCustomHabits = async (userId) => {
  // Pobieramy wszystko bez filtra, by nie zgubić Twoich starych nawyków
  const q = query(collection(db, 'users', userId, 'customHabits'));
  const snapshot = await getDocs(q);
  let habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Sortowanie lokalne (jeśli stary nawyk nie ma pola order, ląduje na końcu)
  habits.sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 999;
    const orderB = b.order !== undefined ? b.order : 999;
    return orderA - orderB;
  });

  if (habits.length === 0) {
    const defaultHabits = [
      { name: 'Wake up between 6:30-7:00', xp: 10, order: 0 },
      { name: 'Workout', xp: 50, order: 1 },
      { name: 'Read a book', xp: 20, order: 2 },
      { name: 'Learn a language', xp: 30, order: 3 },
      { name: 'Go to sleep between 22:30-23:00', xp: 10, order: 4 },
    ];

    for (const habit of defaultHabits) {
      await addDoc(collection(db, 'users', userId, 'customHabits'), {
        ...habit,
        createdAt: new Date().toISOString()
      });
    }
    const newSnapshot = await getDocs(q);
    habits = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    habits.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return habits;
};

// 2. Dodawanie z informacją o kolejności
export const addCustomHabit = async (userId, name, xp, orderPosition) => {
  await addDoc(collection(db, 'users', userId, 'customHabits'), {
    name: name,
    xp: Number(xp),
    order: orderPosition, // Nowy nawyk ląduje na dole
    createdAt: new Date().toISOString()
  });
};

// 3. Usuwanie
export const deleteCustomHabit = async (userId, habitId) => {
  await deleteDoc(doc(db, 'users', userId, 'customHabits', habitId));
};

// 4. EDYCJA NAWYKU (Nowość!)
export const updateCustomHabit = async (userId, habitId, newName, newXp) => {
  const habitRef = doc(db, 'users', userId, 'customHabits', habitId);
  await setDoc(habitRef, { name: newName, xp: Number(newXp) }, { merge: true });
};

// 5. ZAPIS KOLEJNOŚCI (Nowość! Masowy zapis Batch)
export const updateHabitsOrder = async (userId, reorderedHabits) => {
  const batch = writeBatch(db); // Używamy paczki, żeby zrobić to 1 zaptaniem do bazy
  reorderedHabits.forEach((habit, index) => {
    const habitRef = doc(db, 'users', userId, 'customHabits', habit.id);
    batch.update(habitRef, { order: index });
  });
  await batch.commit();
};

// --- LOGI CODZIENNE ---
export const getDayLog = async (userId, dateStr) => {
  const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : {};
};

export const toggleHabit = async (userId, dateStr, habitId, isCompleted) => {
  const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
  await setDoc(docRef, { [habitId]: isCompleted }, { merge: true });
};