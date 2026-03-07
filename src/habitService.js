import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const HABITS_LIST = [
  { id: 'wake_up630', name: 'Wake up between 6:30-7:00', xp: 10 },
  { id: 'programming', name: 'Programming', xp: 40 },
  { id: 'language', name: 'Learning a new language', xp: 30 },
  { id: 'train', name: 'Train', xp: 50 },
  { id: 'book', name: 'Reading a book', xp: 20 },
  { id: 'sleep_2230', name: 'Go to sleep between 22:30-23:00', xp: 10 },
];

export const getDayLog = async (userId, dateStr) => {
  const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return {};
  }
};

export const toggleHabit = async (userId, dateStr, habitId, isCompleted) => {
  const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
  
  await setDoc(docRef, {
    [habitId]: isCompleted
  }, { merge: true });
};