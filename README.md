# Fitly Mobile 🏋️‍♂️✨

**Fitly Mobile** is a modern, state-of-the-art mobile fitness tracker and AI-powered workout companion built with **Expo (React Native)**, **TypeScript**, **Tailwind CSS (NativeWind)**, and local storage powered by **Expo SQLite**. It leverages Google's advanced **Gemini AI** to act as a personal fitness assistant, helping users generate exercises, plan sessions, track stats, and stay motivated.

---

## 🚀 Features

- 📊 **Dynamic Dashboard:** Track your overall workouts, statistics, and completion goals.
- 🏋️ **Exercise Library:** Categorized workouts, custom exercises, and instructional steps.
- ⏱️ **Workout Sessions:** Plan, start, and track active sessions, log sets, reps, and weights.
- 🤖 **AI Assistant:** A smart chat interface powered by **Google Gemini** that acts as your personal trainer.
- 💾 **Local & Offline-First:** Fast and secure data storage using `expo-sqlite`.

---

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Expo Go](https://expo.dev/go) app installed on your physical mobile device, or configured iOS Simulator / Android Emulator.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd fitly-mobile
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

---

## 💻 Development Workflow

To start the local Expo bundler and development server, run:

```bash
npm start
```

### Opening the App

- **On iOS Simulator:** Press `i` in the terminal.
- **On Android Emulator:** Press `a` in the terminal.
- **On Web:** Press `w` in the terminal.
- **On Physical Device:** Scan the QR code displayed in the terminal with the **Expo Go** app (Android) or the default Camera app (iOS).

---

## 🌐 Running with Expo Tunnel

If you are working remotely, on a strict corporate/school network, or your mobile device is on a different Wi-Fi/cellular connection than your computer, standard LAN connections might fail. In this case, you can start Expo using a **secure tunnel (ngrok)**:

```bash
npx expo start --tunnel
```

> [!TIP]
> When running with `--tunnel`, Expo generates a public URL that routes traffic directly to your machine. This allows you to test the app on any device, anywhere in the world, without being on the same local network.

---

## ☁️ Cloud Builds with Expo (EAS Build)

We use **EAS (Expo Application Services)** to compile, build, and distribute binaries in the cloud without needing a local macOS machine or complex Android Studio setups.

### 1. Install EAS CLI
Install the official EAS command-line tool globally:
```bash
npm install -g eas-cli
```

### 2. Log in to Expo Account
Log in to your Expo developer account. If you don't have one, register at [expo.dev](https://expo.dev):
```bash
eas login
```

### 3. Initialize EAS Configuration
Configure the project for EAS Build. This command will prompt you to choose platforms and automatically generate an `eas.json` configuration file:
```bash
eas build:configure
```

### 4. Trigger a Cloud Build
You can build for Android, iOS, or both platforms simultaneously using Expo's cloud build servers:

*   **Build for Android:**
    ```bash
    eas build --platform android
    ```
*   **Build for iOS:**
    ```bash
    eas build --platform ios
    ```
*   **Build for both platforms:**
    ```bash
    eas build --platform all
    ```

You will receive a build monitoring URL where you can view build logs in real-time. Once the build completes, EAS will provide a downloadable APK/AAB for Android or a simulator/adhoc build for iOS!

---

## 🗄️ Database Architecture

Data is stored locally on-device using SQLite.
The database files are managed in the `db/` folder:
- **`database.ts`**: Database initialization, schema creation, and migration scripts.
- **`categories.ts`**: Operations for exercise categories.
- **`exercises.ts`**: Managing the exercise library.
- **`sessions.ts`**: Workout tracking, logging sets, reps, and sessions.
- **`settings.ts`**: User preferences and AI configuration.
- **`stats.ts`**: Tracking charts, metrics, and progress.
