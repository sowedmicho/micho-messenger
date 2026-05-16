// MICHO MESSENGER - Firebase Configuration
// Replace these values with your Firebase project configuration
// Get them from: Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
    apiKey: "AIzaSyCHiySVRIuUEyemWuxSWnx6oq9lq8c490w",
    authDomain: "micho-messenger.firebaseapp.com",
    projectId: "micho-messenger",
    storageBucket: "micho-messenger.firebasestorage.app",
    messagingSenderId: "640898799768",
    appId: "1:640898799768:web:c4ae562b1852a4d80798ed",
    measurementId: "G-8XNYNYDC7Q"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Firestore Settings
db.settings({
    timestampsInSnapshots: true,
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence limited to one tab.');
        } else if (err.code === 'unimplemented') {
            console.warn('Browser does not support offline persistence.');
        }
    });

// Constants
const APP_NAME = 'MICHO MESSENGER';
const APP_VERSION = '1.0.0';

const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    LOCATION: 'location',
    CONTACT: 'contact',
    VOICE: 'voice',
    CALL: 'call',
    SYSTEM: 'system'
};

const CALL_TYPES = {
    VOICE: 'voice',
    VIDEO: 'video'
};

const CALL_STATUS = {
    INITIATED: 'initiated',
    RINGING: 'ringing',
    ONGOING: 'ongoing',
    ENDED: 'ended',
    MISSED: 'missed',
    REJECTED: 'rejected'
};

// Country codes with flags
const ALL_COUNTRIES = [
    { code: '+256', name: 'Uganda', flag: '🇺🇬' },
    { code: '+254', name: 'Kenya', flag: '🇰🇪' },
    { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
    { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
    { code: '+257', name: 'Burundi', flag: '🇧🇮' },
    { code: '+243', name: 'DR Congo', flag: '🇨🇩' },
    { code: '+211', name: 'South Sudan', flag: '🇸🇸' },
    { code: '+251', name: 'Ethiopia', flag: '🇪🇹' },
    { code: '+252', name: 'Somalia', flag: '🇸🇴' },
    { code: '+253', name: 'Djibouti', flag: '🇩🇯' },
    { code: '+249', name: 'Sudan', flag: '🇸🇩' },
    { code: '+20', name: 'Egypt', flag: '🇪🇬' },
    { code: '+218', name: 'Libya', flag: '🇱🇾' },
    { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
    { code: '+213', name: 'Algeria', flag: '🇩🇿' },
    { code: '+212', name: 'Morocco', flag: '🇲🇦' },
    { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
    { code: '+233', name: 'Ghana', flag: '🇬🇭' },
    { code: '+225', name: "Côte d'Ivoire", flag: '🇨🇮' },
    { code: '+221', name: 'Senegal', flag: '🇸🇳' },
    { code: '+237', name: 'Cameroon', flag: '🇨🇲' },
    { code: '+27', name: 'South Africa', flag: '🇿🇦' },
    { code: '+260', name: 'Zambia', flag: '🇿🇲' },
    { code: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
    { code: '+265', name: 'Malawi', flag: '🇲🇼' },
    { code: '+258', name: 'Mozambique', flag: '🇲🇿' },
    { code: '+244', name: 'Angola', flag: '🇦🇴' },
    { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+86', name: 'China', flag: '🇨🇳' },
    { code: '+81', name: 'Japan', flag: '🇯🇵' },
    { code: '+82', name: 'South Korea', flag: '🇰🇷' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+39', name: 'Italy', flag: '🇮🇹' },
    { code: '+34', name: 'Spain', flag: '🇪🇸' },
    { code: '+7', name: 'Russia', flag: '🇷🇺' },
    { code: '+55', name: 'Brazil', flag: '🇧🇷' },
    { code: '+54', name: 'Argentina', flag: '🇦🇷' },
    { code: '+52', name: 'Mexico', flag: '🇲🇽' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
    { code: '+971', name: 'UAE', flag: '🇦🇪' },
    { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+974', name: 'Qatar', flag: '🇶🇦' },
    { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
    { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
    { code: '+968', name: 'Oman', flag: '🇴🇲' },
    { code: '+90', name: 'Turkey', flag: '🇹🇷' },
    { code: '+98', name: 'Iran', flag: '🇮🇷' },
    { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
    { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
    { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+95', name: 'Myanmar', flag: '🇲🇲' },
    { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
    { code: '+66', name: 'Thailand', flag: '🇹🇭' },
    { code: '+63', name: 'Philippines', flag: '🇵🇭' },
    { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
    { code: '+62', name: 'Indonesia', flag: '🇮🇩' }
];

// Export
window.APP_CONFIG = {
    APP_NAME,
    APP_VERSION,
    MESSAGE_TYPES,
    CALL_TYPES,
    CALL_STATUS,
    ALL_COUNTRIES,
    firebaseConfig,
    auth,
    db,
    storage
};

console.log(`✅ ${APP_NAME} v${APP_VERSION} - Firebase configured`);