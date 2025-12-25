Deployment steps for deleteUser Cloud Function

1. Install Firebase CLI and login:

```bash
npm install -g firebase-tools
firebase login
```

2. From the `functions` folder, install dependencies:

```bash
cd functions
npm install
```

3. Initialize or connect this project to your Firebase project (if not already):

```bash
firebase init functions
# choose existing project or create new
```

4. Deploy only the `deleteUser` function:

```bash
firebase deploy --only functions:deleteUser
```

5. After deployment, the frontend can call the callable function via `httpsCallable(functions, 'deleteUser')`.

Security note: This function checks the caller's Firestore `users` document and requires `role === 'ADMIN'`.
