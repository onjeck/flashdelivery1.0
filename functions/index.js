const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Only allow authenticated callers
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.exists ? callerDoc.data() : null;

  // Require caller to be ADMIN
  if (!callerData || callerData.role !== 'ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
  }

  const uid = data && data.uid;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
  }

  try {
    // Delete auth user
    await admin.auth().deleteUser(uid);
  } catch (err) {
    // If the user is not found in Auth, log and continue to delete Firestore doc
    if (err.code && err.code === 'auth/user-not-found') {
      console.warn('Auth user not found for uid', uid);
    } else {
      throw new functions.https.HttpsError('internal', 'Failed to delete auth user: ' + err.message);
    }
  }

  try {
    await db.collection('users').doc(uid).delete();
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Failed to delete user document: ' + err.message);
  }

  return { success: true };
});
