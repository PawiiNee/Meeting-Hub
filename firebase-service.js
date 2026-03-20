// firebase-service.js

const FirebaseService = {
  // บันทึกข้อมูลพนักงาน
  saveEmployees: async function(employees) {
    try {
      await window.firebaseDB.database.ref('employees').set(employees);
      console.log('✅ Employees saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving employees:', error);
    }
  },

  // ดึงข้อมูลพนักงาน
  loadEmployees: async function() {
    try {
      const snapshot = await window.firebaseDB.database.ref('employees').once('value');
      const data = snapshot.val();
      console.log('✅ Employees loaded from Firebase');
      return data || [];
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      return [];
    }
  },

  // บันทึกข้อมูลการประชุม
  saveMeetings: async function(meetings) {
    try {
      await window.firebaseDB.database.ref('meetings').set(meetings);
      console.log('✅ Meetings saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving meetings:', error);
    }
  },

  // ดึงข้อมูลการประชุม
  loadMeetings: async function() {
    try {
      const snapshot = await window.firebaseDB.database.ref('meetings').once('value');
      const data = snapshot.val();
      console.log('✅ Meetings loaded from Firebase');
      return data || [];
    } catch (error) {
      console.error('❌ Error loading meetings:', error);
      return [];
    }
  },

  // ฟังการเปลี่ยนแปลงแบบ Real-time
  listenToMeetings: function(callback) {
    window.firebaseDB.database.ref('meetings').on('value', (snapshot) => {
      const data = snapshot.val();
      console.log('🔄 Meetings updated from Firebase');
      callback(data || []);
    });
  },

  listenToEmployees: function(callback) {
    window.firebaseDB.database.ref('employees').on('value', (snapshot) => {
      const data = snapshot.val();
      console.log('🔄 Employees updated from Firebase');
      callback(data || []);
    });
  }
};
