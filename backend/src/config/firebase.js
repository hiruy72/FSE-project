const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to initialize with service account
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS !== './demo-credentials.json') {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      // Demo mode - create mock Firebase
      console.log('Running in demo mode - Firebase features will be mocked');
      
      // Create mock objects for demo
      const mockDb = {
        collection: (name) => ({
          doc: (id) => ({
            get: () => Promise.resolve({ exists: false, data: () => null }),
            set: () => Promise.resolve(),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve()
          }),
          add: () => Promise.resolve({ id: 'mock-id' }),
          where: () => ({
            where: () => ({
              get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} }),
              orderBy: () => ({
                get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} }),
                limit: () => ({
                  get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} })
                })
              })
            }),
            get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} }),
            orderBy: () => ({
              get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} }),
              limit: () => ({
                get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} })
              })
            })
          }),
          get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} }),
          orderBy: () => ({
            get: () => Promise.resolve({ empty: true, size: 0, forEach: () => {} })
          })
        })
      };

      const mockAuth = {
        createUser: () => Promise.resolve({ uid: 'mock-uid' }),
        verifyIdToken: () => Promise.resolve({ uid: 'mock-uid', email: 'demo@example.com' })
      };

      module.exports = { 
        admin: { apps: [{}] }, 
        db: mockDb, 
        auth: mockAuth 
      };
      return;
    }
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    console.log('Falling back to demo mode');
    
    // Fallback to mock objects
    const mockDb = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.resolve({ exists: false }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve()
        }),
        add: () => Promise.resolve({ id: 'mock-id' }),
        where: () => ({
          get: () => Promise.resolve({ empty: true, forEach: () => {} })
        })
      })
    };

    const mockAuth = {
      createUser: () => Promise.resolve({ uid: 'mock-uid' }),
      verifyIdToken: () => Promise.resolve({ uid: 'mock-uid' })
    };

    module.exports = { admin: { apps: [{}] }, db: mockDb, auth: mockAuth };
    return;
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };