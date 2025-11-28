import * as SQLite from 'expo-sqlite';

// Usamos v2 para garantir que crie as tabelas novas
const db = SQLite.openDatabaseSync('samu_v2.db');

// Variável simples para guardar o ID de quem logou
let loggedUserId: number | null = null;

export const getLoggedUserId = () => loggedUserId;
export const setLoggedUser = (id: number | null) => { loggedUserId = id; };

export const initDB = () => {
  try {
    // 1. Tabela de Usuários Completa
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        bloodType TEXT,
        age TEXT,
        weight TEXT,
        height TEXT,
        allergies TEXT,
        medications TEXT
      );
    `);

    // 2. Tabela de Contatos de Emergência
    db.execSync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        contactName TEXT,
        contactPhone TEXT,
        FOREIGN KEY(userId) REFERENCES users(id)
      );
    `);
    console.log("Banco de dados V2 inicializado!");
  } catch (error) {
    console.error("Erro ao iniciar DB:", error);
  }
};

// --- FUNÇÕES DE USUÁRIO ---

export const registerUser = (email: string, password: string, name: string) => {
  try {
    const existing = db.getAllSync('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return { success: false, message: 'E-mail já existe!' };

    const result = db.runSync(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, password, name]
    );
    loggedUserId = result.lastInsertRowId; // Já loga automático
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Erro no cadastro.' };
  }
};

export const loginUser = (email: string, password: string) => {
  try {
    const user: any = db.getFirstSync('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (user) {
      loggedUserId = user.id;
      return { success: true };
    }
    return { success: false, message: 'Dados incorretos.' };
  } catch (error) {
    return { success: false, message: 'Erro no login.' };
  }
};

// Essa é a função que estava faltando e gerou o erro!
export const getUserData = () => {
  if (!loggedUserId) return null;
  return db.getFirstSync('SELECT * FROM users WHERE id = ?', [loggedUserId]);
};

export const updateUserData = (data: any) => {
  if (!loggedUserId) return;
  try {
    db.runSync(`
      UPDATE users SET 
        name = ?, email = ?, phone = ?, password = ?, 
        bloodType = ?, age = ?, weight = ?, height = ?, 
        allergies = ?, medications = ?
      WHERE id = ?
    `, [
      data.name, data.email, data.phone, data.password,
      data.bloodType, data.age, data.weight, data.height,
      data.allergies, data.medications,
      loggedUserId
    ]);
    return true;
  } catch (e) {
    return false;
  }
};

// --- FUNÇÕES DE CONTATOS DE EMERGÊNCIA ---

export const addContact = (name: string, phone: string) => {
  if (!loggedUserId) return;
  db.runSync('INSERT INTO contacts (userId, contactName, contactPhone) VALUES (?, ?, ?)', [loggedUserId, name, phone]);
};

export const getContacts = () => {
  if (!loggedUserId) return [];
  return db.getAllSync('SELECT * FROM contacts WHERE userId = ?', [loggedUserId]);
};

export const deleteContact = (contactId: number) => {
  db.runSync('DELETE FROM contacts WHERE id = ?', [contactId]);
};