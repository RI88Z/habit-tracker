// src/missionService.js
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// 1. Pobieranie wszystkich misji użytkownika
export const getMissions = async (userId) => {
  // Pobieramy z kolekcji 'missions', posortowane od najnowszych
  const q = query(collection(db, 'users', userId, 'missions'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 2. Dodawanie nowej misji (tytuł i ile XP za nią dostaniesz)
export const addMission = async (userId, title, xp) => {
  await addDoc(collection(db, 'users', userId, 'missions'), {
    title: title,
    xp: Number(xp),
    isCompleted: false,
    createdAt: new Date().toISOString(), // Zapisujemy datę utworzenia
    completedAt: null // Na starcie nie jest ukończona
  });
};

// 3. Oznaczanie misji jako wykonanej (lub cofnięcie tego)
export const toggleMission = async (userId, missionId, isCompleted) => {
  const missionRef = doc(db, 'users', userId, 'missions', missionId);
  await updateDoc(missionRef, {
    isCompleted: isCompleted,
    // Jeśli ukończono, zapisz obecną datę. Jeśli cofnięto, ustaw na null
    completedAt: isCompleted ? new Date().toISOString() : null
  });
};

// 4. Usuwanie misji (gdy np. się rozmyślisz lub wpiszesz złą)
export const deleteMission = async (userId, missionId) => {
  const missionRef = doc(db, 'users', userId, 'missions', missionId);
  await deleteDoc(missionRef);
};