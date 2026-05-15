importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These credentials will be injected by the app at runtime if needed, 
// but for the SW to work standalone it usually needs its own initialization.
// We'll use the manifest/link method in the app to register it.

firebase.initializeApp({
  apiKey: "AIzaSyDh0MgUSH1x6voE73Zy6amAVWgbhs-DByY",
  authDomain: "studio-9165894196-8cf76.firebaseapp.com",
  projectId: "studio-9165894196-8cf76",
  storageBucket: "studio-9165894196-8cf76.firebasestorage.app",
  messagingSenderId: "359849944678",
  appId: "1:359849944678:web:84b159be9d3ea88740afa7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
